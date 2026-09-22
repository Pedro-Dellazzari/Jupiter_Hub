import { getDb } from "../client";
import { newId, now } from "../record";

export type HabitLog = {
  id: string;
  habit_id: string;
  date: string;
  count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export const habitLogsRepo = {
  async list(): Promise<HabitLog[]> {
    const db = await getDb();
    return db.select<HabitLog[]>("SELECT * FROM habit_logs WHERE deleted_at IS NULL ORDER BY date ASC");
  },

  /**
   * Alterna o check-in de um hábito num dia. Desmarcar é soft-delete (para o sync propagar);
   * marcar de novo reativa o log apagado, mantendo uma única linha por (hábito, dia).
   */
  async toggle(habitId: string, date: string): Promise<void> {
    const db = await getDb();
    const rows = await db.select<Pick<HabitLog, "id" | "deleted_at">[]>(
      "SELECT id, deleted_at FROM habit_logs WHERE habit_id = $1 AND date = $2 ORDER BY deleted_at IS NULL DESC LIMIT 1",
      [habitId, date],
    );
    const existing = rows[0];
    const timestamp = now();
    if (existing && existing.deleted_at === null) {
      await db.execute("UPDATE habit_logs SET deleted_at = $1, updated_at = $1 WHERE id = $2", [
        timestamp,
        existing.id,
      ]);
    } else if (existing) {
      await db.execute("UPDATE habit_logs SET deleted_at = NULL, updated_at = $1 WHERE id = $2", [
        timestamp,
        existing.id,
      ]);
    } else {
      await db.execute(
        "INSERT INTO habit_logs (id, habit_id, date, count, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $5)",
        [newId(), habitId, date, 1, timestamp],
      );
    }
  },
};
