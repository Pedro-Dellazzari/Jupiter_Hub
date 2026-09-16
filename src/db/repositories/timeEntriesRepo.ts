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

export const timeEntriesRepo = {
  async list(): Promise<TimeEntry[]> {
    const db = await getDb();
    return db.select<TimeEntry[]>(
      "SELECT * FROM time_entries WHERE deleted_at IS NULL ORDER BY started_at DESC",
    );
  },

  async start(input?: { description?: string; project_id?: string | null }): Promise<TimeEntry> {
    const db = await getDb();
    const entry: TimeEntry = {
      id: newId(),
      task_id: null,
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

  async stop(id: string, startedAt: string): Promise<void> {
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
  },
};
