import { getDb } from "../client";
import { newId, now } from "../record";

export type Task = {
  id: string;
  project_id: string | null;
  space_id: string | null;
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
  /** Espaço efetivo da tarefa: o próprio (`space_id` da tarefa) ou, na falta dele, o do projeto. */
  space_id: string | null;
  space_name: string | null;
  subtask_total: number;
  subtask_done: number;
};

/** Campos editáveis pelo painel de detalhe da tarefa. */
export type TaskPatch = Partial<
  Pick<Task, "title" | "notes" | "priority" | "due_date" | "project_id" | "space_id">
>;

const PATCHABLE_COLUMNS = ["title", "notes", "priority", "due_date", "project_id", "space_id"] as const;

type TaskRelationsRow = Omit<TaskWithRelations, "space_id"> & {
  own_space_id: string | null;
  effective_space_id: string | null;
};

/**
 * Todas as leituras "planas" (list/listWithRelations) ignoram subtarefas: elas só aparecem
 * dentro do painel de detalhe da tarefa-pai, para não inflar contagens de projeto/Home/Hoje.
 */
export const tasksRepo = {
  async list(): Promise<Task[]> {
    const db = await getDb();
    return db.select<Task[]>(
      "SELECT * FROM tasks WHERE deleted_at IS NULL AND parent_task_id IS NULL ORDER BY created_at DESC",
    );
  },

  /** Tarefas com projeto, Espaço efetivo e progresso de subtarefas — usado na tela de Tarefas e nos Espaços. */
  async listWithRelations(): Promise<TaskWithRelations[]> {
    const db = await getDb();
    const rows = await db.select<TaskRelationsRow[]>(
      `SELECT t.*,
        t.space_id AS own_space_id,
        p.name AS project_name,
        p.color AS project_color,
        COALESCE(t.space_id, p.space_id) AS effective_space_id,
        s.name AS space_name,
        (SELECT COUNT(*) FROM tasks c WHERE c.parent_task_id = t.id AND c.deleted_at IS NULL) AS subtask_total,
        (SELECT COUNT(*) FROM tasks c WHERE c.parent_task_id = t.id AND c.deleted_at IS NULL AND c.status = 'done') AS subtask_done
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id AND p.deleted_at IS NULL
       LEFT JOIN spaces s ON s.id = COALESCE(t.space_id, p.space_id) AND s.deleted_at IS NULL
       WHERE t.deleted_at IS NULL AND t.parent_task_id IS NULL
       ORDER BY t.created_at DESC`,
    );
    return rows.map(({ own_space_id: _own, effective_space_id, ...row }) => ({
      ...row,
      space_id: effective_space_id,
    }));
  },

  async listSubtasks(parentId: string): Promise<Task[]> {
    const db = await getDb();
    return db.select<Task[]>(
      "SELECT * FROM tasks WHERE parent_task_id = $1 AND deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC",
      [parentId],
    );
  },

  async create(input: {
    title: string;
    project_id?: string | null;
    space_id?: string | null;
    parent_task_id?: string | null;
    due_date?: string | null;
    priority?: string;
    sort_order?: number;
  }): Promise<Task> {
    const db = await getDb();
    const task: Task = {
      id: newId(),
      project_id: input.project_id ?? null,
      space_id: input.space_id ?? null,
      parent_task_id: input.parent_task_id ?? null,
      title: input.title,
      notes: null,
      status: "todo",
      priority: input.priority ?? "none",
      start_date: null,
      due_date: input.due_date ?? null,
      estimated_minutes: null,
      completed_at: null,
      recurrence_rule: null,
      sort_order: input.sort_order ?? 0,
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    };
    await db.execute(
      `INSERT INTO tasks (id, project_id, space_id, parent_task_id, title, notes, status, priority, due_date, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        task.id,
        task.project_id,
        task.space_id,
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

  /** Atualiza só os campos informados. */
  async update(id: string, patch: TaskPatch): Promise<void> {
    const columns = PATCHABLE_COLUMNS.filter((column) => column in patch);
    if (columns.length === 0) return;
    const db = await getDb();
    const assignments = columns.map((column, index) => `${column} = $${index + 1}`);
    const values = columns.map((column) => patch[column] ?? null);
    await db.execute(
      `UPDATE tasks SET ${assignments.join(", ")}, updated_at = $${columns.length + 1} WHERE id = $${columns.length + 2}`,
      [...values, now(), id],
    );
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

  /** Remove (soft-delete) a tarefa e suas subtarefas. */
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.execute("UPDATE tasks SET deleted_at = $1, updated_at = $1 WHERE id = $2 OR parent_task_id = $2", [
      now(),
      id,
    ]);
  },
};
