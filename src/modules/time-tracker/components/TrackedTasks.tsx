import { Pause, Play } from "lucide-react";
import { motion } from "motion/react";
import { Card } from "../../../shared/ui/Card";
import { formatTracked } from "../../../shared/utils/duration";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";
import type { TaskSlice } from "../utils/timeStats";

/** Tarefas com tempo no período, da mais trabalhada para a menos, com atalho para retomar. */
export function TrackedTasks({
  title,
  tasks,
  runningTaskId,
  onStart,
  onPause,
}: {
  title: string;
  tasks: TaskSlice[];
  runningTaskId: string | null;
  onStart: (task: { id: string; title: string; project_id: string | null }) => void;
  onPause: () => void;
}) {
  return (
    <Card className="flex flex-col gap-2 px-5 pt-5 pb-3">
      <h3 className="text-[14px] font-semibold text-(--color-ink)">{title}</h3>
      {tasks.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-(--color-ink-muted)">
          Nenhuma tarefa cronometrada neste período.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {tasks.map((task) => {
            const isRunning = task.taskId === runningTaskId;
            return (
              <div
                key={task.key}
                className={cn(
                  "flex items-center gap-3 rounded-[10px] py-2 pr-3 pl-2",
                  isRunning && "bg-(--color-accent)/12",
                )}
              >
                {task.taskDone && !isRunning ? (
                  <span className="size-7 shrink-0" />
                ) : (
                  <motion.button
                    type="button"
                    onClick={() =>
                      isRunning ? onPause() : onStart({ id: task.taskId, title: task.label, project_id: task.projectId })
                    }
                    whileHover={{ scale: 1.08, transition: springs.snappy }}
                    whileTap={{ scale: 0.9, transition: springs.snappy }}
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full",
                      isRunning ? "bg-(--color-accent) text-(--color-accent-ink)" : "bg-(--color-fill) text-(--color-ink)",
                    )}
                    title={isRunning ? "Pausar cronômetro" : "Retomar cronômetro nesta tarefa"}
                  >
                    {isRunning ? (
                      <Pause className="size-2.5 fill-current" strokeWidth={0} />
                    ) : (
                      <Play className="size-2.5 translate-x-px fill-current" strokeWidth={0} />
                    )}
                  </motion.button>
                )}
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[13px]",
                    isRunning ? "font-semibold" : "font-medium",
                    task.taskDone ? "text-(--color-ink-muted) line-through" : "text-(--color-ink)",
                  )}
                >
                  {task.label}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-(--color-ink-muted)">
                  <span className="size-2 rounded-full" style={{ backgroundColor: task.color }} />
                  {task.projectName}
                </span>
                <span
                  className={cn(
                    "w-[58px] shrink-0 text-right text-[13px] font-semibold tabular-nums",
                    isRunning ? "text-(--color-accent-text)" : "text-(--color-ink)",
                  )}
                >
                  {formatTracked(task.seconds)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
