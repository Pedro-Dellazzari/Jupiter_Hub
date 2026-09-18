import { Repeat } from "lucide-react";
import { motion } from "motion/react";
import type { Habit } from "../../../db/repositories/habitsRepo";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";
import type { WeekDay } from "../utils/habitStats";

const FREQUENCY_LABEL: Record<string, string> = { daily: "Diário", weekly: "Semanal" };

export function HabitCard({
  habit,
  streak,
  week,
  onToggleDay,
}: {
  habit: Habit;
  streak: number;
  week: WeekDay[];
  onToggleDay: (date: string) => void;
}) {
  const accent = habit.color ?? "#007aff";

  return (
    <div className="flex items-center gap-3.5 rounded-[14px] bg-(--color-surface-elevated) px-[18px] py-4 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)` }}
      >
        <Repeat className="size-4" style={{ color: accent }} strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-(--color-ink)">{habit.name}</p>
        <p className="text-[12px] text-(--color-ink-muted)">
          {FREQUENCY_LABEL[habit.frequency_type] ?? habit.frequency_type}
          {streak > 0 && ` · sequência de ${streak} ${streak === 1 ? "dia" : "dias"}`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {week.map((day) => (
          <motion.button
            key={day.date}
            type="button"
            disabled={day.isFuture}
            onClick={() => onToggleDay(day.date)}
            whileHover={day.isFuture ? undefined : { scale: 1.12, transition: springs.snappy }}
            whileTap={day.isFuture ? undefined : { scale: 0.88, transition: springs.snappy }}
            className={cn("size-[22px] rounded-full", day.isFuture && "cursor-default opacity-40")}
            style={{ backgroundColor: day.done ? accent : "var(--color-track)" }}
            title={day.date}
          />
        ))}
      </div>
    </div>
  );
}
