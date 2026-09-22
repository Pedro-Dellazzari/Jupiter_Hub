# Jupiter Hub

App desktop-first (Tauri 2 + React + TypeScript) para uso pessoal. Os dados vivem em SQLite
local (local-first, funciona offline); no modo "Banco de dados" o app também sincroniza com o
Supabase, para usar em vários computadores. No modo "Dados locais" nada sai da máquina.
Módulos ativáveis independentemente: Home, Hoje, Chat com IA, Cadernos, Tarefas, Projetos,
Espaços, Hábitos, Time Tracker, Calendário.

## Pré-requisitos

- Node.js + [pnpm](https://pnpm.io/)
- Rust (via [rustup](https://www.rust-lang.org/tools/install)) — necessário para compilar o shell Tauri
- Demais pré-requisitos de SO: https://tauri.app/start/prerequisites/

## Desenvolvimento

```bash
pnpm install
pnpm tauri dev
```

## Build de produção

```bash
pnpm tauri build
```

## Sync com Supabase (modo "Banco de dados")

1. Crie um projeto no [Supabase](https://supabase.com/).
2. No SQL Editor, rode `supabase/migrations/20260921000000_sync_schema.sql` (pode rodar de novo sem problema).
3. Em Authentication → Sign In / Providers → Email, desligue **Confirm email** (o cadastro é só nome, e-mail e senha).
4. Copie `.env.example` para `.env.local` e preencha a URL e a chave **publishable** (Project Settings → API Keys;
   nunca a `secret`/`service_role`).
   Sem essas variáveis a opção "Banco de dados" aparece como indisponível. No release (GitHub Actions) elas vêm
   dos secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` do Environment `prod-release`; o workflow reprova o
   build se estiverem vazios ou se for a chave `secret`/`service_role` (`.github/scripts/check-supabase-env.mjs`).

Como funciona: cada dispositivo trabalha no próprio SQLite e sincroniza (pull, depois push) ao abrir, a cada
minuto, ao trocar o foco da janela e ao reconectar. Conflito na mesma linha = última edição (`updated_at`) vence;
quando o texto de uma nota é sobrescrito, a versão perdida vira uma nota "… (conflito)". Exclusões são
soft-delete (`deleted_at`) para poderem viajar entre dispositivos.

**Ao mudar uma tabela sincronizada**, atualize os três lugares: a migration do SQLite (`src-tauri/migrations`),
o schema do Supabase (`supabase/migrations`) e a lista de colunas em `src/sync/tables.ts`.

## Estrutura

- `src/app` — shell da aplicação (layout, navegação, onboarding)
- `src/modules` — um módulo por pasta, registrados em `src/modules/registry.tsx`
- `src/shared` — design system (componentes, presets de animação) e utilitários
- `src/db` — camada de acesso ao SQLite (`client.ts` + `repositories/`)
- `src/sync` — cliente do Supabase, autenticação e motor de sync
- `src-tauri/migrations` — schema versionado do SQLite
- `supabase/migrations` — schema espelho no Postgres do Supabase (com RLS)

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
