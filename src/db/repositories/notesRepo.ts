import { getDb } from "../client";
import { newId, now } from "../record";

export type Note = {
  id: string;
  notebook_id: string;
  parent_note_id: string | null;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export const notesRepo = {
  async list(): Promise<Note[]> {
    const db = await getDb();
    return db.select<Note[]>("SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY sort_order ASC");
  },

  async create(input: { notebook_id: string; title: string; content?: string }): Promise<Note> {
    const db = await getDb();
    const note: Note = {
      id: newId(),
      notebook_id: input.notebook_id,
      parent_note_id: null,
      title: input.title,
      content: input.content ?? "",
      sort_order: 0,
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    };
    await db.execute(
      `INSERT INTO notes (id, notebook_id, parent_note_id, title, content, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        note.id,
        note.notebook_id,
        note.parent_note_id,
        note.title,
        note.content,
        note.sort_order,
        note.created_at,
        note.updated_at,
      ],
    );
    return note;
  },

  async update(id: string, input: { title?: string; content?: string }): Promise<void> {
    const db = await getDb();
    if (input.title !== undefined) {
      await db.execute("UPDATE notes SET title = $1, updated_at = $2 WHERE id = $3", [
        input.title,
        now(),
        id,
      ]);
    }
    if (input.content !== undefined) {
      await db.execute("UPDATE notes SET content = $1, updated_at = $2 WHERE id = $3", [
        input.content,
        now(),
        id,
      ]);
    }
  },
};
