import { Suspense } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sidebar } from "./Sidebar";
import { modules } from "../../modules/registry";
import { useNavigationStore } from "../store/useNavigationStore";
import { springs } from "../../shared/motion/springs";

export function AppShell() {
  const activeModuleId = useNavigationStore((s) => s.activeModuleId);
  const activeModule = modules.find((m) => m.id === activeModuleId) ?? modules[0];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-(--color-surface)" data-tauri-drag-region>
      <Sidebar />
      {/* Sem padding aqui: cada módulo define seu próprio chrome de página
          (ex: Home rola com padding, Cadernos é um workspace de 3 colunas). */}
      <main className="min-w-0 flex-1 overflow-hidden">
        <Suspense fallback={null}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={springs.snappy}
              className="h-full"
            >
              <activeModule.Component />
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
    </div>
  );
}
