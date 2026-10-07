import { Pause, Play } from "lucide-react";
import { motion } from "motion/react";
import { useTimerStore } from "../../../app/store/useTimerStore";
import { useElapsedSeconds } from "../../../shared/hooks/useElapsedSeconds";
import { formatClock, formatTracked } from "../../../shared/utils/duration";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";

/**
 * Controle de tempo fixo na linha de tarefa: pill com ▶ + tempo acumulado; com o cronômetro
 * rodando nesta tarefa vira a pill laranja com ❚❚ + relógio ao vivo.
 */
export function TaskTimerControl({
  task,
  canStart,
}: {
  task: { id: string; title: string; project_id: string | null };
  /** Falso para tarefas concluídas: mostram o tempo gasto, mas não oferecem iniciar. */
  canStart: boolean;
}) {
  const startedAt = useTimerStore((s) => (s.running?.taskId === task.id ? s.running.startedAt : null));
  const tracked = useTimerStore((s) => s.totals[task.id] ?? 0);
  const start = useTimerStore((s) => s.start);
  const stop = useTimerStore((s) => s.stop);
  const hasLabel = startedAt !== null || tracked > 0;

  return (
    <div className="flex h-6 w-[88px] shrink-0 items-center justify-end">
      {!startedAt && !canStart ? (
        tracked > 0 && (
          <span className="pr-2.5 text-[11px] font-medium text-(--color-ink-muted)">{formatTracked(tracked)}</span>
        )
      ) : (
        <motion.button
          type="button"
          whileHover={{ scale: 1.04, transition: springs.snappy }}
          whileTap={{ scale: 0.94, transition: springs.snappy }}
          onClick={(e) => {
            e.stopPropagation();
            if (startedAt) stop();
            else start(task);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className={cn(
            "flex items-center gap-1.5 rounded-full p-[3px] text-[11px] font-semibold whitespace-nowrap transition-colors",
            hasLabel && "pr-2.5",
            startedAt ? "bg-(--color-accent) text-(--color-accent-ink)" : "bg-(--color-fill) text-(--color-ink)",
          )}
          title={startedAt ? "Pausar cronômetro" : "Iniciar cronômetro nesta tarefa"}
        >
          <span
            className={cn(
              "flex size-[18px] items-center justify-center rounded-full transition-colors",
              startedAt ? "bg-(--color-accent-ink) text-white" : "bg-(--color-surface-elevated) text-(--color-ink)",
            )}
          >
            {startedAt ? (
              <Pause className="size-2 fill-current" strokeWidth={0} />
            ) : (
              <Play className="size-2 translate-x-px fill-current" strokeWidth={0} />
            )}
          </span>
          {startedAt ? <LiveClock startedAt={startedAt} /> : tracked > 0 && formatTracked(tracked)}
        </motion.button>
      )}
    </div>
  );
}

/** Isolado para que só o relógio re-renderize a cada segundo, não a linha inteira. */
function LiveClock({ startedAt }: { startedAt: string }) {
  const elapsed = useElapsedSeconds(startedAt);
  return <span className="tabular-nums">{formatClock(elapsed)}</span>;
}
