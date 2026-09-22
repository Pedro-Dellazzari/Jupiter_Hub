-- Marcos de um projeto: checkpoints com data-alvo, exibidos como linha do tempo na página de detalhe.
-- "Concluído" é completed_at != NULL, no mesmo padrão de tasks/habit_logs.

CREATE TABLE milestones (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    title TEXT NOT NULL,
    due_date TEXT,
    completed_at TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);
