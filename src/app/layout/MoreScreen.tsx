import { useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Search } from "lucide-react";
import { modules } from "../../modules/registry";
import { habitsRepo } from "../../db/repositories/habitsRepo";
import { notesRepo } from "../../db/repositories/notesRepo";
import { spacesRepo } from "../../db/repositories/spacesRepo";
import { useExternalEvents } from "../../modules/calendar/useExternalEvents";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { useElapsedSeconds } from "../../shared/hooks/useElapsedSeconds";
import { Card } from "../../shared/ui/Card";
import { formatClock } from "../../shared/utils/duration";
import { startOfDay } from "../../shared/utils/date";
import { useAccountStore } from "../store/useAccountStore";
import { NAV_BAR_MODULE_IDS, SETTINGS_SCREEN_ID, useNavigationStore } from "../store/useNavigationStore";
import { useTimerStore, type RunningTimer } from "../store/useTimerStore";
import { useSyncStore } from "../../sync/useSyncStore";
import { AccountAvatar } from "./MobileNav";

/** Ordem dos mockups: os módulos que não cabem na barra de navegação. */
const MORE_ORDER = ["notebooks", "spaces", "habits", "time-tracker", "calendar", "chat"];

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** Menu "Mais" do celular: os demais módulos e o acesso à conta/configurações. */
export function MoreScreen() {
  const setActiveModule = useNavigationStore((s) => s.setActiveModule);
  const name = useAccountStore((s) => s.name);
  const [query, setQuery] = useState("");
  const details = useModuleDetails();

  const items = MORE_ORDER.flatMap((id) => modules.filter((m) => m.id === id && !NAV_BAR_MODULE_IDS.includes(m.id)));
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const visible = normalized ? items.filter((m) => m.label.toLocaleLowerCase("pt-BR").includes(normalized)) : items;

  return (
    <div className="h-full overflow-y-auto px-5 pt-4 pb-6 *:mx-auto *:max-w-[640px]">
      <h1 className="mb-4 text-[28px] font-bold tracking-[-0.5px] text-(--color-ink)">Mais</h1>

      <label className="mb-6 flex items-center gap-2 rounded-xl bg-(--color-surface-elevated) px-3.5 py-3 shadow-[0px_2px_10px_0px_rgba(0,0,0,0.04)]">
        <Search className="size-4 shrink-0 text-(--color-ink-muted)" strokeWidth={2} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)"
        />
      </label>

      <p className="mb-2 text-[12px] font-semibold tracking-[0.4px] text-(--color-ink-muted) uppercase">Módulos</p>
      <Card className="mb-5 flex flex-col divide-y divide-(--color-divider) px-4">
        {visible.length === 0 && (
          <p className="py-4 text-[14px] text-(--color-ink-muted)">Nenhum módulo com esse nome.</p>
        )}
        {visible.map((mod) => (
          <button
            key={mod.id}
            type="button"
            onClick={() => setActiveModule(mod.id)}
            className="flex items-center gap-4 py-4 text-left"
          >
            <mod.icon className="size-[18px] shrink-0 text-(--color-accent-text)" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 truncate text-[16px] text-(--color-ink)">{mod.label}</span>
            {details[mod.id] ?? <ChevronRight className="size-4 shrink-0 text-(--color-ink-muted)" strokeWidth={2} />}
          </button>
        ))}
      </Card>

      <Card className="px-4">
        <button
          type="button"
          onClick={() => setActiveModule(SETTINGS_SCREEN_ID)}
          className="flex w-full items-center gap-3.5 py-4 text-left"
        >
          <AccountAvatar name={name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold text-(--color-ink)">{name}</p>
            <p className="truncate text-[13px] text-(--color-ink-muted)">
              <AccountStatusLabel /> · Configurações
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-(--color-ink-muted)" strokeWidth={2} />
        </button>
      </Card>
    </div>
  );
}

/** "Sincronizado", "Sincronizando…" etc. no modo nuvem; "Dados locais" no modo local. */
export function AccountStatusLabel() {
  const mode = useAccountStore((s) => s.mode);
  const status = useSyncStore((s) => s.status);
  const needsSignIn = useSyncStore((s) => s.needsSignIn);
  if (mode !== "cloud") return <>Dados locais</>;
  if (needsSignIn) return <>Entre novamente para sincronizar</>;
  if (status === "syncing") return <>Sincronizando…</>;
  if (status === "error") return <>Erro ao sincronizar</>;
  return <>Sincronizado</>;
}

/** Texto à direita de cada módulo no "Mais" (contagens, cronômetro, eventos de hoje). */
function useModuleDetails(): Record<string, ReactNode> {
  const notes = useRepoList(notesRepo.list);
  const spaces = useRepoList(spacesRepo.list);
  const habits = useRepoList(habitsRepo.list);
  const running = useTimerStore((s) => s.running);
  const [todayStart, tomorrow] = useMemo(() => {
    const start = startOfDay(new Date());
    return [start, new Date(start.getTime() + 86_400_000)];
  }, []);
  const eventsToday = useExternalEvents(todayStart, tomorrow);

  const count = (state: { status: string; items?: unknown[] }, one: string, many: string) =>
    state.items ? <Detail>{plural(state.items.length, one, many)}</Detail> : null;

  return {
    notebooks: count(notes.state, "nota", "notas"),
    spaces: count(spaces.state, "espaço", "espaços"),
    habits: count(habits.state, "hábito", "hábitos"),
    "time-tracker": running ? <RunningClock running={running} /> : null,
    calendar: eventsToday.length > 0 ? <Detail>{plural(eventsToday.length, "evento hoje", "eventos hoje")}</Detail> : null,
  };
}

function Detail({ children }: { children: ReactNode }) {
  return <span className="shrink-0 text-[13px] text-(--color-ink-muted)">{children}</span>;
}

function RunningClock({ running }: { running: RunningTimer }) {
  const elapsed = useElapsedSeconds(running.startedAt);
  return <span className="shrink-0 text-[13px] font-medium text-(--color-accent-text) tabular-nums">{formatClock(elapsed)}</span>;
}
