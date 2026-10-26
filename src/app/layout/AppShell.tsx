import { Suspense, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sidebar } from "./Sidebar";
import { BottomNavBar, NavRail } from "./MobileNav";
import { MoreScreen } from "./MoreScreen";
import { SettingsScreen } from "./SettingsScreen";
import { modules } from "../../modules/registry";
import { useAccountStore } from "../store/useAccountStore";
import { MORE_SCREEN_ID, SETTINGS_SCREEN_ID, useNavigationStore } from "../store/useNavigationStore";
import { useTimerStore } from "../store/useTimerStore";
import { springs } from "../../shared/motion/springs";
import { startAutoSync, useSyncStore } from "../../sync/useSyncStore";
import { startAutoUpdateCheck } from "../store/useUpdateStore";
import { UpdateDialog } from "../../shared/ui/UpdateDialog";
import { setBackFallback } from "../../shared/hooks/useBackHandler";
import { useIsCompact } from "../../shared/hooks/useIsCompact";
import { isMobilePlatform } from "../../shared/utils/platform";
import { SignInDialog } from "./SignInDialog";

// Voltar do Android sem tela de detalhe aberta: sobe para o "Mais" ou para a Home; da Home, sai.
setBackFallback(() => {
  const target = useNavigationStore.getState().backTarget();
  if (target === null) return false;
  useNavigationStore.getState().setActiveModule(target);
  return true;
});

export function AppShell() {
  const activeModuleId = useNavigationStore((s) => s.activeModuleId);
  const mode = useAccountStore((s) => s.mode);
  const compact = useIsCompact();

  useEffect(() => (mode === "cloud" ? startAutoSync() : undefined), [mode]);
  useEffect(() => (isMobilePlatform ? undefined : startAutoUpdateCheck()), []);

  // Fora do celular o "Mais" não existe (tudo cabe na sidebar/rail): volta para a Home.
  useEffect(() => {
    if (activeModuleId === MORE_SCREEN_ID && !isMobilePlatform && !compact) {
      useNavigationStore.getState().setActiveModule("home");
    }
  }, [activeModuleId, compact]);

  const content = (
    // Sem padding aqui: cada módulo define seu próprio chrome de página
    // (ex: Home rola com padding, Cadernos é um workspace de 3 colunas).
    <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <Suspense fallback={null}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModuleId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springs.snappy}
            className="h-full"
          >
            <ActiveScreen id={activeModuleId} />
          </motion.div>
        </AnimatePresence>
      </Suspense>
    </main>
  );

  // Celular: conteúdo + barra embaixo. Fold aberto/tablet: rail à esquerda. Desktop: sidebar.
  if (compact) {
    return (
      <div className="flex h-dvh w-screen flex-col overflow-hidden bg-(--color-surface) pt-(--safe-top)">
        <SignInDialog />
        <MobileTimerLoader />
        {content}
        <BottomNavBar />
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-(--color-surface)" data-tauri-drag-region>
      <UpdateDialog />
      <SignInDialog />
      {isMobilePlatform ? (
        <>
          <MobileTimerLoader />
          <NavRail />
        </>
      ) : (
        <Sidebar />
      )}
      <div className={isMobilePlatform ? "flex min-w-0 flex-1 flex-col pt-(--safe-top)" : "contents"}>{content}</div>
    </div>
  );
}

function ActiveScreen({ id }: { id: string }) {
  if (id === MORE_SCREEN_ID) return <MoreScreen />;
  if (id === SETTINGS_SCREEN_ID) return <SettingsScreen />;
  const activeModule = modules.find((m) => m.id === id) ?? modules[0];
  return <activeModule.Component />;
}

/** No desktop o MiniTimer da sidebar carrega o cronômetro; no mobile não há sidebar, então carrega aqui. */
function MobileTimerLoader() {
  const load = useTimerStore((s) => s.load);
  const dataVersion = useSyncStore((s) => s.dataVersion);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load, dataVersion]);
  return null;
}
