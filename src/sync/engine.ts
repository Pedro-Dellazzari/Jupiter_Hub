import { SYNC_TABLES, type SyncTable } from "./tables";

export type Row = Record<string, unknown>;

/** O que o sync usa do `Database` do tauri-plugin-sql (é o que permite testar com outro SQLite). */
export type LocalDb = {
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
  execute(query: string, bindValues?: unknown[]): Promise<{ rowsAffected: number }>;
};

/**
 * Posição no pull. Só o timestamp não basta: linhas gravadas no mesmo instante empatam, e paginar com
 * "> timestamp" pularia as que sobram no empate. Com `id`, a posição é o par (server_updated_at, id).
 */
export type PullPosition = { at: string; id: string | null };

export type Remote = {
  /** Linhas depois de `since`, ordenadas por (server_updated_at, id), no máximo `limit`. */
  pull(table: string, since: PullPosition | null, limit: number): Promise<Row[]>;
  push(table: string, rows: Row[]): Promise<void>;
};

export type SettingsStore = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
};

export type SyncResult = {
  /** Linhas locais alteradas por dados vindos do servidor (a UI recarrega quando > 0). */
  pulled: number;
  pushed: number;
};

export class SyncAccountMismatchError extends Error {
  constructor() {
    super("Este dispositivo está vinculado a outra conta. Use a conta original ou reinstale o app.");
  }
}

const PAGE_SIZE = 500;
const PUSH_CHUNK_SIZE = 200;
/**
 * O cursor é o server_updated_at (carimbado no commit de cada lote). Uma transação lenta pode
 * confirmar depois de outra mais nova, então o pull volta um pouco no tempo; reaplicar é inofensivo
 * porque só a versão com updated_at maior altera a linha local.
 */
const PULL_OVERLAP_MS = 10_000;

const USER_KEY = "sync.user_id";
const cursorKey = (table: SyncTable) => `sync.cursor.${table.name}`;

function isForeignKeyError(err: unknown) {
  return String(err instanceof Error ? err.message : err).includes("FOREIGN KEY");
}

type EngineDeps = {
  db: LocalDb;
  remote: Remote;
  settings: SettingsStore;
  now: () => string;
  newId: () => string;
  pageSize?: number;
};

/**
 * Sync local-first: primeiro traz o que mudou no servidor (pull), depois envia o que mudou aqui (push).
 * Conflito = última escrita vence, por linha, comparando `updated_at`. O servidor aplica a mesma regra
 * no push (trigger sync_guard), então um dispositivo atrasado nunca sobrescreve uma edição mais nova.
 */
