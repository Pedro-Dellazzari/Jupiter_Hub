-- Prepara o schema para sync entre dispositivos: toda linha sincronizável precisa de
-- updated_at (pull/push incremental) e deleted_at (propagar exclusões — um DELETE físico
-- some da tabela e os outros dispositivos nunca ficam sabendo).

-- habit_logs passa a ser soft-delete: o toggle de check-in apagava a linha de verdade.
ALTER TABLE habit_logs ADD COLUMN updated_at TEXT;
ALTER TABLE habit_logs ADD COLUMN deleted_at TEXT;
UPDATE habit_logs SET updated_at = created_at;

ALTER TABLE tags ADD COLUMN deleted_at TEXT;

ALTER TABLE entity_tags ADD COLUMN updated_at TEXT;
ALTER TABLE entity_tags ADD COLUMN deleted_at TEXT;
UPDATE entity_tags SET updated_at = created_at;

-- remove() de notes, notebooks e tasks só gravava deleted_at, sem mexer em updated_at.
-- Um sync por "updated_at > último sync" não enxergaria essas exclusões; o backfill
-- alinha as linhas já apagadas com o que o código passa a gravar.
UPDATE notes SET updated_at = deleted_at WHERE deleted_at IS NOT NULL AND deleted_at > updated_at;
UPDATE notebooks SET updated_at = deleted_at WHERE deleted_at IS NOT NULL AND deleted_at > updated_at;
UPDATE tasks SET updated_at = deleted_at WHERE deleted_at IS NOT NULL AND deleted_at > updated_at;
