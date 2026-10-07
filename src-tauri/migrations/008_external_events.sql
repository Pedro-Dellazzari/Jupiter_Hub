-- Cache local dos eventos de calendários externos (por enquanto, Google Calendar — somente leitura).
-- Não sincroniza com o Supabase: cada dispositivo conecta a própria conta e busca direto do provedor.
-- A fonte da verdade é o provedor, então aqui o DELETE é físico (o cache é refeito a cada busca).
--
-- start_at / end_at: instante ISO 8601 em UTC para eventos com hora; "YYYY-MM-DD" para eventos de
-- dia inteiro (all_day = 1), com end_at exclusivo — como o Google devolve.

CREATE TABLE external_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    calendar_id TEXT NOT NULL,
    calendar_name TEXT,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    all_day INTEGER NOT NULL DEFAULT 0,
    color TEXT,
    url TEXT
);

CREATE INDEX idx_external_events_start_at ON external_events(start_at);
