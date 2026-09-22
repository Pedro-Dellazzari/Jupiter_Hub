import type { DragEvent } from "react";
import { Check, Circle, Flag, ListChecks, Square } from "lucide-react";
import { motion } from "motion/react";
import type { TaskWithRelations } from "../../../db/repositories/tasksRepo";
import { formatDueLabel } from "../utils/dateGroups";
import { priorityChipBackground, priorityStyle } from "../utils/priority";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";

/** Card compacto de uma tarefa numa coluna do Board — arrastável entre colunas. */
export function TaskCard({
  task,
  today,
  selected,
  dragging,
  onSelect,
  onToggleDone,
  onDragStart,
  onDragEnd,
}: {
  task: TaskWithRelations;
  today: Date;
  selected: boolean;
  dragging: boolean;
  onSelect: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  const isDone = task.status === "done";
  const due = formatDueLabel(task.due_date, today);
  const priority = priorityStyle(task.priority);
  const showPriority = task.priority !== "none" && !isDone;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(task.id);
        }
      }}
      className={cn(
        "flex cursor-grab flex-col gap-2 rounded-xl bg-(--color-surface-elevated) p-3 text-left shadow-[0px_1px_6px_0px_rgba(0,0,0,0.05)] outline-none active:cursor-grabbing focus-visible:ring-1 focus-visible:ring-(--color-accent)/50",
        selected && "ring-1 ring-(--color-accent)/50",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2.5">
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone(task.id, !isDone);
          }}
          whileHover={{ scale: 1.1, transition: springs.snappy }}
          whileTap={{ scale: 0.85, transition: springs.snappy }}
          style={!isDone ? { borderColor: priority.color } : undefined}
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
            isDone ? "border-(--color-accent) bg-(--color-accent) text-(--color-accent-ink)" : "text-transparent",
          )}
          title={isDone ? "Marcar como a fazer" : "Marcar como concluída"}
        >
          <Check className="size-2.5" strokeWidth={3} />
        </motion.button>
        <span
          className={cn(
            "min-w-0 flex-1 text-[13px]",
            isDone ? "text-(--color-ink-muted) line-through" : "text-(--color-ink)",
          )}
        >
          {task.title}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pl-[26px]">
        {showPriority && (
          <span
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: priorityChipBackground(task.priority), color: priority.ink }}
          >
            <Flag className="size-2 fill-current" strokeWidth={2.5} />
            {priority.label}
          </span>
        )}
        {task.subtask_total > 0 && (
          <span
            className="flex items-center gap-1 rounded-md bg-(--color-fill) px-1.5 py-0.5 text-[11px] font-medium text-(--color-ink-muted)"
            title={`${task.subtask_done} de ${task.subtask_total} subtarefas concluídas`}
          >
            <ListChecks className="size-2.5" strokeWidth={2.5} />
            {task.subtask_done}/{task.subtask_total}
          </span>
        )}
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
              "text-[11px] font-medium",
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