export function createSyncEngine({ db, remote, settings, now, newId, pageSize = PAGE_SIZE }: EngineDeps) {
  async function bindAccount(userId: string) {
    const bound = await settings.get(USER_KEY);
    if (bound === null) await settings.set(USER_KEY, userId);
    else if (bound !== userId) throw new SyncAccountMismatchError();
  }

  async function fetchDelta(table: SyncTable) {
    const cursor = await settings.get(cursorKey(table));
    let since: PullPosition | null = cursor
      ? { at: new Date(new Date(cursor).getTime() - PULL_OVERLAP_MS).toISOString(), id: null }
      : null;
    const rows: Row[] = [];
    for (;;) {
      const page = await remote.pull(table.name, since, pageSize);
      rows.push(...page);
      if (page.length < pageSize) break;
      const last = page[page.length - 1];
      since = { at: String(last.server_updated_at), id: String(last.id) };
    }

    // O cursor nunca anda para trás (o overlap pode devolver só linhas que já vimos).
    const last = rows.length ? String(rows[rows.length - 1].server_updated_at) : null;
    const advanced = last !== null && (cursor === null || new Date(last) > new Date(cursor));
    return { rows, cursor: advanced ? last : null };
  }

  async function markSynced(table: SyncTable, id: unknown, updatedAt: unknown) {
    await db.execute(
      "INSERT OR REPLACE INTO sync_row_state (table_name, row_id, synced_updated_at) VALUES ($1, $2, $3)",
      [table.name, id, updatedAt],
    );
  }

  /** Aplica uma linha do servidor. Retorna se a linha local mudou (só quando o servidor é mais novo). */
  async function applyRow(table: SyncTable, row: Row): Promise<boolean> {
    const columns = table.columns.join(", ");
    const placeholders = table.columns.map((_, i) => `$${i + 1}`).join(", ");
    const assignments = table.columns
      .filter((c) => c !== "id")
      .map((c) => `${c} = excluded.${c}`)
      .join(", ");
    const sql = `INSERT INTO ${table.name} (${columns}) VALUES (${placeholders})
      ON CONFLICT(id) DO UPDATE SET ${assignments} WHERE excluded.updated_at > ${table.name}.updated_at`;

    const losing = table.name === "notes" ? await findLosingNote(row) : null;
    const { rowsAffected } = await db.execute(sql, table.columns.map((c) => row[c] ?? null));
    if (rowsAffected > 0) await markSynced(table, row.id, row.updated_at);
    if (losing) await saveConflictCopy(String(row.id), String(row.updated_at), losing);
    return rowsAffected > 0;
  }

  type NoteRow = {
    id: string;
    notebook_id: string;
    title: string;
    content: string;
    sort_order: number;
    updated_at: string;
    deleted_at: string | null;
  };

  type LosingNote = Pick<NoteRow, "notebook_id" | "title" | "content" | "sort_order">;

  const conflictKey = (noteId: string) => `sync.conflict.${noteId}`;

  /**
   * Texto de nota é o único dado em que "última escrita vence" dói de verdade. Quando a nota tem edição
   * local ainda não enviada e o servidor tem outro texto, o lado que perde vira uma cópia "(conflito)":
   *  - servidor mais novo: a versão local vai ser sobrescrita → guardamos a local;
   *  - local mais nova: a versão do servidor vai ser descartada → guardamos a do servidor.
   * O cursor do pull sobrepõe janelas e rebusca linhas; o registro por (nota, versão) evita copiar duas vezes.
   */
  async function findLosingNote(incoming: Row): Promise<LosingNote | null> {
    const [local] = await db.select<NoteRow[]>("SELECT * FROM notes WHERE id = $1", [incoming.id]);
    if (!local || local.content === incoming.content) return null;

    const [state] = await db.select<{ synced_updated_at: string }[]>(
      "SELECT synced_updated_at FROM sync_row_state WHERE table_name = 'notes' AND row_id = $1",
      [local.id],
    );
    const base = state?.synced_updated_at ?? null; // versão que este dispositivo já sincronizou
    if (base === local.updated_at) return null; // sem edição local pendente

    const incomingUpdatedAt = String(incoming.updated_at);
    if (incomingUpdatedAt === local.updated_at) return null;
    if ((await settings.get(conflictKey(local.id))) === incomingUpdatedAt) return null; // já preservada

    if (incomingUpdatedAt > local.updated_at) {
      return local.deleted_at === null ? local : null;
    }
    // Uma exclusão mais antiga que a edição local não perde texto nenhum: a nota só continua viva.
    if (incoming.deleted_at != null) return null;
    // Se o servidor ainda está na versão-base (que o overlap do cursor rebusca), ninguém editou lá: não é conflito.
    if (base !== null && incomingUpdatedAt <= base) return null;
    return {
      notebook_id: local.notebook_id,
      title: String(incoming.title),
      content: String(incoming.content),
      sort_order: local.sort_order,
    };
  }

  async function saveConflictCopy(noteId: string, incomingUpdatedAt: string, note: LosingNote) {
    const stamp = now();
    await db.execute(
      `INSERT INTO notes (id, notebook_id, parent_note_id, title, content, sort_order, created_at, updated_at)
       VALUES ($1, $2, NULL, $3, $4, $5, $6, $6)`,
      [newId(), note.notebook_id, `${note.title} (conflito)`, note.content, note.sort_order, stamp],
    );
    await settings.set(conflictKey(noteId), incomingUpdatedAt);
  }

  /**
   * Aplica as linhas de uma tabela. Numa tabela que referencia a si mesma (subtarefas, pastas) um filho
   * pode chegar antes do pai; ele é adiado e tentado de novo depois do resto.
   */
  async function applyRows(table: SyncTable, rows: Row[]): Promise<number> {
    let pending = rows;
    let changed = 0;
    while (pending.length > 0) {
      const deferred: Row[] = [];
      for (const row of pending) {
        try {
          if (await applyRow(table, row)) changed++;
        } catch (err) {
          if (!isForeignKeyError(err)) throw err;
          deferred.push(row);
        }
      }
      if (deferred.length === pending.length) {
        throw new Error(`Não foi possível aplicar ${deferred.length} linha(s) de ${table.name}: referência ausente.`);
      }
      pending = deferred;
    }
    return changed;
  }

  /**
   * Dois dispositivos podem marcar o mesmo hábito no mesmo dia, gerando logs com ids diferentes.
   * Fica o de menor id (regra igual em todos os dispositivos) e os outros viram soft-delete.
   */
  async function dedupeHabitLogs(): Promise<number> {
    const { rowsAffected } = await db.execute(
      `UPDATE habit_logs SET deleted_at = $1, updated_at = $1
       WHERE deleted_at IS NULL
         AND id <> (SELECT MIN(other.id) FROM habit_logs other
                    WHERE other.habit_id = habit_logs.habit_id AND other.date = habit_logs.date
                      AND other.deleted_at IS NULL)`,
      [now()],
    );
    return rowsAffected;
  }

  async function pushTable(table: SyncTable): Promise<number> {
    const columns = table.columns.map((c) => `t.${c}`).join(", ");
    const dirty = await db.select<Row[]>(
      `SELECT ${columns} FROM ${table.name} t
       LEFT JOIN sync_row_state s ON s.table_name = $1 AND s.row_id = t.id
       WHERE s.synced_updated_at IS NULL OR s.synced_updated_at <> t.updated_at
       ORDER BY t.updated_at ASC`,
      [table.name],
    );

    for (let i = 0; i < dirty.length; i += PUSH_CHUNK_SIZE) {
      const chunk = dirty.slice(i, i + PUSH_CHUNK_SIZE);
      await remote.push(table.name, chunk);
      // Registra a versão que foi enviada (não a atual): uma edição feita durante o push continua "suja".
      for (const row of chunk) await markSynced(table, row.id, row.updated_at);
    }
    return dirty.length;
  }

  async function sync(userId: string): Promise<SyncResult> {
    await bindAccount(userId);

    const deltas = await Promise.all(SYNC_TABLES.map(fetchDelta));
    let pulled = 0;
    for (const [i, table] of SYNC_TABLES.entries()) {
      const { rows, cursor } = deltas[i];
      pulled += await applyRows(table, rows);
      if (table.name === "habit_logs") pulled += await dedupeHabitLogs();
      if (cursor) await settings.set(cursorKey(table), cursor);
    }

    let pushed = 0;
    for (const table of SYNC_TABLES) pushed += await pushTable(table);
    return { pulled, pushed };
  }

  return { sync };
}
