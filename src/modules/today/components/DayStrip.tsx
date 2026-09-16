import { cn } from "../../../shared/utils/cn";

const WEEKDAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function DayStrip({ today }: { today: Date }) {
  const start = startOfWeek(today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  return (
    <div className="flex items-start gap-2">
      {days.map((day) => {
        const isToday = day.toDateString() === today.toDateString();
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 rounded-[14px] px-1 py-2.5",
              isToday ? "bg-(--color-accent) text-white" : "text-(--color-ink)",
            )}
          >
            <span className={cn("text-[11px] font-medium", !isToday && "text-(--color-ink-muted)")}>
              {WEEKDAY_LETTERS[day.getDay()]}
            </span>
            <span className="text-[16px] font-semibold">{day.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}
