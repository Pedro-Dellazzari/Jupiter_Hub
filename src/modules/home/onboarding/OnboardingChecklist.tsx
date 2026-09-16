import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { Card } from "../../../shared/ui/Card";
import { cn } from "../../../shared/utils/cn";

export type ChecklistStep = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel: string;
  done: boolean;
  onAction: () => void;
};

export function OnboardingChecklist({ steps }: { steps: ChecklistStep[] }) {
  return (
    <Card className="flex flex-col p-2.5">
      {steps.map((step, i) => (
        <div key={step.id}>
          {i > 0 && <div className="h-px w-full bg-(--color-track)" />}
          <div className="flex items-center gap-3.5 px-2.5 py-3.5">
            <div
              className={cn(
                "flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px]",
                step.done
                  ? "border-(--color-accent) bg-(--color-accent)"
                  : "border-[#cccccf]",
              )}
            >
              {step.done && <Check className="size-3 text-white" strokeWidth={3} />}
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-(--color-accent)/12">
              <step.icon className="size-4 text-(--color-accent)" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-(--color-ink)">{step.title}</p>
              <p className="text-[12px] text-(--color-ink-muted)">{step.description}</p>
            </div>
            {step.done ? (
              <span className="shrink-0 text-[12px] font-medium text-(--color-ink-muted)">
                Concluído
              </span>
            ) : (
              <button
                onClick={step.onAction}
                className="shrink-0 rounded-[9px] bg-(--color-fill) px-3.5 py-2 text-[12px] font-semibold text-(--color-ink) hover:bg-(--color-track)"
              >
                {step.ctaLabel}
              </button>
            )}
          </div>
        </div>
      ))}
    </Card>
  );
}
