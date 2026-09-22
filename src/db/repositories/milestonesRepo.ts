import { getDb } from "../client";
import { newId, now } from "../record";

export type Milestone = {
  id: string;
  project_id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export const milestonesRepo = {
  /** Marcos de um projeto, cronológicos (sem data por último). */
  async listByProject(projectId: string): Promise<Milestone[]> {
    const db = await getDb();
    return db.select<Milestone[]>(
      `SELECT * FROM milestones WHERE project_id = $1 AND deleted_at IS NULL
       ORDER BY due_date IS NULL, due_date ASC, sort_order ASC`,
      [projectId],
    );
  },

  async create(input: { project_id: string; title: string; due_date?: string | null; sort_order?: number }): Promise<Milestone> {
    const db = await getDb();
    const milestone: Milestone = {
      id: newId(),
      project_id: input.project_id,
      title: input.title,
      due_date: input.due_date ?? null,
      completed_at: null,
      sort_order: input.sort_order ?? 0,
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    };
    await db.execute(
      `INSERT INTO milestones (id, project_id, title, due_date, completed_at, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        milestone.id,
        milestone.project_id,
        milestone.title,
        milestone.due_date,
        milestone.completed_at,
        milestone.sort_order,
        milestone.created_at,
        milestone.updated_at,
      ],
    );
    return milestone;
  },

  /** Atualiza só os campos informados (título e/ou data-alvo). */
  async update(id: string, patch: Partial<Pick<Milestone, "title" | "due_date">>): Promise<void> {
    const columns = (["title", "due_date"] as const).filter((column) => column in patch);
    if (columns.length === 0) return;
    const db = await getDb();
    const assignments = columns.map((column, index) => `${column} = $${index + 1}`);
    const values = columns.map((column) => patch[column] ?? null);
    await db.execute(
      `UPDATE milestones SET ${assignments.join(", ")}, updated_at = $${columns.length + 1} WHERE id = $${columns.length + 2}`,
      [...values, now(), id],
    );
  },

  async toggleDone(id: string, done: boolean): Promise<void> {
    const db = await getDb();
    await db.execute("UPDATE milestones SET completed_at = $1, updated_at = $2 WHERE id = $3", [
      done ? now() : null,
      now(),
      id,
    ]);
  },

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.execute("UPDATE milestones SET deleted_at = $1, updated_at = $1 WHERE id = $2", [now(), id]);
  },
};
