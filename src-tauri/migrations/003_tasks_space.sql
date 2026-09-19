-- Tarefas podem pertencer direto a um Espaço, sem passar por um projeto
-- (ex: tarefas soltas relacionadas a um Espaço). Quando a tarefa tem projeto
-- e não tem space_id próprio, o Espaço continua sendo herdado do projeto.

ALTER TABLE tasks ADD COLUMN space_id TEXT REFERENCES spaces(id);

CREATE INDEX idx_tasks_space_id ON tasks(space_id);
