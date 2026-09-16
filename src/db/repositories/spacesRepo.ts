import { getDb } from "../client";
import { newId, now } from "../record";

export type Space = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/**
 * Repositório de referência para o padrão de acesso a dados do app:
 * módulos chamam funções aqui, nunca executam SQL diretamente.
 * Os demais repositórios (projects, tasks, notebooks, ...) seguem o mesmo formato.
 */
export const spacesRepo = {
  async list(): Promise<Space[]> {
    const db = await getDb();
    return db.select<Space[]>(
      "SELECT * FROM spaces WHERE deleted_at IS NULL ORDER BY sort_order ASC",
    );
  },

  async create(input: { name: string; color?: string; icon?: string }): Promise<Space> {
    const db = await getDb();
    const space: Space = {
      id: newId(),
      name: input.name,
      color: input.color ?? null,
      icon: input.icon ?? null,
      sort_order: 0,
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    };
    await db.execute(
      `INSERT INTO spaces (id, name, color, icon, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        space.id,
        space.name,
        space.color,
        space.icon,
        space.sort_order,
        space.created_at,
        space.updated_at,
      ],
    );
    return space;
  },

  async rename(id: string, name: string): Promise<void> {
    const db = await getDb();
    await db.execute("UPDATE spaces SET name = $1, updated_at = $2 WHERE id = $3", [
      name,
      now(),
      id,
    ]);
  },

  async softDelete(id: string): Promise<void> {
    const db = await getDb();
    await db.execute("UPDATE spaces SET deleted_at = $1, updated_at = $1 WHERE id = $2", [
      now(),
      id,
    ]);
  },
};
