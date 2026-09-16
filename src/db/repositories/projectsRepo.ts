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

export const projectsRepo = {
  async list(): Promise<Project[]> {
    const db = await getDb();
    return db.select<Project[]>(
      "SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY sort_order ASC",
    );
  },

  async create(input: { name: string; space_id?: string | null }): Promise<Project> {
    const db = await getDb();
    const project: Project = {
      id: newId(),
      space_id: input.space_id ?? null,
      name: input.name,
      description: null,
      status: "planning",
      color: null,
      icon: null,
      start_date: null,
      due_date: null,
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
};
