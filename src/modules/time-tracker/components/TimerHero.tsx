import { useRef, useState } from "react";
import { Check, Pause, Play, Plus, Search, X } from "lucide-react";
import { motion, useAnimationControls } from "motion/react";
import type { TaskWithRelations } from "../../../db/repositories/tasksRepo";
import type { RunningTimer } from "../../../app/store/useTimerStore";
import { formatClock } from "../../../shared/utils/duration";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";
import { secondsIn, type Session } from "../utils/timeStats";
import { DayTimeline } from "./DayTimeline";

const HERO_BUTTON_CLASS = "flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[13px] font-semibold";

type StartableTask = { id: string; title: string; project_id: string | null };

/** Bloco principal: o cronômetro em andamento ou, parado, o seletor que obriga a escolher uma tarefa. */
export function TimerHero({
  running,
  sessions,
  now,
  todayStart,
  openTasks,
  onStart,
  onPause,
  onComplete,
  onCreateTask,
}: {
  running: RunningTimer | null;
  sessions: Session[];
  now: number;
  todayStart: number;
  openTasks: TaskWithRelations[];
  onStart: (task: StartableTask) => void;
  onPause: () => void;
  /** Encerra o cronômetro e marca a tarefa como concluída. */
  onComplete: () => void;
  onCreateTask: (title: string) => Promise<StartableTask>;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-[20px] bg-[#17171c] px-7 pt-6 pb-5 text-white">
      {running ? (
        <RunningView
          running={running}
          sessions={sessions}
          now={now}
          todayStart={todayStart}
          onPause={onPause}
          onComplete={onComplete}
        />
      ) : (
        <IdleView openTasks={openTasks} onStart={onStart} onCreateTask={onCreateTask} />
      )}
      <DayTimeline sessions={sessions} now={now} todayStart={todayStart} />
    </section>
  );
}

function RunningView({
  running,
  sessions,
  now,
  todayStart,
  onPause,
  onComplete,
}: {
  running: RunningTimer;
  sessions: Session[];
  now: number;
  todayStart: number;
  onPause: () => void;
  onComplete: () => void;
}) {
  const startedAt = new Date(running.startedAt);
  const elapsed = Math.max(0, Math.floor((now - startedAt.getTime()) / 1000));
  const current = sessions.find((s) => s.id === running.entryId);
  const sessionsToday = sessions.filter(
    (s) => s.taskId === running.taskId && secondsIn(s, todayStart, now + 1) > 0,
  ).length;
  const since = startedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-center justify-between gap-8">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#bfbfc7]">
          <motion.span
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="size-2 rounded-full bg-[#4dd980]"
          />
          Em andamento · desde {since}
        </div>
        <h2 className="truncate text-[24px] leading-tight font-semibold tracking-[-0.4px]">{running.taskTitle}</h2>
        <div className="flex items-center gap-2 text-[13px] text-[#bfbfc7]">
          {current && <span className="size-2 rounded-full" style={{ backgroundColor: current.projectColor }} />}
          <span className="truncate">
            {current?.projectName ?? "Sem projeto"}
            {sessionsToday > 1 && ` · ${sessionsToday}ª sessão de hoje nesta tarefa`}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-3">
        <span className="text-[52px] leading-none font-bold tracking-[-1.2px] tabular-nums">
          {formatClock(elapsed)}
        </span>
        <div className="flex items-center gap-2.5">
          <motion.button
            type="button"
            onClick={onPause}
            whileHover={{ scale: 1.03, transition: springs.snappy }}
            whileTap={{ scale: 0.97, transition: springs.snappy }}
            className={cn(HERO_BUTTON_CLASS, "bg-[#38383d] text-white")}
          >
            <Pause className="size-3 fill-current" strokeWidth={0} />
            Pausar
          </motion.button>
          <motion.button
            type="button"
            onClick={onComplete}
            whileHover={{ scale: 1.03, transition: springs.snappy }}
            whileTap={{ scale: 0.97, transition: springs.snappy }}
            className={cn(HERO_BUTTON_CLASS, "bg-(--color-accent) text-(--color-accent-ink)")}
            title="Encerra o cronômetro e marca a tarefa como concluída"
          >
            <Check className="size-3.5" strokeWidth={3} />
            Concluir tarefa
          </motion.button>
        </div>
      </div>
    </div>
  );
}

const MAX_OPTIONS = 6;

