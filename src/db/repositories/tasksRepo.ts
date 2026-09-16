import { getDb } from "../client";
import { newId, now } from "../record";

export type Task = {
  id: string;
  project_id: string | null;
  parent_task_id: string | null;
  title: string;
  notes: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  due_date: string | null;
  estimated_minutes: number | null;
  completed_at: string | null;
  recurrence_rule: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export const tasksRepo = {
  async list(): Promise<Task[]> {
    const db = await getDb();
    return db.select<Task[]>(
      "SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY created_at DESC",
    );
  },

  async create(input: { title: string; project_id?: string | null }): Promise<Task> {
    const db = await getDb();
    const task: Task = {
      id: newId(),
      project_id: input.project_id ?? null,
      parent_task_id: null,
      title: input.title,
      notes: null,
      status: "todo",
      priority: "none",
      start_date: null,
      due_date: null,
      estimated_minutes: null,
      completed_at: null,
      recurrence_rule: null,
      sort_order: 0,
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    };
    await db.execute(
      `INSERT INTO tasks (id, project_id, parent_task_id, title, notes, status, priority, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        task.id,
        task.project_id,
        task.parent_task_id,
        task.title,
        task.notes,
        task.status,
        task.priority,
        task.sort_order,
        task.created_at,
        task.updated_at,
      ],
    );
    return task;
  },
};
