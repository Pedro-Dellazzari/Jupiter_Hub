import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { springs } from "../../shared/motion/springs";
import { isCloudAvailable } from "../../sync/supabaseClient";
import type { AccountMode } from "../store/useAccountStore";
import { AccountStep } from "./AccountStep";
import { StorageStep } from "./StorageStep";
import { WelcomeStep } from "./WelcomeStep";

type Step = "welcome" | "storage" | "account";

/** Primeira abertura: boas-vindas → onde guardar os dados → criar conta (ou só o nome, no modo local). */
export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("welcome");
  const [mode, setMode] = useState<AccountMode>(isCloudAvailable ? "cloud" : "local");

  return (
    <div className="flex h-screen w-screen overflow-y-auto bg-(--color-surface)" data-tauri-drag-region>
      <div className="m-auto w-full max-w-[420px] px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springs.snappy}
          >
            {step === "welcome" && <WelcomeStep onNext={() => setStep("storage")} />}
            {step === "storage" && (
              <StorageStep
                mode={mode}
                onModeChange={setMode}
                onBack={() => setStep("welcome")}
                onNext={() => setStep("account")}
              />
            )}
            {step === "account" && <AccountStep mode={mode} onBack={() => setStep("storage")} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
