import { getDb } from "../client";
import { newId, now } from "../record";

export type TimeEntry = {
  id: string;
  task_id: string | null;
  project_id: string | null;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/** Cronômetro em andamento (entrada sem `ended_at`) já com o título da tarefa. */
export type RunningTimeEntry = {
  id: string;
  task_id: string;
  task_title: string;
  started_at: string;
};

export type TimeEntryDetailed = {
  id: string;
  task_id: string | null;
  started_at: string;
  ended_at: string | null;
  task_title: string | null;
  task_status: string | null;
  project_id: string | null;
  project_name: string | null;
  project_color: string | null;
};

export const timeEntriesRepo = {
  async list(): Promise<TimeEntry[]> {
    const db = await getDb();
    return db.select<TimeEntry[]>(
      "SELECT * FROM time_entries WHERE deleted_at IS NULL ORDER BY started_at DESC",
    );
  },

  /** Entrada em andamento ligada a uma tarefa, se houver (a mais recente, caso o sync traga mais de uma). */
  async findRunning(): Promise<RunningTimeEntry | null> {
    const db = await getDb();
    const rows = await db.select<RunningTimeEntry[]>(
      `SELECT e.id, e.task_id, e.started_at, t.title AS task_title
       FROM time_entries e
       JOIN tasks t ON t.id = e.task_id
       WHERE e.deleted_at IS NULL AND e.ended_at IS NULL
       ORDER BY e.started_at DESC
       LIMIT 1`,
    );
    return rows[0] ?? null;
  },

  /**
   * Entradas a partir de `sinceIso` (mais a que estiver rodando), com tarefa e projeto resolvidos —
   * base da página do Time Tracker. O projeto é o da entrada ou, na falta dele, o da tarefa.
   */
  async listDetailed(sinceIso: string): Promise<TimeEntryDetailed[]> {
    const db = await getDb();
    return db.select<TimeEntryDetailed[]>(
      `SELECT e.id, e.task_id, e.started_at, e.ended_at,
        t.title AS task_title,
        t.status AS task_status,
        COALESCE(e.project_id, t.project_id) AS project_id,
        p.name AS project_name,
        p.color AS project_color
       FROM time_entries e
       LEFT JOIN tasks t ON t.id = e.task_id AND t.deleted_at IS NULL
       LEFT JOIN projects p ON p.id = COALESCE(e.project_id, t.project_id) AND p.deleted_at IS NULL
       WHERE e.deleted_at IS NULL AND (e.ended_at IS NULL OR e.ended_at >= $1)
       ORDER BY e.started_at ASC`,
      [sinceIso],
    );
  },

  /** Segundos já registrados (sessões encerradas) por tarefa. */
  async totalsByTask(): Promise<Record<string, number>> {
    const db = await getDb();
    const rows = await db.select<{ task_id: string; seconds: number }[]>(
      `SELECT task_id, SUM(duration_seconds) AS seconds
       FROM time_entries
       WHERE deleted_at IS NULL AND task_id IS NOT NULL AND duration_seconds IS NOT NULL
       GROUP BY task_id`,
    );
    return Object.fromEntries(rows.map((row) => [row.task_id, row.seconds]));
  },

  async start(input?: {
    description?: string;
    project_id?: string | null;
    task_id?: string | null;
  }): Promise<TimeEntry> {
    const db = await getDb();
    const entry: TimeEntry = {
      id: newId(),
      task_id: input?.task_id ?? null,
      project_id: input?.project_id ?? null,
      description: input?.description ?? null,
      started_at: now(),
      ended_at: null,
      duration_seconds: null,
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    };
    await db.execute(
      `INSERT INTO time_entries (id, task_id, project_id, description, started_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.id,
        entry.task_id,
        entry.project_id,
        entry.description,
        entry.started_at,
        entry.created_at,
        entry.updated_at,
      ],
    );
    return entry;
  },

  /** Encerra a entrada e devolve a duração registrada, em segundos. */
  async stop(id: string, startedAt: string): Promise<number> {
    const db = await getDb();
    const endedAt = now();
    const durationSeconds = Math.max(
      0,
      Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000),
    );
    await db.execute(
      "UPDATE time_entries SET ended_at = $1, duration_seconds = $2, updated_at = $1 WHERE id = $3",
      [endedAt, durationSeconds, id],
    );
    return durationSeconds;
  },
};
