import type { LucideIcon } from "lucide-react";
import { Cloud, HardDrive } from "lucide-react";
import { isCloudAvailable } from "../../sync/supabaseClient";
import { cn } from "../../shared/utils/cn";
import type { AccountMode } from "../store/useAccountStore";
import { BackButton, PrimaryButton, StepHeader } from "./parts";

type Option = {
  mode: AccountMode;
  icon: LucideIcon;
  title: string;
  description: string;
  recommended?: boolean;
};

const OPTIONS: Option[] = [
  {
    mode: "cloud",
    icon: Cloud,
    title: "Banco de dados",
    description: "Sincroniza seus dados entre vários computadores e o celular.",
    recommended: true,
  },
  {
    mode: "local",
    icon: HardDrive,
    title: "Dados locais",
    description:
      "Ficam só neste computador. Escolha esta opção se você vai usar o Jupiter Hub em uma única máquina.",
  },
];

export function StorageStep({
  mode,
  onModeChange,
  onBack,
  onNext,
}: {
  mode: AccountMode;
  onModeChange: (mode: AccountMode) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <BackButton onClick={onBack} />
      <StepHeader title="Onde guardar seus dados?" description="Você pode escolher o que faz mais sentido para o seu uso." />

      <div role="radiogroup" aria-label="Onde guardar seus dados" className="flex flex-col gap-3">
        {OPTIONS.map((option) => {
          const disabled = option.mode === "cloud" && !isCloudAvailable;
          const selected = mode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onModeChange(option.mode)}
              className={cn(
                "flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-colors",
                selected
                  ? "border-(--color-accent) bg-(--color-accent)/8"
                  : "border-(--color-divider) bg-(--color-surface-elevated) hover:border-(--color-ink-muted)/40",
                disabled && "cursor-not-allowed opacity-50 hover:border-(--color-divider)",
              )}
            >
              <option.icon
                className={cn("mt-0.5 size-5 shrink-0", selected ? "text-(--color-accent-text)" : "text-(--color-ink-muted)")}
                strokeWidth={1.75}
              />
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-(--color-ink)">{option.title}</span>
                  {option.recommended && (
                    <span className="rounded-md bg-(--color-accent)/15 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.4px] text-(--color-accent-text) uppercase">
                      Recomendado
                    </span>
                  )}
                </span>
                <span className="text-[13px] leading-snug text-(--color-ink-muted)">
                  {disabled ? "Indisponível nesta versão do app." : option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <PrimaryButton onClick={onNext}>Continuar</PrimaryButton>
    </div>
  );
}
