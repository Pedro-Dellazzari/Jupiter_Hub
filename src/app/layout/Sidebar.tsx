import { Plus, Search } from "lucide-react";
import { motion } from "motion/react";
import { modules, type ModuleGroup } from "../../modules/registry";
import { useNavigationStore } from "../store/useNavigationStore";
import { Glass } from "../../shared/ui/Glass";
import { cn } from "../../shared/utils/cn";
import { springs } from "../../shared/motion/springs";

const groupLabels: Record<ModuleGroup, string> = {
  general: "Geral",
  module: "Módulos",
  view: "Visões",
};

const groupOrder: ModuleGroup[] = ["general", "module", "view"];

export function Sidebar() {
  const activeModuleId = useNavigationStore((s) => s.activeModuleId);
  const setActiveModule = useNavigationStore((s) => s.setActiveModule);

  return (
    <Glass material="thick" className="flex h-full w-60 shrink-0 flex-col gap-1 px-4 py-5">
      <div className="flex shrink-0 items-center gap-2.5 px-1 pt-1 pb-3">
        <div className="size-[30px] shrink-0 rounded-lg bg-(--color-accent)" />
        <span className="text-[17px] font-semibold text-(--color-ink)">Hub</span>
      </div>

      <button className="mb-2 flex shrink-0 items-center gap-2 rounded-lg bg-(--color-fill) px-2.5 py-2 text-left text-(--color-ink-muted)">
        <Search className="size-3.5 shrink-0" strokeWidth={2} />
        <span className="text-[13px]">Buscar</span>
      </button>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {groupOrder.map((group) => {
          const items = modules.filter((m) => m.group === group);
          if (items.length === 0) return null;

          return (
            <div key={group} className="flex flex-col">
              <span className="px-1 pt-4 pb-1 text-[11px] font-semibold tracking-[0.4px] text-(--color-ink-muted) uppercase">
                {groupLabels[group]}
              </span>
              {items.map((mod) => {
                const isActive = mod.id === activeModuleId;
                return (
                  <button
                    key={mod.id}
                    onClick={() => setActiveModule(mod.id)}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-lg p-2 text-left text-[14px] transition-colors",
                      isActive
                        ? "font-semibold text-(--color-accent)"
                        : "text-(--color-ink-muted) hover:text-(--color-ink)",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active"
                        transition={springs.standard}
                        className="absolute inset-0 rounded-lg bg-(--color-accent)/12"
                      />
                    )}
                    <mod.icon className="relative z-10 size-4 shrink-0" strokeWidth={1.75} />
                    <span className="relative z-10">{mod.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}

        <div className="mt-2 h-px w-full shrink-0 bg-(--color-divider)" />

        <button className="flex shrink-0 items-center gap-2 px-2 pt-3 pb-2 text-left text-(--color-ink-muted)">
          <Plus className="size-3.5 shrink-0" strokeWidth={2} />
          <span className="text-[13px] font-medium">Adicionar módulo</span>
        </button>
      </nav>

      <div className="flex shrink-0 items-center gap-2 px-1.5 py-2.5">
        <div className="size-7 shrink-0 rounded-full bg-[#339966]" />
        <span className="text-[13px] font-medium text-(--color-ink)">Pedro Dellazzari</span>
      </div>
    </Glass>
  );
}
