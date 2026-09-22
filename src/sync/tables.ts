export type SyncTable = {
  name: string;
  /** Colunas trocadas com o servidor (espelho de supabase/migrations, sem user_id e server_updated_at). */
  columns: readonly string[];
};

const timestamps = ["created_at", "updated_at", "deleted_at"] as const;

/**
 * Tabelas sincronizadas, em ordem de dependência (pais antes de filhos): o SQLite local aplica
 * chaves estrangeiras, então uma linha só entra depois das que ela referencia.
 * `app_settings` e `sync_row_state` são locais de cada dispositivo e ficam de fora.
 * Ao mudar o schema, atualize também `supabase/migrations`.
 */
export const SYNC_TABLES: readonly SyncTable[] = [
  { name: "spaces", columns: ["id", "name", "description", "color", "icon", "sort_order", ...timestamps] },
  {
    name: "projects",
    columns: [
      "id", "space_id", "name", "description", "status", "color", "icon",
      "start_date", "due_date", "sort_order", ...timestamps,
    ],
  },
  {
    name: "tasks",
    columns: [
      "id", "project_id", "space_id", "parent_task_id", "title", "notes", "status", "priority",
      "start_date", "due_date", "estimated_minutes", "completed_at", "recurrence_rule", "sort_order",
      ...timestamps,
    ],
  },
  { name: "notebooks", columns: ["id", "space_id", "parent_id", "name", "color", "icon", "sort_order", ...timestamps] },
  {
    name: "notes",
    columns: ["id", "notebook_id", "parent_note_id", "title", "content", "sort_order", ...timestamps],
  },
  {
    name: "habits",
    columns: [
      "id", "space_id", "name", "color", "icon", "frequency_type", "frequency_config",
      "target_count", "start_date", ...timestamps,
    ],
  },
  { name: "habit_logs", columns: ["id", "habit_id", "date", "count", ...timestamps] },
  {
    name: "time_entries",
    columns: [
      "id", "task_id", "project_id", "description", "started_at", "ended_at", "duration_seconds",
      ...timestamps,
    ],
  },
  {
    name: "calendar_events",
    columns: [
      "id", "space_id", "task_id", "title", "description", "location", "start_at", "end_at", "all_day",
      "recurrence_rule", "recurrence_exceptions", "color", ...timestamps,
    ],
  },
  { name: "tags", columns: ["id", "name", "color", ...timestamps] },
  { name: "entity_tags", columns: ["id", "tag_id", "entity_type", "entity_id", ...timestamps] },
];
