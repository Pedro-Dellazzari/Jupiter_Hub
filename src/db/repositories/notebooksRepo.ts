import { getDb } from "../client";
import { newId, now } from "../record";

export type Notebook = {
  id: string;
  space_id: string | null;
  /** Pasta pai; `null` = pasta na raiz. */
  parent_id: string | null;
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

  async create(input: {
    name: string;
    space_id?: string | null;
    parent_id?: string | null;
    sort_order?: number;
  }): Promise<Notebook> {
    const db = await getDb();
    const notebook: Notebook = {
      id: newId(),
      space_id: input.space_id ?? null,
      parent_id: input.parent_id ?? null,
      name: input.name,
      color: null,
      icon: null,
      sort_order: input.sort_order ?? 0,
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    };
    await db.execute(
      `INSERT INTO notebooks (id, space_id, parent_id, name, color, icon, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        notebook.id,
        notebook.space_id,
        notebook.parent_id,
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

  async update(id: string, input: { name: string }): Promise<void> {
    const db = await getDb();
    await db.execute("UPDATE notebooks SET name = $1, updated_at = $2 WHERE id = $3", [
      input.name,
      now(),
      id,
    ]);
  },

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.execute("UPDATE notebooks SET deleted_at = $1, updated_at = $1 WHERE id = $2", [now(), id]);
  },

  /** Define a pasta pai e a ordem de um conjunto de pastas irmãs — usado ao reordenar ou aninhar por drag-and-drop. */
  async reorderWithin(parentId: string | null, orderedIds: string[]): Promise<void> {
    const db = await getDb();
    await Promise.all(
      orderedIds.map((id, index) =>
        db.execute("UPDATE notebooks SET parent_id = $1, sort_order = $2, updated_at = $3 WHERE id = $4", [
          parentId,
          index,
          now(),
          id,
        ]),
      ),
    );
  },
};
