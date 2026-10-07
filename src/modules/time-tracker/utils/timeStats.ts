import type { TimeEntryDetailed } from "../../../db/repositories/timeEntriesRepo";

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Cor das sessões sem projeto — neutra, para não parecer mais um projeto. */
export const NO_PROJECT_COLOR = "#8e8e93";
const NO_PROJECT_KEY = "__none__";

/** Uma sessão de cronômetro já em milissegundos; a que está rodando termina em `now`. */
export type Session = {
  id: string;
  taskId: string | null;
  taskTitle: string;
  taskDone: boolean;
  projectId: string | null;
  projectKey: string;
  projectName: string;
  projectColor: string;
  start: number;
  end: number;
  running: boolean;
};

export type Slice = {
  key: string;
  label: string;
  color: string;
  seconds: number;
};

export type TaskSlice = Slice & {
  taskId: string;
  taskDone: boolean;
  projectId: string | null;
  projectName: string;
};

export function toSessions(entries: TimeEntryDetailed[], now: number): Session[] {
  return entries.map((entry) => ({
    id: entry.id,
    taskId: entry.task_id,
    taskTitle: entry.task_title ?? "Tarefa removida",
    taskDone: entry.task_status === "done",
    projectId: entry.project_id,
    projectKey: entry.project_name ? (entry.project_id ?? NO_PROJECT_KEY) : NO_PROJECT_KEY,
    projectName: entry.project_name ?? "Sem projeto",
    projectColor: entry.project_name ? (entry.project_color ?? "#007AFF") : NO_PROJECT_COLOR,
    start: new Date(entry.started_at).getTime(),
    end: entry.ended_at ? new Date(entry.ended_at).getTime() : now,
    running: entry.ended_at === null,
  }));
}

/** Segundos da sessão que caem dentro de [from, to) — uma sessão que cruza a meia-noite conta nos dois dias. */
export function secondsIn(session: Session, from: number, to: number): number {
  return Math.max(0, Math.min(session.end, to) - Math.max(session.start, from)) / 1000;
}

export function totalIn(sessions: Session[], from: number, to: number): number {
  return Math.round(sessions.reduce((sum, s) => sum + secondsIn(s, from, to), 0));
}

/** Tempo por projeto no intervalo, do maior para o menor. */
export function byProject(sessions: Session[], from: number, to: number): Slice[] {
  const map = new Map<string, Slice>();
  for (const s of sessions) {
    const seconds = secondsIn(s, from, to);
    if (seconds <= 0) continue;
    const slice = map.get(s.projectKey) ?? { key: s.projectKey, label: s.projectName, color: s.projectColor, seconds: 0 };
    slice.seconds += seconds;
    map.set(s.projectKey, slice);
  }
  return sortSlices([...map.values()]);
}

/** Tempo por tarefa no intervalo, do maior para o menor (sessões sem tarefa ficam de fora). */
export function byTask(sessions: Session[], from: number, to: number): TaskSlice[] {
  const map = new Map<string, TaskSlice>();
  for (const s of sessions) {
    const seconds = secondsIn(s, from, to);
    if (seconds <= 0 || !s.taskId) continue;
    const slice = map.get(s.taskId) ?? {
      key: s.taskId,
      taskId: s.taskId,
      taskDone: s.taskDone,
      label: s.taskTitle,
      color: s.projectColor,
      projectId: s.projectId,
      projectName: s.projectName,
      seconds: 0,
    };
    slice.seconds += seconds;
    map.set(s.taskId, slice);
  }
  return sortSlices([...map.values()]);
}

function sortSlices<T extends Slice>(slices: T[]): T[] {
  return slices.map((s) => ({ ...s, seconds: Math.round(s.seconds) })).sort((a, b) => b.seconds - a.seconds);
}

export type DayBucket = {
  start: number;
  label: string;
  isToday: boolean;
  total: number;
  slices: Slice[];
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Os últimos `days` dias (terminando hoje), cada um com o tempo por projeto. */
export function lastDays(sessions: Session[], todayStart: number, days: number): DayBucket[] {
  return Array.from({ length: days }, (_, i) => {
    const start = todayStart - (days - 1 - i) * DAY_MS;
    const slices = byProject(sessions, start, start + DAY_MS);
    return {
      start,
      label: i === days - 1 ? "Hoje" : WEEKDAYS[new Date(start).getDay()],
      isToday: i === days - 1,
      total: slices.reduce((sum, s) => sum + s.seconds, 0),
      slices,
    };
  });
}

/** Sessão contínua mais longa que toca o intervalo. */
export function longestSession(sessions: Session[], from: number, to: number): Session | null {
  let best: Session | null = null;
  for (const s of sessions) {
    if (secondsIn(s, from, to) <= 0) continue;
    if (!best || s.end - s.start > best.end - best.start) best = s;
  }
  return best;
}
