import { getDb } from "../client";
import { newId, now } from "../record";

export type Notebook = {
  id: string;
  space_id: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export const notebooksRepo = {
  async list(): Promise<Notebook[]> {
    const db = await getDb();
    return db.select<Notebook[]>(
      "SELECT * FROM notebooks WHERE deleted_at IS NULL ORDER BY sort_order ASC",
    );
  },

  async create(input: { name: string; space_id?: string | null }): Promise<Notebook> {
    const db = await getDb();
    const notebook: Notebook = {
      id: newId(),
      space_id: input.space_id ?? null,
      name: input.name,
      color: null,
      icon: null,
      sort_order: 0,
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    };
    await db.execute(
      `INSERT INTO notebooks (id, space_id, name, color, icon, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        notebook.id,
        notebook.space_id,
        notebook.name,
        notebook.color,
        notebook.icon,
        notebook.sort_order,
        notebook.created_at,
        notebook.updated_at,
      ],
    );
    return notebook;
  },
};
