-- Estado do sync por linha (local a cada dispositivo, não sincroniza): guarda o updated_at da versão
-- que o servidor já tem. Uma linha está "suja" (precisa ser enviada) quando não tem registro aqui ou quando
-- o updated_at dela é diferente do registrado. Comparar versões, em vez de marcar flags, evita perder uma
-- edição feita enquanto o push ainda estava em andamento.
--
-- Os cursores do pull (sync.cursor.<tabela>) e a conta vinculada (sync.user_id) ficam em app_settings.

CREATE TABLE sync_row_state (
    table_name TEXT NOT NULL,
    row_id TEXT NOT NULL,
    synced_updated_at TEXT NOT NULL,
    PRIMARY KEY (table_name, row_id)
);
