import { getDb } from "../client";
import { newId, now } from "../record";

export type Space = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SpaceWithStats = Space & {
  task_count: number;
  project_count: number;
  note_count: number;
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

  /** Espaços com contagem de tarefas, projetos e notas — usado no card da tela de Espaços. */
  async listWithStats(): Promise<SpaceWithStats[]> {
    const db = await getDb();
    return db.select<SpaceWithStats[]>(
      `SELECT s.*,
        (SELECT COUNT(*) FROM projects p WHERE p.space_id = s.id AND p.deleted_at IS NULL) AS project_count,
        (SELECT COUNT(*) FROM tasks t
          LEFT JOIN projects p ON p.id = t.project_id
          WHERE COALESCE(t.space_id, p.space_id) = s.id
            AND t.deleted_at IS NULL AND t.parent_task_id IS NULL) AS task_count,
        (SELECT COUNT(*) FROM notes n
          JOIN notebooks nb ON nb.id = n.notebook_id
          WHERE nb.space_id = s.id AND n.deleted_at IS NULL) AS note_count
       FROM spaces s
       WHERE s.deleted_at IS NULL
       ORDER BY s.sort_order ASC`,
    );
  },

  async create(input: { name: string; description?: string; color?: string; icon?: string }): Promise<Space> {
    const db = await getDb();
    const space: Space = {
      id: newId(),
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
      sort_order: 0,
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    };
    await db.execute(
      `INSERT INTO spaces (id, name, description, color, icon, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        space.id,
        space.name,
        space.description,
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
