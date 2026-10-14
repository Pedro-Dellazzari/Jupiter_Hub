import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;

/** Conexão única com o SQLite local, aberta sob demanda e reutilizada. */
export function getDb() {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:hub.db").catch((err) => {
      // Não guarda a falha: permite que "Tentar novamente" reabra o banco.
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}
