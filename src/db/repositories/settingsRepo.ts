import { getDb } from "../client";

/** Preferências por dispositivo (chave/valor). Não entram no sync: cada máquina tem as suas. */
export const settingsRepo = {
  async all(): Promise<Record<string, string>> {
    const db = await getDb();
    const rows = await db.select<{ key: string; value: string }[]>("SELECT key, value FROM app_settings");
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  },

  async get(key: string): Promise<string | null> {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>("SELECT value FROM app_settings WHERE key = $1", [key]);
    return rows[0]?.value ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    const db = await getDb();
    await db.execute(
      "INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value],
    );
  },
};
