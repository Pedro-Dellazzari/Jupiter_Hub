import { useState } from "react";
import { Ellipsis, Plus, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { modules } from "../../modules/registry";
import { tasksRepo } from "../../db/repositories/tasksRepo";
import { useAccountStore } from "../store/useAccountStore";
import {
  MORE_SCREEN_ID,
  NAV_BAR_MODULE_IDS,
  SETTINGS_SCREEN_ID,
  useNavigationStore,
} from "../store/useNavigationStore";
import { useSyncStore } from "../../sync/useSyncStore";
import { LogoMark } from "../../shared/ui/Logo";
import { QuickCreateDialog } from "../../shared/ui/QuickCreateDialog";
import { springs } from "../../shared/motion/springs";
import { cn } from "../../shared/utils/cn";

type NavItem = { id: string; label: string; icon: LucideIcon };

const MORE_ITEM: NavItem = { id: MORE_SCREEN_ID, label: "Mais", icon: Ellipsis };

function moduleItems(ids: string[]): NavItem[] {
  return ids.flatMap((id) => {
    const mod = modules.find((m) => m.id === id);
    return mod ? [{ id: mod.id, label: mod.label, icon: mod.icon }] : [];
  });
}

const BAR_ITEMS = [...moduleItems(NAV_BAR_MODULE_IDS), MORE_ITEM];
/** No rail (Fold aberto, tablet) cabe um item a mais: Espaços. */
const RAIL_ITEMS = [...moduleItems([...NAV_BAR_MODULE_IDS, "spaces"]), MORE_ITEM];

/** O item "Mais" fica ativo também nas telas que ele abre (Configurações, Cadernos, Hábitos...). */
function activeNavId(activeModuleId: string, items: NavItem[]) {
  if (items.some((item) => item.id === activeModuleId)) return activeModuleId;
  return MORE_SCREEN_ID;
}

/** Barra de navegação do celular (Material 3): 4 módulos + "Mais". */
export function BottomNavBar() {
  const activeModuleId = useNavigationStore((s) => s.activeModuleId);
  const setActiveModule = useNavigationStore((s) => s.setActiveModule);
  const activeId = activeNavId(activeModuleId, BAR_ITEMS);

  return (
    <nav className="flex shrink-0 items-stretch border-t border-(--color-divider) bg-(--color-surface-elevated) px-1 pt-3 pb-[calc(var(--safe-bottom)+10px)]">
      {BAR_ITEMS.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveModule(item.id)}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            <span className="relative flex h-8 w-14 items-center justify-center">
              {active && (
                <motion.span
                  layoutId="navbar-active"
                  transition={springs.standard}
                  className="absolute inset-0 rounded-full bg-(--color-accent)/15"
                />
              )}
              <item.icon
                className={cn("relative size-[18px]", active ? "text-(--color-accent-text)" : "text-(--color-ink-muted)")}
                strokeWidth={1.75}
              />
            </span>
            <span
              className={cn(
                "truncate text-[12px]",
                active ? "font-semibold text-(--color-ink)" : "font-medium text-(--color-ink-muted)",
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/** Navigation rail para telas médias/grandes no Android (Fold aberto, tablet). */
export function NavRail() {
  const activeModuleId = useNavigationStore((s) => s.activeModuleId);
  const setActiveModule = useNavigationStore((s) => s.setActiveModule);
  const name = useAccountStore((s) => s.name);
  const [createOpen, setCreateOpen] = useState(false);
  const activeId = activeNavId(activeModuleId, RAIL_ITEMS);

  return (
    <nav className="flex h-full w-20 shrink-0 flex-col items-center gap-3 border-r border-(--color-divider) bg-(--color-surface) pt-[calc(var(--safe-top)+12px)] pb-[calc(var(--safe-bottom)+16px)]">
      <LogoMark size={36} className="shrink-0" />
      <motion.button
        type="button"
        onClick={() => setCreateOpen(true)}
        whileTap={{ scale: 0.92, transition: springs.snappy }}
        className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-(--color-accent)/15 text-(--color-accent-text)"
        aria-label="Nova tarefa"
      >
        <Plus className="size-5" strokeWidth={2} />
      </motion.button>

      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto">
        {RAIL_ITEMS.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveModule(item.id)}
              className="flex w-16 flex-col items-center gap-1"
            >
              <span className="relative flex h-8 w-14 items-center justify-center">
                {active && (
                  <motion.span
                    layoutId="rail-active"
                    transition={springs.standard}
                    className="absolute inset-0 rounded-full bg-(--color-accent)/15"
                  />
                )}
                <item.icon
                  className={cn("relative size-[18px]", active ? "text-(--color-accent-text)" : "text-(--color-ink-muted)")}
                  strokeWidth={1.75}
                />
              </span>
              <span
                className={cn(
                  "w-full truncate text-center text-[12px]",
                  active ? "font-semibold text-(--color-ink)" : "font-medium text-(--color-ink-muted)",
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <AccountAvatar name={name} onClick={() => setActiveModule(SETTINGS_SCREEN_ID)} />

      <QuickCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nova tarefa"
        placeholder="O que você precisa fazer?"
        submitLabel="Adicionar tarefa"
        onSubmit={async (title) => {
          await tasksRepo.create({ title });
          // As listas abertas (Home, Hoje, Tarefas) recarregam com o dataVersion.
          useSyncStore.setState((s) => ({ dataVersion: s.dataVersion + 1 }));
        }}
      />
    </nav>
  );
}

/** Círculo com a inicial do nome (mesma cor do avatar da sidebar). */
export function AccountAvatar({
  name,
  size = 40,
  onClick,
}: {
  name: string;
  size?: number;
  onClick?: () => void;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const className =
    "flex shrink-0 items-center justify-center rounded-full bg-[#339966] font-semibold text-white";
  const style = { width: size, height: size, fontSize: size * 0.42 };
  if (!onClick) {
    return (
      <span className={className} style={style}>
        {initial}
      </span>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className} style={style} aria-label="Conta e configurações">
      {initial}
    </button>
  );
}
