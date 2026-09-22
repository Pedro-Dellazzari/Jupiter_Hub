import { useEffect } from "react";
import { AppShell } from "./app/layout/AppShell";
import { OnboardingFlow } from "./app/onboarding/OnboardingFlow";
import { useAccountStore } from "./app/store/useAccountStore";

export default function App() {
  const status = useAccountStore((s) => s.status);

  useEffect(() => {
    void useAccountStore.getState().load();
  }, []);

  if (status === "onboarding") return <OnboardingFlow />;
  if (status === "ready") return <AppShell />;

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-(--color-surface)" data-tauri-drag-region>
      {status === "error" && (
        <>
          <p className="text-[14px] text-(--color-ink-muted)">Não foi possível abrir seus dados locais.</p>
          <button
            onClick={() => void useAccountStore.getState().load()}
            className="rounded-lg bg-(--color-fill) px-3 py-1.5 text-[13px] font-medium text-(--color-ink)"
          >
            Tentar novamente
          </button>
        </>
      )}
    </div>
  );
}
