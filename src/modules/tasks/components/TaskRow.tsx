import { useEffect, useState } from "react";
import { Check, ChevronRight, Circle, Flag, ListChecks, Square } from "lucide-react";
import { motion } from "motion/react";
import { tasksRepo, type Task, type TaskWithRelations } from "../../../db/repositories/tasksRepo";
import { formatDueLabel } from "../utils/dateGroups";
import { priorityChipBackground, priorityStyle } from "../utils/priority";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";

export function TaskRow({
  task,
  today,
  selected,
  onSelect,
  onToggleDone,
  onSubtasksChanged,
}: {
  task: TaskWithRelations;
  today: Date;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
  /** Avisa a tela de Tarefas para recarregar a lista (contagem do chip) após mudar uma subtarefa aqui. */
  onSubtasksChanged: () => void;
}) {
  const isDone = task.status === "done";
  const due = formatDueLabel(task.due_date, today);
  const priority = priorityStyle(task.priority);
  const showPriority = task.priority !== "none" && !isDone;
  const hasSubtasks = task.subtask_total > 0;

  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[] | null>(null);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    tasksRepo.listSubtasks(task.id).then((rows) => {
      if (!cancelled) setSubtasks(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [expanded, task.id, task.subtask_done, task.subtask_total]);

  function toggleSubtask(id: string, done: boolean) {
    tasksRepo.toggleDone(id, done).then(() => {
      setSubtasks((prev) => prev && prev.map((s) => (s.id === id ? { ...s, status: done ? "done" : "todo" } : s)));
      onSubtasksChanged();
    });
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(task.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(task.id);
          }
        }}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 outline-none focus-visible:ring-1 focus-visible:ring-(--color-accent)/50",
          selected ? "bg-(--color-accent)/8" : "hover:bg-(--color-fill)",
        )}
      >
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone(task.id, !isDone);
        }}
        whileHover={{ scale: 1.1, transition: springs.snappy }}
        whileTap={{ scale: 0.85, transition: springs.snappy }}
        style={!isDone ? { borderColor: priority.color } : undefined}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border",
          isDone ? "border-(--color-accent) bg-(--color-accent) text-(--color-accent-ink)" : "text-transparent",
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
        {showPriority && (
          <span
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: priorityChipBackground(task.priority), color: priority.ink }}
          >
            <Flag className="size-2 fill-current" strokeWidth={2.5} />
            {priority.label}
          </span>
        )}
        {hasSubtasks && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="flex items-center gap-1 rounded-md bg-(--color-fill) px-1.5 py-0.5 text-[11px] font-medium text-(--color-ink-muted) hover:text-(--color-ink)"
            title={expanded ? "Ocultar subtarefas" : "Mostrar subtarefas"}
          >
            <ChevronRight
              className={cn("size-2.5 transition-transform", expanded && "rotate-90")}
              strokeWidth={2.5}
            />
            <ListChecks className="size-2.5" strokeWidth={2.5} />
            {task.subtask_done}/{task.subtask_total}
          </button>
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
              "min-w-[30px] text-right text-[11px] font-medium",
              due.overdue && !isDone ? "text-(--color-danger)" : "text-(--color-ink-muted)",
            )}
          >
            {due.text}
          </span>
        )}
        </div>
      </div>

      {expanded && hasSubtasks && (
        <div className="flex flex-col gap-0.5 py-1 pl-11">
          {subtasks === null ? (
            <span className="px-2 py-1 text-[12px] text-(--color-ink-muted)">Carregando…</span>
          ) : (
            subtasks.map((subtask) => {
              const subDone = subtask.status === "done";
              return (
                <div
                  key={subtask.id}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1 hover:bg-(--color-fill)"
                >
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSubtask(subtask.id, !subDone);
                    }}
                    whileHover={{ scale: 1.1, transition: springs.snappy }}
                    whileTap={{ scale: 0.85, transition: springs.snappy }}
                    className={cn(
                      "flex size-3.5 shrink-0 items-center justify-center rounded-full border",
                      subDone
                        ? "border-(--color-accent) bg-(--color-accent) text-(--color-accent-ink)"
                        : "border-(--color-divider) text-transparent",
                    )}
                    title={subDone ? "Marcar como a fazer" : "Marcar como concluída"}
                  >
                    <Check className="size-2" strokeWidth={3} />
                  </motion.button>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[12.5px]",
                      subDone ? "text-(--color-ink-muted) line-through" : "text-(--color-ink)",
                    )}
                  >
                    {subtask.title}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
