import { motion } from "motion/react";
import { Card } from "../../../shared/ui/Card";
import { formatTracked } from "../../../shared/utils/duration";
import { springs } from "../../../shared/motion/springs";
import type { Slice } from "../utils/timeStats";

const SIZE = 156;
const STROKE = 15;
const RADIUS = (SIZE - STROKE) / 2;
/** Folga entre fatias, em % do anel — separa projetos vizinhos sem depender da cor. */
const GAP = 1.2;

/** Donut + lista do tempo por projeto no período. A lista é a legenda: nome, tempo e participação. */
export function ProjectBreakdown({
  title,
  caption,
  slices,
}: {
  title: string;
  /** Rótulo do período dentro do donut ("hoje", "em 7 dias"...). */
  caption: string;
  slices: Slice[];
}) {
  const total = slices.reduce((sum, slice) => sum + slice.seconds, 0);
  const gap = slices.length > 1 ? GAP : 0;
  let offset = 0;

  return (
    <Card className="flex flex-col gap-5 p-5">
      <h3 className="text-[14px] font-semibold text-(--color-ink)">{title}</h3>

      <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-track)" strokeWidth={STROKE} />
          {slices.map((slice) => {
            const share = (slice.seconds / total) * 100;
            const length = Math.max(0.5, share - gap);
            const start = offset + gap / 2;
            offset += share;
            return (
              <motion.circle
                key={slice.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={STROKE}
                pathLength={100}
                strokeDashoffset={-start}
                initial={{ strokeDasharray: "0 100" }}
                animate={{ strokeDasharray: `${length} ${100 - length}` }}
                transition={springs.gentle}
              >
                <title>{`${slice.label}: ${formatTracked(slice.seconds)}`}</title>
              </motion.circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] leading-tight font-bold tracking-[-0.4px] text-(--color-ink)">
            {total > 0 ? formatTracked(total) : "0m"}
          </span>
          <span className="text-[12px] text-(--color-ink-muted)">{caption}</span>
        </div>
      </div>

      {slices.length === 0 ? (
        <p className="text-center text-[13px] text-(--color-ink-muted)">Nenhum tempo registrado neste período.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {slices.map((slice) => {
            const share = slice.seconds / total;
            return (
              <div key={slice.key} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-(--color-ink)">{slice.label}</span>
                  <span className="shrink-0 text-[12px] font-semibold text-(--color-ink-muted) tabular-nums">
                    {formatTracked(slice.seconds)} · {Math.round(share * 100)}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-(--color-track)">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${share * 100}%` }}
                    transition={springs.gentle}
                    className="h-full rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
