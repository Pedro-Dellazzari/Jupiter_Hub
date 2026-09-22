-- Pastas dentro de pastas: um caderno (pasta) pode ter uma pasta pai.
-- NULL = pasta na raiz.

ALTER TABLE notebooks ADD COLUMN parent_id TEXT REFERENCES notebooks(id);

CREATE INDEX idx_notebooks_parent_id ON notebooks(parent_id);
