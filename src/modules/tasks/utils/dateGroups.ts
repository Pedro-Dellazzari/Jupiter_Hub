import type { Task, TaskWithRelations } from "../../../db/repositories/tasksRepo";
import { parseIsoDate, startOfDay } from "../../../shared/utils/date";

const WEEKDAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Janela das concluídas "recentes" (contando hoje): só elas aparecem no grupo Concluídas da lista e na coluna do Board. */
export const RECENT_DONE_DAYS = 7;

/** Momento da conclusão — `updated_at` cobre registros sem `completed_at` (ex: vindos do sync). */
export function completedAt(task: Task): string {
  return task.completed_at ?? task.updated_at;
}

function recentDoneCutoff(today: Date): Date {
  const cutoff = startOfDay(today);
  cutoff.setDate(cutoff.getDate() - (RECENT_DONE_DAYS - 1));
  return cutoff;
}

export function isRecentlyDone(task: Task, today: Date): boolean {
  return new Date(completedAt(task)) >= recentDoneCutoff(today);
}

/** Mais recentemente concluída primeiro. */
export function sortByCompletion<T extends Task>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => completedAt(b).localeCompare(completedAt(a)));
}

function endOfWeek(date: Date): Date {
  const end = startOfDay(date);
  end.setDate(end.getDate() + (6 - end.getDay()));
  return end;
}

export type TaskGroupKey = "overdue" | "today" | "week" | "later" | "noDate";

export type TaskGroup = {
  key: TaskGroupKey;
  label: string;
  tasks: TaskWithRelations[];
};

/** Agrupa tarefas por data de entrega (Atrasadas/Hoje/Esta semana/Mais tarde/Sem data) para a lista da tela de Tarefas. */
export function groupTasksByDueDate(tasks: TaskWithRelations[], today: Date): TaskGroup[] {
  const todayStart = startOfDay(today);
  const weekEnd = endOfWeek(today);

  const buckets: Record<"overdue" | "today" | "week" | "later" | "noDate", TaskWithRelations[]> = {
    overdue: [],
    today: [],
    week: [],
    later: [],
    noDate: [],
  };

  for (const task of tasks) {
    if (!task.due_date) {
      buckets.noDate.push(task);
      continue;
    }
    const due = parseIsoDate(task.due_date);
    if (due < todayStart) {
      buckets.overdue.push(task);
    } else if (due.getTime() === todayStart.getTime()) {
      buckets.today.push(task);
    } else if (due <= weekEnd) {
      buckets.week.push(task);
    } else {
      buckets.later.push(task);
    }
  }

  const groups: TaskGroup[] = [
    { key: "overdue", label: "Atrasadas", tasks: buckets.overdue },
    { key: "today", label: "Hoje", tasks: buckets.today },
    { key: "week", label: "Esta semana", tasks: buckets.week },
    { key: "later", label: "Mais tarde", tasks: buckets.later },
    { key: "noDate", label: "Sem data", tasks: buckets.noDate },
  ];
  return groups.filter((g) => g.tasks.length > 0);
}

export type CompletedGroup = {
  key: string;
  label: string;
  tasks: TaskWithRelations[];
};

function monthLabel(date: Date, today: Date): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Agrupa tarefas concluídas pela data de conclusão (Hoje/Ontem/Últimos 7 dias/um grupo por mês) para o histórico. */
export function groupTasksByCompletion(tasks: TaskWithRelations[], today: Date): CompletedGroup[] {
  const todayStart = startOfDay(today);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const recentStart = recentDoneCutoff(today);

  const groups: CompletedGroup[] = [];
  for (const task of sortByCompletion(tasks)) {
    const at = new Date(completedAt(task));
    const [key, label] =
      at >= todayStart
        ? ["today", "Hoje"]
        : at >= yesterdayStart
          ? ["yesterday", "Ontem"]
          : at >= recentStart
            ? ["recent", `Últimos ${RECENT_DONE_DAYS} dias`]
            : [`${at.getFullYear()}-${at.getMonth()}`, monthLabel(at, today)];
    // A lista já vem ordenada, então cada grupo é um trecho contíguo.
    const last = groups[groups.length - 1];
    if (last?.key === key) last.tasks.push(task);
    else groups.push({ key, label, tasks: [task] });
  }
  return groups;
}

/** Rótulo curto da data de conclusão (Hoje/Ontem/dia da semana/data curta) para as linhas de tarefas concluídas. */
export function formatCompletedLabel(iso: string, today: Date): string {
  const done = startOfDay(new Date(iso));
  const diffDays = Math.round((startOfDay(today).getTime() - done.getTime()) / 86_400_000);

  if (diffDays <= 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < RECENT_DONE_DAYS) return WEEKDAY_ABBR[done.getDay()];
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: done.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  }).format(done);
}

/** Formata a data de entrega para o rótulo da linha da tarefa (Hoje/Ontem/dia da semana/data curta). */
export function formatDueLabel(dueIso: string | null, today: Date): { text: string; overdue: boolean } | null {
  if (!dueIso) return null;
  const due = parseIsoDate(dueIso);
  const todayStart = startOfDay(today);
  const diffDays = Math.round((due.getTime() - todayStart.getTime()) / 86_400_000);

  if (diffDays === 0) return { text: "Hoje", overdue: false };
  if (diffDays === -1) return { text: "Ontem", overdue: true };
  if (diffDays < -1) return { text: `${Math.abs(diffDays)}d atrás`, overdue: true };
  if (diffDays > 0 && diffDays < 7) return { text: WEEKDAY_ABBR[due.getDay()], overdue: false };
  return {
    text: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(due),
    overdue: false,
  };
}
