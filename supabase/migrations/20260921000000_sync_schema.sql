-- Schema do Jupiter Hub no Supabase (Postgres): espelho do SQLite local, usado pelo sync entre dispositivos.
-- Rode uma vez no SQL Editor do projeto (é re-executável). Ao mudar uma tabela do app, mude aqui também
-- e em src/sync/tables.ts — o sync só envia/recebe as colunas listadas lá.
--
-- Decisões:
--  * Espelho fiel: mesmas colunas e mesmos valores do SQLite. As datas ficam em `text` (ISO 8601) de propósito:
--    o valor volta idêntico ao que o app gravou; um timestamptz voltaria em outro formato e quebraria a
--    comparação de "qual versão é mais nova".
--  * user_id + RLS: cada pessoa só enxerga e altera as próprias linhas.
--  * server_updated_at: carimbo do servidor (trigger) usado como cursor do pull incremental; não depende do
--    relógio dos dispositivos.
--  * Última escrita vence: um UPDATE com updated_at mais antigo que o da linha no servidor é descartado.
--  * Sem DELETE (nem o privilégio): exclusões são soft-delete (deleted_at) e viajam como qualquer update.
--  * Sem foreign keys entre tabelas de negócio: o SQLite local já garante a integridade e assim o push em
--    lote não precisa respeitar a ordem pai/filho.

create table if not exists public.spaces (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default clock_timestamp(),
  name text not null,
  description text,
  color text,
  icon text,
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists public.projects (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default clock_timestamp(),
  space_id uuid,
  name text not null,
  description text,
  status text not null default 'planning',
  color text,
  icon text,
  start_date text,
  due_date text,
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists public.tasks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default clock_timestamp(),
  project_id uuid,
  space_id uuid,
  parent_task_id uuid,
  title text not null,
  notes text,
  status text not null default 'todo',
  priority text not null default 'none',
  start_date text,
  due_date text,
  estimated_minutes integer,
  completed_at text,
  recurrence_rule text,
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists public.notebooks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default clock_timestamp(),
  space_id uuid,
  parent_id uuid,
  name text not null,
  color text,
  icon text,
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists public.notes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default clock_timestamp(),
  notebook_id uuid not null,
  parent_note_id uuid,
  title text not null,
  content text not null default '',
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists public.habits (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default clock_timestamp(),
  space_id uuid,
  name text not null,
  color text,
  icon text,
  frequency_type text not null default 'daily',
  frequency_config text,
  target_count integer not null default 1,
  start_date text not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists public.habit_logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default clock_timestamp(),
  habit_id uuid not null,
  date text not null,
  count integer not null default 1,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists public.time_entries (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default clock_timestamp(),
  task_id uuid,
  project_id uuid,
  description text,
  started_at text not null,
  ended_at text,
  duration_seconds integer,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists public.calendar_events (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default clock_timestamp(),
  space_id uuid,
  task_id uuid,
  title text not null,
  description text,
  location text,
  start_at text not null,
  end_at text not null,
  all_day integer not null default 0,
  recurrence_rule text,
  recurrence_exceptions text,
  color text,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists public.tags (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default clock_timestamp(),
  name text not null,
  color text,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists public.entity_tags (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default clock_timestamp(),
  tag_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

-- Roda antes de cada INSERT/UPDATE: descarta escritas mais antigas que a versão do servidor e carimba
-- server_updated_at. O collate "C" garante comparação byte a byte das datas ISO (a collation do banco
-- pode ignorar pontuação e desordenar).
create or replace function public.sync_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at collate "C" < old.updated_at collate "C" then
    return old;
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

-- Parte comum a todas as tabelas: RLS, trigger, índice do cursor e privilégios mínimos.
do $$
declare
  t text;
begin
  foreach t in array array[
    'spaces', 'projects', 'tasks', 'notebooks', 'notes', 'habits',
    'habit_logs', 'time_entries', 'calendar_events', 'tags', 'entity_tags'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );

    execute format('drop trigger if exists sync_guard on public.%I', t);
    execute format(
      'create trigger sync_guard before insert or update on public.%I
         for each row execute function public.sync_guard()',
      t
    );

    execute format(
      'create index if not exists %I on public.%I (user_id, server_updated_at)',
      t || '_sync_cursor_idx', t
    );

    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end;
$$;
