import { useCallback, useEffect, useMemo, useState } from "react";
import { timeEntriesRepo } from "../../db/repositories/timeEntriesRepo";
import { tasksRepo } from "../../db/repositories/tasksRepo";
import { useTimerStore } from "../../app/store/useTimerStore";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { ModuleHeader } from "../../shared/ui/ModuleHeader";
import { startOfDay } from "../../shared/utils/date";
import { formatTracked } from "../../shared/utils/duration";
import { cn } from "../../shared/utils/cn";
import { KpiCards } from "./components/KpiCards";
import { ProjectBreakdown } from "./components/ProjectBreakdown";
import { TimerHero } from "./components/TimerHero";
import { TrackedTasks } from "./components/TrackedTasks";
import { WeekChart } from "./components/WeekChart";
import { DAY_MS, byProject, byTask, lastDays, toSessions } from "./utils/timeStats";

type Period = "today" | "week" | "month";

const PERIODS: { value: Period; label: string; days: number; caption: string; suffix: string }[] = [
  { value: "today", label: "Hoje", days: 1, caption: "hoje", suffix: "de hoje" },
  { value: "week", label: "Semana", days: 7, caption: "em 7 dias", suffix: "· últimos 7 dias" },
  { value: "month", label: "Mês", days: 30, caption: "em 30 dias", suffix: "· últimos 30 dias" },
];

/** Janela de leitura: cobre o período "Mês" e a comparação com os 7 dias anteriores. */
const HISTORY_DAYS = 30;

export default function TimeTracker() {
  const running = useTimerStore((s) => s.running);
  const start = useTimerStore((s) => s.start);
  const stop = useTimerStore((s) => s.stop);
  const [period, setPeriod] = useState<Period>("today");
  const [now, setNow] = useState(() => Date.now());

  const todayStart = startOfDay(new Date(now)).getTime();
  const fetchEntries = useCallback(
    () => timeEntriesRepo.listDetailed(new Date(todayStart - (HISTORY_DAYS - 1) * DAY_MS).toISOString()),
    [todayStart],
  );
  const entriesState = useRepoList(fetchEntries);
  const tasksState = useRepoList(tasksRepo.listWithRelations);
  const reloadEntries = entriesState.reload;

  // O relógio da página anda de segundo em segundo só enquanto há cronômetro rodando.
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), running ? 1000 : 60_000);
    return () => clearInterval(id);
  }, [running]);

  // Iniciar/pausar (aqui, na lista de Tarefas ou no mini timer) muda as entradas: recarrega.
  useEffect(reloadEntries, [reloadEntries, running?.entryId]);

  const entries = entriesState.state.status === "ready" ? entriesState.state.items : null;
  const sessions = useMemo(() => toSessions(entries ?? [], now), [entries, now]);
  const openTasks = useMemo(
    () => (tasksState.state.status === "ready" ? tasksState.state.items.filter((t) => t.status !== "done") : []),
    [tasksState.state],
  );

  if (entriesState.state.status === "error") {
    return (
      <div className="h-full overflow-y-auto px-10 py-8 compact:px-4 compact:pt-3 compact:pb-24">
        <ModuleHeader title="Time Tracker" />
        <ModuleErrorState />
      </div>
    );
  }

  const active = PERIODS.find((p) => p.value === period) ?? PERIODS[0];
  const tomorrow = todayStart + DAY_MS;
  const periodStart = todayStart - (active.days - 1) * DAY_MS;
  const week = lastDays(sessions, todayStart, 7);
  const todayTotal = week[week.length - 1].total;
  const dateLabel = new Date(now).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="h-full overflow-y-auto px-10 py-8 compact:px-4 compact:pt-3 compact:pb-24">
      <ModuleHeader
        title="Time Tracker"
        subtitle={`${dateLabel.charAt(0).toUpperCase()}${dateLabel.slice(1)} · ${
          todayTotal > 0 ? `${formatTracked(todayTotal)} registradas hoje` : "nada registrado hoje"
        }`}
        action={
          <div className="flex items-center gap-0.5 rounded-lg bg-(--color-fill) p-0.5 compact:w-full">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-[12px] font-semibold compact:flex-1 compact:py-2 compact:text-[13px]",
                  period === p.value
                    ? "bg-(--color-surface-elevated) text-(--color-ink) shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]"
                    : "text-(--color-ink-muted) hover:text-(--color-ink)",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {entries && (
        <div className="flex flex-col gap-5">
          <TimerHero
            running={running}
            sessions={sessions}
            now={now}
            todayStart={todayStart}
            openTasks={openTasks}
            onStart={start}
            onPause={stop}
            onComplete={async () => {
              if (!running) return;
              const taskId = running.taskId;
              await stop();
              await tasksRepo.toggleDone(taskId, true);
              tasksState.reload();
            }}
            onCreateTask={async (title) => {
              const task = await tasksRepo.create({ title });
              tasksState.reload();
              return task;
            }}
          />

          <KpiCards sessions={sessions} week={week} todayStart={todayStart} />

          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-5 compact:grid-cols-1">
            <div className="flex min-w-0 flex-col gap-5">
              <WeekChart days={week} />
              <TrackedTasks
                title={`Tarefas ${active.suffix}`}
                tasks={byTask(sessions, periodStart, tomorrow)}
                runningTaskId={running?.taskId ?? null}
                onStart={start}
                onPause={stop}
              />
            </div>
            <ProjectBreakdown
              title={`Por projeto ${active.suffix}`}
              caption={active.caption}
              slices={byProject(sessions, periodStart, tomorrow)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
