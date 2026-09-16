import { getDb } from "../client";
import { newId, now } from "../record";

export type Habit = {
  id: string;
  space_id: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  frequency_type: string;
  frequency_config: string | null;
  target_count: number;
  start_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export const habitsRepo = {
  async list(): Promise<Habit[]> {
    const db = await getDb();
    return db.select<Habit[]>(
      "SELECT * FROM habits WHERE deleted_at IS NULL ORDER BY created_at ASC",
    );
  },

  async create(input: { name: string; space_id?: string | null }): Promise<Habit> {
    const db = await getDb();
    const habit: Habit = {
      id: newId(),
      space_id: input.space_id ?? null,
      name: input.name,
      color: null,
      icon: null,
      frequency_type: "daily",
      frequency_config: null,
      target_count: 1,
      start_date: now().slice(0, 10),
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    };
    await db.execute(
      `INSERT INTO habits (id, space_id, name, color, icon, frequency_type, frequency_config, target_count, start_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        habit.id,
        habit.space_id,
        habit.name,
        habit.color,
        habit.icon,
        habit.frequency_type,
        habit.frequency_config,
        habit.target_count,
        habit.start_date,
        habit.created_at,
        habit.updated_at,
      ],
    );
    return habit;
  },
};
