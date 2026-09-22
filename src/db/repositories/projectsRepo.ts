import { getDb } from "../client";
import { newId, now } from "../record";

export type Project = {
  id: string;
  space_id: string | null;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  icon: string | null;
  start_date: string | null;
  due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/** Campos editáveis pelo diálogo de edição do projeto. */
export type ProjectPatch = Partial<Pick<Project, "name" | "description" | "status" | "color" | "space_id" | "due_date">>;

const PATCHABLE_COLUMNS = ["name", "description", "status", "color", "space_id", "due_date"] as const;

export const projectsRepo = {
  async list(): Promise<Project[]> {
    const db = await getDb();
    return db.select<Project[]>(
      "SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY sort_order ASC",
    );
  },

  async get(id: string): Promise<Project | null> {
    const db = await getDb();
    const rows = await db.select<Project[]>("SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL", [id]);
    return rows[0] ?? null;
  },

  async create(input: {
    name: string;
    space_id?: string | null;
    status?: string;
    color?: string | null;
    description?: string | null;
    due_date?: string | null;
  }): Promise<Project> {
    const db = await getDb();
    const project: Project = {
      id: newId(),
      space_id: input.space_id ?? null,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? "planning",
      color: input.color ?? null,
      icon: null,
      start_date: null,
      due_date: input.due_date ?? null,
      sort_order: 0,
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    };
    await db.execute(
      `INSERT INTO projects (id, space_id, name, description, status, color, icon, start_date, due_date, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        project.id,
        project.space_id,
        project.name,
        project.description,
        project.status,
        project.color,
        project.icon,
        project.start_date,
        project.due_date,
        project.sort_order,
        project.created_at,
        project.updated_at,
      ],
    );
    return project;
  },

  /** Atualiza só os campos informados. */
  async update(id: string, patch: ProjectPatch): Promise<void> {
    const columns = PATCHABLE_COLUMNS.filter((column) => column in patch);
    if (columns.length === 0) return;
    const db = await getDb();
    const assignments = columns.map((column, index) => `${column} = $${index + 1}`);
    const values = columns.map((column) => patch[column] ?? null);
    await db.execute(
      `UPDATE projects SET ${assignments.join(", ")}, updated_at = $${columns.length + 1} WHERE id = $${columns.length + 2}`,
      [...values, now(), id],
    );
  },

  /** Remove (soft-delete) o projeto. Tarefas ligadas a ele continuam existindo, só deixam de mostrar o projeto. */
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.execute("UPDATE projects SET deleted_at = $1, updated_at = $1 WHERE id = $2", [now(), id]);
  },
};
