import { Check, Flag } from "lucide-react";
import { motion } from "motion/react";
import type { Task } from "../../../db/repositories/tasksRepo";
import { springs } from "../../../shared/motion/springs";
import { parseIsoDate, startOfDay } from "../../../shared/utils/date";
import { cn } from "../../../shared/utils/cn";

const WEEKDAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const PRIORITY_LABEL: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };
const PRIORITY_COLOR: Record<string, string> = {
  low: "var(--color-accent)",
  medium: "var(--color-warning)",
  high: "var(--color-danger)",
};

function formatDueChip(dueIso: string | null, today: Date): { text: string; overdue: boolean } | null {
  if (!dueIso) return null;
  const due = parseIsoDate(dueIso);
  const todayStart = startOfDay(today);
  const diffDays = Math.round((due.getTime() - todayStart.getTime()) / 86_400_000);
  if (diffDays === 0) return { text: "Hoje", overdue: false };
  if (diffDays === -1) return { text: "Ontem", overdue: true };
  if (diffDays < -1) return { text: `${Math.abs(diffDays)}d atrás`, overdue: true };
  if (diffDays > 0 && diffDays < 7) return { text: WEEKDAY_ABBR[due.getDay()], overdue: false };
  return { text: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(due), overdue: false };
}

function formatCompletedDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(iso));
}

/** Linha de tarefa no card "Tarefas" da página de detalhe do projeto. */
export function ProjectTaskRow({
  task,
  today,
  onToggleDone,
}: {
  task: Task;
  today: Date;
  onToggleDone: (id: string, done: boolean) => void;
}) {
  const isDone = task.status === "done";
  const due = formatDueChip(task.due_date, today);
  const priorityLabel = PRIORITY_LABEL[task.priority];

  return (
    <div className="flex items-start gap-3 py-2.5">
      <motion.button
        onClick={() => onToggleDone(task.id, !isDone)}
        whileHover={{ scale: 1.1, transition: springs.snappy }}
        whileTap={{ scale: 0.85, transition: springs.snappy }}
        className={cn(
          "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border",
          isDone ? "border-(--color-accent) bg-(--color-accent) text-(--color-accent-ink)" : "border-(--color-divider) text-transparent",
        )}
        title={isDone ? "Marcar como a fazer" : "Marcar como concluída"}
      >
        <Check className="size-3" strokeWidth={3} />
      </motion.button>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[14px]", isDone ? "text-(--color-ink-muted) line-through" : "text-(--color-ink)")}>
          {task.title}
        </p>
        {!isDone && task.notes && <p className="mt-0.5 truncate text-[12px] text-(--color-ink-muted)">{task.notes}</p>}
      </div>

      {isDone ? (
        <span className="shrink-0 text-[12px] text-(--color-ink-muted)">{formatCompletedDate(task.completed_at)}</span>
      ) : (
        <div className="flex shrink-0 items-center gap-1.5">
          {due && (
            <span
              className={cn(
                "rounded-md px-2 py-1 text-[12px] font-semibold",
                due.overdue ? "bg-(--color-danger)/12 text-(--color-danger)" : "bg-(--color-fill) text-(--color-ink-muted)",
              )}
            >
              {due.text}
            </span>
          )}
          {priorityLabel && (
            <span className="flex items-center gap-1 rounded-md bg-(--color-fill) px-2 py-1 text-[12px] text-(--color-ink-muted)">
              <Flag className="size-2.5 fill-current" strokeWidth={0} style={{ color: PRIORITY_COLOR[task.priority] }} />
              {priorityLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
