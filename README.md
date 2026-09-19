# Jupiter Hub

App desktop-first (Tauri 2 + React + TypeScript) para uso pessoal, com todos os dados
em SQLite local — sem backend remoto. Módulos ativáveis independentemente: Home, Hoje,
Chat com IA, Cadernos, Tarefas, Projetos, Espaços, Hábitos, Time Tracker, Calendário,
mais as visões Roadmap e Gantt.

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

## Estrutura

- `src/app` — shell da aplicação (layout, navegação)
- `src/modules` — um módulo por pasta, registrados em `src/modules/registry.tsx`
- `src/shared` — design system (componentes, presets de animação) e utilitários
- `src/db` — camada de acesso ao SQLite (`client.ts` + `repositories/`)
- `src-tauri/migrations` — schema versionado do SQLite

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
