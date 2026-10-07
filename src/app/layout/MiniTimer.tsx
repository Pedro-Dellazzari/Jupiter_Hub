import { useEffect } from "react";
import { Pause } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTimerStore, type RunningTimer } from "../store/useTimerStore";
import { useSyncStore } from "../../sync/useSyncStore";
import { useElapsedSeconds } from "../../shared/hooks/useElapsedSeconds";
import { formatClock } from "../../shared/utils/duration";
import { springs } from "../../shared/motion/springs";

/** Cronômetro em andamento, visível na sidebar em qualquer módulo (o tempo segue contando em segundo plano). */
export function MiniTimer() {
  const running = useTimerStore((s) => s.running);
  const load = useTimerStore((s) => s.load);
  const dataVersion = useSyncStore((s) => s.dataVersion);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load, dataVersion]);

  return (
    <AnimatePresence initial={false}>
      {running && (
        <motion.div
          key="mini-timer"
          initial={{ opacity: 0, y: 8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: 8, height: 0 }}
          transition={springs.standard}
          className="shrink-0 overflow-hidden"
        >
          <MiniTimerCard running={running} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MiniTimerCard({ running }: { running: RunningTimer }) {
  const stop = useTimerStore((s) => s.stop);
  const elapsed = useElapsedSeconds(running.startedAt);

  return (
    <div className="flex items-center gap-2 rounded-xl bg-(--color-ink) py-2.5 pr-2.5 pl-3 text-(--color-surface-elevated)">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[16px] leading-none font-bold tabular-nums">{formatClock(elapsed)}</span>
        <span className="truncate text-[11px] opacity-70">{running.taskTitle}</span>
      </div>
      <motion.button
        type="button"
        onClick={() => stop()}
        whileHover={{ scale: 1.08, transition: springs.snappy }}
        whileTap={{ scale: 0.9, transition: springs.snappy }}
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-(--color-accent) text-(--color-accent-ink)"
        title="Pausar cronômetro"
      >
        <Pause className="size-3 fill-current" strokeWidth={0} />
      </motion.button>
    </div>
  );
}