function IdleView({
  openTasks,
  onStart,
  onCreateTask,
}: {
  openTasks: TaskWithRelations[];
  onStart: (task: StartableTask) => void;
  onCreateTask: (title: string) => Promise<StartableTask>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [selected, setSelected] = useState<StartableTask | null>(null);
  /** "Shake" do seletor quando se tenta iniciar sem tarefa. */
  const shake = useAnimationControls();

  const term = query.trim().toLowerCase();
  const matches = openTasks.filter((t) => t.title.toLowerCase().includes(term)).slice(0, MAX_OPTIONS);
  const canCreate = term.length > 0 && !openTasks.some((t) => t.title.toLowerCase() === term);
  const optionCount = matches.length + (canCreate ? 1 : 0);

  function choose(task: StartableTask) {
    setSelected(task);
    setQuery("");
    setOpen(false);
    requestAnimationFrame(() => startRef.current?.focus());
  }

  function chooseAt(index: number) {
    if (index < matches.length) choose(matches[index]);
    else if (canCreate) onCreateTask(query.trim()).then(choose);
  }

  function handleStart() {
    if (selected) {
      onStart(selected);
      return;
    }
    shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.35 } });
    setOpen(true);
    inputRef.current?.focus();
  }

  return (
    <div className="flex items-center justify-between gap-8">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#bfbfc7]">
          <span className="size-2 rounded-full bg-[#8e8e93]" />
          Nenhum cronômetro rodando
        </div>
        <h2 className="text-[24px] leading-tight font-semibold tracking-[-0.4px]">No que você vai trabalhar agora?</h2>

        <motion.div
          animate={shake}
          className="relative w-full max-w-[460px]"
        >
          {selected ? (
            <div className="flex h-11 items-center gap-2.5 rounded-xl bg-[#26262c] pr-2 pl-3.5 ring-1 ring-white/10">
              <Check className="size-3.5 shrink-0 text-[#4dd980]" strokeWidth={3} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{selected.title}</span>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="flex size-7 items-center justify-center rounded-lg text-[#8e8e93] hover:bg-white/10 hover:text-white"
                title="Trocar de tarefa"
              >
                <X className="size-3.5" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <div
              className={cn(
                "flex h-11 items-center gap-2.5 rounded-xl bg-[#26262c] px-3.5 ring-1 transition-shadow",
                open ? "ring-[1.5px] ring-(--color-accent)" : "ring-white/10",
              )}
            >
              <Search className="size-3.5 shrink-0 text-[#8e8e93]" strokeWidth={2} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setOpen(true);
                    setHighlight((h) => (optionCount === 0 ? 0 : (h + 1) % optionCount));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlight((h) => (optionCount === 0 ? 0 : (h - 1 + optionCount) % optionCount));
                  } else if (e.key === "Enter" && open && optionCount > 0) {
                    e.preventDefault();
                    chooseAt(highlight);
                  } else if (e.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder="Buscar ou escolher uma tarefa…"
                className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#8e8e93]"
              />
            </div>
          )}

          {open && !selected && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={springs.snappy}
              // Mantém o foco no input para o clique numa opção não fechar a lista antes de registrar.
              onMouseDown={(e) => e.preventDefault()}
              className="absolute top-[calc(100%+6px)] left-0 z-20 w-full rounded-[14px] bg-(--color-surface-elevated) p-2 text-(--color-ink) shadow-[0px_12px_32px_0px_rgba(0,0,0,0.2)]"
            >
              <span className="block px-2.5 pt-1 pb-1.5 text-[11px] font-semibold tracking-[0.4px] text-(--color-ink-muted) uppercase">
                {term ? "Resultados" : "Tarefas abertas"}
              </span>
              {matches.map((task, index) => (
                <button
                  key={task.id}
                  type="button"
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(task)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 text-left",
                    index === highlight && "bg-(--color-fill)",
                  )}
                >
                  <span className="min-w-0 truncate text-[13px] font-medium">{task.title}</span>
                  {task.project_name && (
                    <span className="shrink-0 text-[12px] text-(--color-ink-muted)">{task.project_name}</span>
                  )}
                </button>
              ))}
              {matches.length === 0 && !canCreate && (
                <span className="block px-2.5 py-2.5 text-[13px] text-(--color-ink-muted)">
                  Nenhuma tarefa aberta. Digite um título para criar uma.
                </span>
              )}
              {canCreate && (
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(matches.length)}
                  onClick={() => chooseAt(matches.length)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-[13px] font-semibold text-(--color-accent-text)",
                    highlight === matches.length && "bg-(--color-fill)",
                  )}
                >
                  <Plus className="size-3.5 shrink-0" strokeWidth={2.5} />
                  <span className="min-w-0 truncate">Criar tarefa “{query.trim()}”</span>
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-3">
        <span
          className={cn(
            "text-[52px] leading-none font-bold tracking-[-1.2px] tabular-nums transition-opacity",
            !selected && "opacity-30",
          )}
        >
          00:00:00
        </span>
        <motion.button
          ref={startRef}
          type="button"
          onClick={handleStart}
          whileHover={selected ? { scale: 1.03, transition: springs.snappy } : undefined}
          whileTap={{ scale: 0.97, transition: springs.snappy }}
          aria-disabled={!selected}
          className={cn(
            HERO_BUTTON_CLASS,
            "outline-none focus-visible:ring-2 focus-visible:ring-white/60",
            selected ? "bg-(--color-accent) text-(--color-accent-ink)" : "bg-[#38383d] text-[#8e8e93]",
          )}
        >
          <Play className="size-3 fill-current" strokeWidth={0} />
          Iniciar
        </motion.button>
        <span className="text-[12px] text-[#8e8e93]">
          {selected ? "Tudo pronto — é só iniciar" : "Escolha uma tarefa para liberar o início"}
        </span>
      </div>
    </div>
  );
}
