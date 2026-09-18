import { getDb } from "../client";
import { newId, now } from "../record";

export type HabitLog = {
  id: string;
  habit_id: string;
  date: string;
  count: number;
  created_at: string;
};

export const habitLogsRepo = {
  async list(): Promise<HabitLog[]> {
    const db = await getDb();
    return db.select<HabitLog[]>("SELECT * FROM habit_logs ORDER BY date ASC");
  },

  /** Alterna o check-in de um hábito num dia (cria o log se não existe, remove se já existe). */
  async toggle(habitId: string, date: string): Promise<void> {
    const db = await getDb();
    const existing = await db.select<HabitLog[]>(
      "SELECT * FROM habit_logs WHERE habit_id = $1 AND date = $2",
      [habitId, date],
    );
    if (existing.length > 0) {
      await db.execute("DELETE FROM habit_logs WHERE id = $1", [existing[0].id]);
    } else {
      await db.execute(
        "INSERT INTO habit_logs (id, habit_id, date, count, created_at) VALUES ($1, $2, $3, $4, $5)",
        [newId(), habitId, date, 1, now()],
      );
    }
  },
};
