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

export type TaskWithRelations = Task & {
  project_name: string | null;
  project_color: string | null;
  space_id: string | null;
  space_name: string | null;
};

export const tasksRepo = {
  async list(): Promise<Task[]> {
    const db = await getDb();
    return db.select<Task[]>(
      "SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY created_at DESC",
    );
  },

  /** Tarefas com o nome/cor do projeto e o espaço a que pertencem (via projeto) — usado na tela de Tarefas. */
  async listWithRelations(): Promise<TaskWithRelations[]> {
    const db = await getDb();
    return db.select<TaskWithRelations[]>(
      `SELECT t.*,
        p.name AS project_name,
        p.color AS project_color,
        p.space_id AS space_id,
        s.name AS space_name
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id AND p.deleted_at IS NULL
       LEFT JOIN spaces s ON s.id = p.space_id AND s.deleted_at IS NULL
       WHERE t.deleted_at IS NULL
       ORDER BY t.created_at DESC`,
    );
  },

  async create(input: {
    title: string;
    project_id?: string | null;
    due_date?: string | null;
    priority?: string;
  }): Promise<Task> {
    const db = await getDb();
    const task: Task = {
      id: newId(),
      project_id: input.project_id ?? null,
      parent_task_id: null,
      title: input.title,
      notes: null,
      status: "todo",
      priority: input.priority ?? "none",
      start_date: null,
      due_date: input.due_date ?? null,
      estimated_minutes: null,
      completed_at: null,
      recurrence_rule: null,
      sort_order: 0,
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    };
    await db.execute(
      `INSERT INTO tasks (id, project_id, parent_task_id, title, notes, status, priority, due_date, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        task.id,
        task.project_id,
        task.parent_task_id,
        task.title,
        task.notes,
        task.status,
        task.priority,
        task.due_date,
        task.sort_order,
        task.created_at,
        task.updated_at,
      ],
    );
    return task;
  },

  /** Alterna o status da tarefa entre concluída e a fazer (usado pelo checkbox da lista). */
  async toggleDone(id: string, done: boolean): Promise<void> {
    const db = await getDb();
    await db.execute("UPDATE tasks SET status = $1, completed_at = $2, updated_at = $3 WHERE id = $4", [
      done ? "done" : "todo",
      done ? now() : null,
      now(),
      id,
    ]);
  },
};
