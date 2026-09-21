import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../../shared/utils/cn";
import { springs } from "../../../shared/motion/springs";
import { formatIsoDate, startOfDay } from "../../../shared/utils/date";

const WEEKDAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

type DayStripProps = {
  today: Date;
  selected: Date;
  /** Datas ISO (`YYYY-MM-DD`) que têm tarefas — ganham um ponto embaixo do dia. */
  markedDates: Set<string>;
  onSelect: (date: Date) => void;
};

export function DayStrip({ today, selected, markedDates, onSelect }: DayStripProps) {
  const start = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const todayIso = formatIsoDate(today);
  const selectedIso = formatIsoDate(selected);

  function shiftWeek(delta: number) {
    const next = startOfDay(selected);
    next.setDate(next.getDate() + delta * 7);
    onSelect(next);
  }

  return (
    <div className="flex items-center gap-1.5">
      <motion.button
        type="button"
        onClick={() => shiftWeek(-1)}
        title="Semana anterior"
        whileTap={{ scale: 0.85 }}
        transition={springs.snappy}
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)"
      >
        <ChevronLeft className="size-4" strokeWidth={2} />
      </motion.button>

      <div className="flex flex-1 items-start gap-2">
        {days.map((day, i) => {
          const iso = formatIsoDate(day);
          const isSelected = iso === selectedIso;
          const isToday = iso === todayIso;
          return (
            // Key por posição (e não por data): os botões persistem ao trocar de semana e o destaque só desliza.
            <motion.button
              type="button"
              key={i}
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              title={isToday ? "Hoje" : undefined}
              whileTap={{ scale: 0.93 }}
              transition={springs.snappy}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[14px] px-1 py-2.5 transition-colors duration-200",
                isSelected ? "text-(--color-accent-ink)" : "text-(--color-ink) hover:bg-(--color-fill)",
                !isSelected && isToday && "ring-1 ring-(--color-accent)/50",
              )}
            >
              {isSelected && (
                <motion.span
                  layoutId="day-selected"
                  transition={springs.standard}
                  className="absolute inset-0 rounded-[14px] bg-(--color-accent)"
                />
              )}
              <span
                className={cn(
                  "relative z-10 text-[11px] font-medium transition-colors duration-200",
                  !isSelected && (isToday ? "text-(--color-accent-text)" : "text-(--color-ink-muted)"),
                )}
              >
                {WEEKDAY_LETTERS[day.getDay()]}
              </span>
              <motion.span
                key={iso}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springs.gentle}
                className="relative z-10 text-[16px] font-semibold"
              >
                {day.getDate()}
              </motion.span>
              <span
                className={cn(
                  "relative z-10 size-1 rounded-full transition-colors duration-200",
                  markedDates.has(iso)
                    ? isSelected
                      ? "bg-(--color-accent-ink)"
                      : "bg-(--color-accent)"
                    : "bg-transparent",
                )}
              />
            </motion.button>
          );
        })}
      </div>

      <motion.button
        type="button"
        onClick={() => shiftWeek(1)}
        title="Próxima semana"
        whileTap={{ scale: 0.85 }}
        transition={springs.snappy}
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)"
      >
        <ChevronRight className="size-4" strokeWidth={2} />
      </motion.button>
    </div>
  );
}
