import { useState } from "react";
import { motion } from "motion/react";
import { Card } from "../../../shared/ui/Card";
import { formatTracked } from "../../../shared/utils/duration";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";
import type { DayBucket } from "../utils/timeStats";

const PLOT_HEIGHT = 132;
/** Escala mínima do eixo: sem ela, um dia com 5 minutos ocuparia a altura toda. */
const MIN_SCALE_SECONDS = 60 * 60;

/** Barras empilhadas por projeto dos últimos 7 dias; o detalhamento do dia aparece ao passar o mouse. */
export function WeekChart({ days }: { days: DayBucket[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = days.reduce((sum, day) => sum + day.total, 0);
  const scale = Math.max(MIN_SCALE_SECONDS, ...days.map((day) => day.total));

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[14px] font-semibold text-(--color-ink)">Últimos 7 dias</h3>
        <span className="text-[13px] font-semibold text-(--color-ink)">{total > 0 ? formatTracked(total) : "0m"}</span>
      </div>

      <div className="flex gap-2" onMouseLeave={() => setHovered(null)}>
        {days.map((day, index) => (
          <div
            key={day.start}
            onMouseEnter={() => setHovered(index)}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <div className="flex w-full flex-col items-center justify-end" style={{ height: PLOT_HEIGHT + 22 }}>
              <span
                className={cn(
                  "mb-1 text-[11px] font-semibold text-(--color-ink) tabular-nums transition-opacity",
                  day.total > 0 && (day.isToday || hovered === index) ? "opacity-100" : "opacity-0",
                )}
              >
                {day.total > 0 ? formatTracked(day.total) : "0m"}
              </span>
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ ...springs.gentle, delay: index * 0.04 }}
                className={cn(
                  "flex w-9 origin-bottom flex-col-reverse gap-0.5 transition-opacity",
                  hovered !== null && hovered !== index && "opacity-45",
                )}
              >
                {day.total === 0 ? (
                  <div className="h-1 rounded-full bg-(--color-track)" />
                ) : (
                  day.slices.map((slice) => (
                    <div
                      key={slice.key}
                      className="min-h-[3px] rounded-[4px]"
                      style={{ height: (slice.seconds / scale) * PLOT_HEIGHT, backgroundColor: slice.color }}
                    />
                  ))
                )}
              </motion.div>
            </div>
            <span
              className={cn(
                "text-[11px]",
                day.isToday ? "font-semibold text-(--color-ink)" : "font-medium text-(--color-ink-muted)",
              )}
            >
              {day.label}
            </span>

            {hovered === index && day.total > 0 && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 flex w-max max-w-[220px] -translate-x-1/2 flex-col gap-1 rounded-xl bg-(--color-surface-elevated) px-3 py-2.5 shadow-[0px_8px_24px_-2px_rgba(0,0,0,0.16)] ring-1 ring-(--color-divider)">
                <span className="text-[11px] font-semibold text-(--color-ink-muted)">
                  {new Date(day.start).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })}
                </span>
                {day.slices.map((slice) => (
                  <span key={slice.key} className="flex items-center gap-2 text-[12px] text-(--color-ink)">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                    <span className="min-w-0 flex-1 truncate">{slice.label}</span>
                    <span className="font-semibold tabular-nums">{formatTracked(slice.seconds)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
