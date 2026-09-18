import type { ReactNode } from "react";

/** Cabeçalho padrão de um módulo: título + subtítulo opcional de contexto (contagens) + ação à direita. */
export function ModuleHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.5px] text-(--color-ink)">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-(--color-ink-muted)">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
