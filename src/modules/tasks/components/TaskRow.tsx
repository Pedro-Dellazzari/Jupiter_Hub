import { Check, Circle, Square } from "lucide-react";
import { motion } from "motion/react";
import type { TaskWithRelations } from "../../../db/repositories/tasksRepo";
import { formatDueLabel } from "../utils/dateGroups";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";

export function TaskRow({
  task,
  today,
  onToggleDone,
}: {
  task: TaskWithRelations;
  today: Date;
  onToggleDone: (id: string, done: boolean) => void;
}) {
  const isDone = task.status === "done";
  const due = formatDueLabel(task.due_date, today);

  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-(--color-fill)">
      <motion.button
        onClick={() => onToggleDone(task.id, !isDone)}
        whileHover={{ scale: 1.1, transition: springs.snappy }}
        whileTap={{ scale: 0.85, transition: springs.snappy }}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border",
          isDone
            ? "border-(--color-accent) bg-(--color-accent) text-white"
            : "border-(--color-divider) text-transparent",
        )}
        title={isDone ? "Marcar como a fazer" : "Marcar como concluída"}
      >
        <Check className="size-2.5" strokeWidth={3} />
      </motion.button>

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[13px]",
          isDone ? "text-(--color-ink-muted) line-through" : "text-(--color-ink)",
        )}
      >
        {task.title}
      </span>

      <div className="flex shrink-0 items-center gap-1.5">
        {task.space_name && (
          <span className="flex items-center gap-1 rounded-md bg-(--color-fill) px-1.5 py-0.5 text-[11px] text-(--color-ink-muted)">
            <Circle className="size-2" strokeWidth={2.5} />
            {task.space_name}
          </span>
        )}
        {task.project_name && (
          <span
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: `color-mix(in srgb, ${task.project_color ?? "#007AFF"} 12%, transparent)`,
              color: task.project_color ?? "#007AFF",
            }}
          >
            <Square className="size-2 fill-current" strokeWidth={0} />
            {task.project_name}
          </span>
        )}
        {due && (
          <span
            className={cn(
              "min-w-[30px] text-right text-[11px] font-medium",
              due.overdue && !isDone ? "text-(--color-danger)" : "text-(--color-ink-muted)",
            )}
          >
            {due.text}
          </span>
        )}
      </div>
    </div>
  );
}
