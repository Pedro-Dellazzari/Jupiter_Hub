import { motion } from "motion/react";
import type { TaskWithRelations } from "../../../db/repositories/tasksRepo";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";

/** Linha mínima de tarefa (checkbox + título) — usada nos painéis de Visão Geral e na aba Tarefas do Espaço. */
export function TaskLine({
  task,
  onToggleDone,
}: {
  task: TaskWithRelations;
  onToggleDone: (id: string, done: boolean) => void;
}) {
  const isDone = task.status === "done";
  return (
    <div className="flex items-center gap-2">
      <motion.button
        onClick={() => onToggleDone(task.id, !isDone)}
        whileHover={{ scale: 1.1, transition: springs.snappy }}
        whileTap={{ scale: 0.85, transition: springs.snappy }}
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
          isDone ? "border-(--color-accent) bg-(--color-accent)" : "border-(--color-divider)",
        )}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[13px] font-medium",
          isDone ? "text-(--color-ink-muted)/70" : "text-(--color-ink)",
        )}
      >
        {task.title}
      </span>
    </div>
  );
}
