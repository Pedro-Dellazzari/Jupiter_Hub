import { ProgressBar } from "../../../shared/ui/ProgressBar";

export function OnboardingProgress({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <ProgressBar value={(done / total) * 100} className="w-[280px]" />
      <span className="text-[12px] font-semibold text-(--color-ink-muted)">
        {done} de {total} passos concluídos
      </span>
    </div>
  );
}
