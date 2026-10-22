import { useEffect, useRef, useState } from "react";
import { AlertCircle, CalendarDays, CalendarOff, CheckCircle2, ChevronRight, Clock, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { TaskWithRelations } from "../../../db/repositories/tasksRepo";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";
import { groupTasksByDueDate, isRecentlyDone, sortByCompletion, type TaskGroupKey } from "../utils/dateGroups";
import { sortByPriority } from "../utils/priority";
import { TaskRow } from "./TaskRow";

const GROUP_ICONS: Record<TaskGroupKey, typeof AlertCircle> = {
  overdue: AlertCircle,
  today: Sun,
  week: CalendarDays,
  later: Clock,
  noDate: CalendarOff,
};

/** Quanto tempo a tarefa recém-concluída fica riscada no lugar antes de sair do grupo de prazo (dá tempo de desfazer). */
const LINGER_MS = 1500;

/**
 * Lista de tarefas agrupada por prazo (Atrasadas / Hoje / Esta semana / ...) — tela de Tarefas e aba Tarefas do Espaço.
 * Recebe abertas e concluídas: as concluídas saem dos grupos de prazo e, com `completedGroup`, vão para um grupo
 * "Concluídas" recolhido no fim, que mostra só as dos últimos dias.
 */
export function TaskGroupedList({
  tasks,
  today,
  selectedTaskId,
  onSelect,
  onToggleDone,
  onSubtasksChanged,
  completedGroup,
  onShowAllCompleted,
  hideSpace,
}: {
  tasks: TaskWithRelations[];
  today: Date;
  selectedTaskId: string | null;
  onSelect: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
  onSubtasksChanged: () => void;
  /** Mostra o grupo "Concluídas" no fim (filtro "Todas"); sem ele, as concluídas ficam de fora (filtro "Abertas"). */
  completedGroup: boolean;
  /** Abre o histórico completo (filtro "Concluídas") a partir do link de concluídas mais antigas. */
  onShowAllCompleted: () => void;
  /** Esconde o chip de Espaço das linhas (ex: dentro da página de um Espaço, onde ele seria sempre o mesmo). */
  hideSpace?: boolean;
}) {
  const [completedOpen, setCompletedOpen] = useState(false);
  const [lingering, setLingering] = useState<ReadonlySet<string>>(() => new Set());
  const lingerTimers = useRef(new Map<string, number>());

  useEffect(() => {
    const timers = lingerTimers.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  function stopLingering(id: string) {
    clearTimeout(lingerTimers.current.get(id));
    lingerTimers.current.delete(id);
    setLingering((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleDone(id: string, done: boolean) {
    stopLingering(id);
    if (done) {
      setLingering((prev) => new Set(prev).add(id));
      lingerTimers.current.set(id, window.setTimeout(() => stopLingering(id), LINGER_MS));
    }
    onToggleDone(id, done);
  }

  const activeTasks = tasks.filter((t) => t.status !== "done" || lingering.has(t.id));
  const doneTasks = tasks.filter((t) => t.status === "done" && !lingering.has(t.id));
  const recentDone = sortByCompletion(doneTasks.filter((t) => isRecentlyDone(t, today)));
  const olderDoneCount = doneTasks.length - recentDone.length;
  const groups = groupTasksByDueDate(activeTasks, today);

  return (
    <div className="flex flex-col gap-1">
      {groups.length === 0 && (
        <p className="px-1 py-6 text-[13px] text-(--color-ink-muted)">Tudo em dia: nenhuma tarefa em aberto.</p>
      )}

      {groups.map((group) => {
        const Icon = GROUP_ICONS[group.key];
        return (
          <div key={group.key} className="mb-2">
            <div
              className={cn(
                "mb-1 flex items-center gap-1.5 px-1 py-1.5 text-[12px] font-semibold",
                group.key === "overdue" ? "text-(--color-danger)" : "text-(--color-ink-muted)",
              )}
            >
              <Icon className="size-3" strokeWidth={2} />
              {group.label}
              <span className="font-normal text-(--color-ink-muted)/70">{group.tasks.length}</span>
            </div>
            <div className="relative flex flex-col divide-y divide-(--color-track)">
              <AnimatePresence initial={false} mode="popLayout">
                {sortByPriority(group.tasks).map((task) => (
                  <motion.div
                    key={task.id}
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={springs.standard}
                  >
                    <TaskRow
                      task={task}
                      today={today}
                      selected={task.id === selectedTaskId}
                      hideSpace={hideSpace}
                      onSelect={onSelect}
                      onToggleDone={toggleDone}
                      onSubtasksChanged={onSubtasksChanged}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      {completedGroup && doneTasks.length > 0 && (
        <div className="mb-2">
          <button
            onClick={() => setCompletedOpen((v) => !v)}
            className="mb-1 flex items-center gap-1.5 rounded-md px-1 py-1.5 text-[12px] font-semibold text-(--color-ink-muted) hover:text-(--color-ink)"
            aria-expanded={completedOpen}
          >
            <ChevronRight className={cn("size-3 transition-transform", completedOpen && "rotate-90")} strokeWidth={2} />
            <CheckCircle2 className="size-3" strokeWidth={2} />
            Concluídas
            <span className="font-normal text-(--color-ink-muted)/70">{doneTasks.length}</span>
          </button>
          {completedOpen && (
            <div className="flex flex-col divide-y divide-(--color-track)">
              {recentDone.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  selected={task.id === selectedTaskId}
                  hideSpace={hideSpace}
                  showCompletedDate
                  onSelect={onSelect}
                  onToggleDone={toggleDone}
                  onSubtasksChanged={onSubtasksChanged}
                />
              ))}
              {olderDoneCount > 0 && (
                <button
                  onClick={onShowAllCompleted}
                  className="px-3 py-2.5 text-left text-[12px] font-medium text-(--color-accent-text) hover:underline"
                >
                  Ver {olderDoneCount === 1 ? "1 mais antiga" : `${olderDoneCount} mais antigas`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
