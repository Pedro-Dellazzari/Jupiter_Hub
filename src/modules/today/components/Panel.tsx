import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "../../../shared/ui/Card";

export function Panel({
  title,
  trailing,
  children,
  className,
}: {
  title: string;
  /** Texto discreto à direita do título (ex.: "2/3 concluídas"). */
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col gap-2.5 p-4.5 ${className ?? ""}`}>
      <div className="flex items-baseline gap-2">
        <p className="min-w-0 flex-1 text-[14px] font-semibold text-(--color-ink)">{title}</p>
        {trailing && <span className="shrink-0 text-[12px] font-medium text-(--color-ink-muted)">{trailing}</span>}
      </div>
      {children}
    </Card>
  );
}

export function MiniEmpty({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-1.5 py-3.5">
      <div className="flex size-8 items-center justify-center rounded-[9px] bg-(--color-fill)">
        <Icon className="size-3.5 text-(--color-ink-muted)/70" strokeWidth={1.75} />
      </div>
      <p className="text-[12px] font-medium text-(--color-ink-muted)/70">{label}</p>
    </div>
  );
}
