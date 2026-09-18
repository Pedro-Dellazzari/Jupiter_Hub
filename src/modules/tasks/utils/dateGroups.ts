import type { TaskWithRelations } from "../../../db/repositories/tasksRepo";

const WEEKDAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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
