import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel: string;
  onAction: () => void;
};

/** Estado vazio padrão de um módulo inteiro (ícone + título + descrição + CTA, centralizado). */
export function EmptyState({ icon: Icon, title, description, ctaLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3.5">
      <div className="flex size-16 items-center justify-center rounded-[18px] bg-(--color-fill)">
        <Icon className="size-6 text-(--color-ink-muted)" strokeWidth={1.75} />
      </div>
      <p className="text-[17px] font-semibold text-(--color-ink)">{title}</p>
      <p className="w-[320px] text-center text-[13px] text-(--color-ink-muted)">{description}</p>
      <button
        onClick={onAction}
        className="rounded-[10px] bg-(--color-accent) px-[18px] py-2.5 text-[13px] font-semibold text-(--color-accent-ink)"
      >
        {ctaLabel}
      </button>
    </div>
  );
}
