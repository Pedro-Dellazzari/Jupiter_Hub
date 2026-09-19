# Branding — Jupiter Hub

Fonte de verdade do logo. O ícone é uma grade de módulos em que o planeta (Júpiter)
ocupa a quarta célula.

| Arquivo | Uso |
|---|---|
| `icon-light.svg` | Ícone principal (creme). Origem do `.ico` do Windows, do favicon (`public/logo.svg`) e dos demais tamanhos |
| `icon-dark.svg` | Variante para fundos escuros (o componente `LogoMark` já alterna sozinho com o tema) |
| `icon-orange.svg` | Variante laranja, alternativa para a barra de tarefas |
| `icon-mono.svg` | Uma cor só (branco sobre escuro) |

## Cores

| Token | Valor |
|---|---|
| Planeta / marca | `#E8892B` |
| Creme | `#F6EBD3` |
| Escuro | `#1D1D1F` |
| Cinza dos módulos (claro / escuro) | `#48484A` / `#6B6358` |

Tipografia do nome: **Sora SemiBold**, espaçamento -2%.

## Regenerar os ícones do app

```bash
pnpm tauri icon branding/icon-light.svg
```

Isso reescreve `src-tauri/icons/` (`.ico` com 16/24/32/48/64/256, `.icns` e os PNGs).
Apague as pastas `android/` e `ios/` geradas em `src-tauri/icons/` — o app é só desktop.

Se o `pnpm tauri dev` já estiver rodando, o Cargo não reembute o ícone sozinho.
Force o rebuild atualizando a data de `src-tauri/build.rs`:

```powershell
(Get-Item src-tauri/build.rs).LastWriteTime = Get-Date
```

O Windows guarda ícones em cache. Se a barra de tarefas mostrar o ícone antigo depois de
um build de produção, desafixe e fixe o app de novo.
