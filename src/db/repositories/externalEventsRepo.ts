import { getDb } from "../client";
import { formatIsoDate } from "../../shared/utils/date";

/**
 * Evento de um calendário externo (cache local, fora do sync).
 * Com hora: `start_at`/`end_at` são instantes ISO em UTC. Dia inteiro: "YYYY-MM-DD", com `end_at` exclusivo.
 */
export type ExternalEvent = {
  id: string;
  provider: string;
  calendar_id: string;
  calendar_name: string | null;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: number;
  color: string | null;
  url: string | null;
};

const COLUMNS = [
  "id", "provider", "calendar_id", "calendar_name", "title", "description", "location",
  "start_at", "end_at", "all_day", "color", "url",
] as const;

const INSERT_CHUNK_SIZE = 50;

/** Eventos que tocam o intervalo [start, end) — `start` e `end` em horário local. */
const OVERLAPS_RANGE = `(
  (all_day = 0 AND start_at < $1 AND end_at > $2)
  OR (all_day = 1 AND start_at < $3 AND end_at > $4)
)`;

function rangeParams(start: Date, end: Date) {
  return [end.toISOString(), start.toISOString(), formatIsoDate(end), formatIsoDate(start)];
}

export const externalEventsRepo = {
  async listInRange(start: Date, end: Date): Promise<ExternalEvent[]> {
    const db = await getDb();
    return db.select<ExternalEvent[]>(
      `SELECT * FROM external_events WHERE ${OVERLAPS_RANGE} ORDER BY all_day DESC, start_at ASC, title ASC`,
      rangeParams(start, end),
    );
  },

  /** Troca o cache do provedor no intervalo [start, end) pelo que acabou de vir da API. */
  async replaceRange(provider: string, start: Date, end: Date, events: ExternalEvent[]): Promise<void> {
    const db = await getDb();
    await db.execute(`DELETE FROM external_events WHERE provider = $5 AND ${OVERLAPS_RANGE}`, [
      ...rangeParams(start, end),
      provider,
    ]);
    for (let i = 0; i < events.length; i += INSERT_CHUNK_SIZE) {
      const chunk = events.slice(i, i + INSERT_CHUNK_SIZE);
      const placeholders = chunk.map(
        (_, row) => `(${COLUMNS.map((_, column) => `$${row * COLUMNS.length + column + 1}`).join(", ")})`,
      );
      // OR REPLACE: um evento que atravessa a borda do intervalo pode já estar no cache.
      await db.execute(
        `INSERT OR REPLACE INTO external_events (${COLUMNS.join(", ")}) VALUES ${placeholders.join(", ")}`,
        chunk.flatMap((event) => COLUMNS.map((column) => event[column])),
      );
    }
  },

  async clear(provider: string): Promise<void> {
    const db = await getDb();
    await db.execute("DELETE FROM external_events WHERE provider = $1", [provider]);
  },
};
