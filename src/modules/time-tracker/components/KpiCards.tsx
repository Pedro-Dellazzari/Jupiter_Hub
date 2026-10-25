import type { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card } from "../../../shared/ui/Card";
import { formatTracked } from "../../../shared/utils/duration";
import { cn } from "../../../shared/utils/cn";
import { DAY_MS, longestSession, totalIn, type DayBucket, type Session } from "../utils/timeStats";

/** Diferença contra o período anterior, com seta e rótulo — a direção nunca depende só da cor. */
function Delta({ current, previous, versus }: { current: number; previous: number; versus: string }) {
  const diff = current - previous;
  if (previous === 0 || Math.abs(diff) < 60) {
    return <span>{previous === 0 ? `sem registro ${versus}` : `igual a ${versus}`}</span>;
  }
  const Icon = diff > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={cn("flex items-center gap-1 font-medium", diff > 0 && "text-[#1f8a5b]")}>
      <Icon className="size-3 shrink-0" strokeWidth={2.5} />
      <span className="truncate">
        {formatTracked(Math.abs(diff))} vs. {versus}
      </span>
    </span>
  );
}

function Kpi({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-1.5 px-[18px] py-4">
      <span className="text-[12px] font-medium text-(--color-ink-muted)">{label}</span>
      <span className="text-[24px] leading-none font-bold tracking-[-0.5px] text-(--color-ink)">{value}</span>
      <div className="truncate text-[12px] text-(--color-ink-muted)">{children}</div>
    </Card>
  );
}

export function KpiCards({
  sessions,
  week,
  todayStart,
}: {
  sessions: Session[];
  /** Os últimos 7 dias, terminando hoje. */
  week: DayBucket[];
  todayStart: number;
}) {
  const tomorrow = todayStart + DAY_MS;
  const today = week[week.length - 1].total;
  const yesterday = week[week.length - 2].total;
  const weekTotal = week.reduce((sum, day) => sum + day.total, 0);
  const previousWeek = totalIn(sessions, todayStart - 13 * DAY_MS, todayStart - 6 * DAY_MS);
  const activeDays = week.filter((day) => day.total > 0).length;
  const longest = longestSession(sessions, todayStart - 6 * DAY_MS, tomorrow);

  return (
    <div className="flex gap-4 compact:grid compact:grid-cols-2 compact:gap-3">
      <Kpi label="Hoje" value={today > 0 ? formatTracked(today) : "0m"}>
        <Delta current={today} previous={yesterday} versus="ontem" />
      </Kpi>
      <Kpi label="Últimos 7 dias" value={weekTotal > 0 ? formatTracked(weekTotal) : "0m"}>
        <Delta current={weekTotal} previous={previousWeek} versus="7 dias anteriores" />
      </Kpi>
      <Kpi label="Média por dia" value={weekTotal > 0 ? formatTracked(Math.round(weekTotal / 7)) : "0m"}>
        {activeDays} de 7 dias com registro
      </Kpi>
      <Kpi
        label="Foco mais longo"
        value={longest ? formatTracked(Math.round((longest.end - longest.start) / 1000)) : "—"}
      >
        {longest ? (
          <span className={cn(longest.running && "font-medium text-(--color-accent-text)")}>
            {longest.taskTitle}
            {longest.running && " · agora"}
          </span>
        ) : (
          "nos últimos 7 dias"
        )}
      </Kpi>
    </div>
  );
}
