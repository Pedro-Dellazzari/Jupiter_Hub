import { useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Card } from "../../shared/ui/Card";
import { cn } from "../../shared/utils/cn";
import { formatIsoDate } from "../../shared/utils/date";
import { DayEventsDialog } from "./components/DayEventsDialog";
import { CalendarSourcesDialog } from "./components/CalendarSourcesDialog";
import { useCalendarStore } from "./useCalendarStore";
import { useExternalEvents } from "./useExternalEvents";
import { eventTimeLabel, groupEventsByDay } from "./utils/events";

const WEEKDAY_HEADERS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
/** Linhas de evento que cabem numa célula; passando disso, a última vira "+N mais". */
const MAX_EVENT_LINES = 3;
const FALLBACK_EVENT_COLOR = "#4285f4";

function monthLabel(date: Date) {
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date);
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
}

function buildWeeks(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - start.getDay());

  const lastOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const end = new Date(lastOfMonth);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export default function CalendarModule() {
  const [viewedMonth, setViewedMonth] = useState(() => new Date());
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const today = new Date();

  const ready = useCalendarStore((s) => s.ready);
  const sourceCount = useCalendarStore((s) => (s.account ? 1 : 0) + s.feeds.length);
  const syncing = useCalendarStore((s) => s.syncing);
  const syncRange = useCalendarStore((s) => s.syncRange);

  const weeks = useMemo(() => buildWeeks(viewedMonth), [viewedMonth]);
  // Intervalo da grade inteira (inclui os dias dos meses vizinhos), fim exclusivo.
  const [gridStart, gridEnd] = useMemo(() => {
    const end = new Date(weeks[weeks.length - 1][6]);
    end.setDate(end.getDate() + 1);
    return [weeks[0][0], end];
  }, [weeks]);
  const events = useExternalEvents(gridStart, gridEnd);
  const eventsByDay = useMemo(() => groupEventsByDay(events, gridStart, gridEnd), [events, gridStart, gridEnd]);
  const selectedEvents = selectedDay ? (eventsByDay.get(formatIsoDate(selectedDay)) ?? []) : [];

  const syncNow = () => void syncRange(gridStart, gridEnd, { force: true });

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-(--color-ink)">Calendário</h1>
          <div className="flex items-center gap-2 text-[14px]">
            <button
              onClick={() => setViewedMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="text-(--color-ink-muted) hover:text-(--color-ink)"
            >
              <ChevronLeft className="size-4" strokeWidth={2} />
            </button>
            <span className="font-semibold text-(--color-ink)">{monthLabel(viewedMonth)}</span>
            <button
              onClick={() => setViewedMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="text-(--color-ink-muted) hover:text-(--color-ink)"
            >
              <ChevronRight className="size-4" strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1" />
          {sourceCount > 0 && (
            <button
              onClick={syncNow}
              disabled={syncing}
              title="Sincronizar agora"
              className="text-(--color-ink-muted) hover:text-(--color-ink) disabled:hover:text-(--color-ink-muted)"
            >
              <RefreshCw className={cn("size-4", syncing && "animate-spin")} strokeWidth={2} />
            </button>
          )}
          {ready && (
            <button
              onClick={() => setSourcesOpen(true)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold",
                sourceCount > 0
                  ? "bg-(--color-fill) text-(--color-ink)"
                  : "bg-(--color-accent) text-(--color-accent-ink)",
              )}
            >
              <CalendarPlus className="size-3.5" strokeWidth={2} />
              {sourceCount > 0 ? `Calendários · ${sourceCount}` : "Conectar calendário"}
            </button>
          )}
        </div>

        <Card className="flex flex-col gap-1.5 p-4.5">
          <div className="flex items-start gap-1.5">
            {WEEKDAY_HEADERS.map((h) => (
              <div key={h} className="flex flex-1 items-start justify-center py-1">
                <span className="text-[11px] font-semibold text-(--color-ink-muted)/70">{h}</span>
              </div>
            ))}
          </div>
          {weeks.map((week, i) => (
            <div key={i} className="flex items-start gap-1.5">
              {week.map((day) => {
                const isCurrentMonth = day.getMonth() === viewedMonth.getMonth();
                const isToday = day.toDateString() === today.toDateString();
                const dayEvents = eventsByDay.get(formatIsoDate(day)) ?? [];
                const shown =
                  dayEvents.length > MAX_EVENT_LINES ? dayEvents.slice(0, MAX_EVENT_LINES - 1) : dayEvents;
                return (
                  <button
                    type="button"
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "flex h-[104px] min-w-0 flex-1 flex-col items-stretch gap-1 rounded-[10px] p-2 text-left transition-colors",
                      isToday ? "bg-(--color-accent)/12" : "hover:bg-(--color-fill)",
                    )}
                  >
                    {isToday ? (
                      <span className="flex size-[22px] items-center justify-center rounded-full bg-(--color-accent) text-[12px] font-semibold text-(--color-accent-ink)">
                        {day.getDate()}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "text-[12px] font-medium",
                          isCurrentMonth ? "text-(--color-ink)" : "text-(--color-ink-muted)/50",
                        )}
                      >
                        {day.getDate()}
                      </span>
                    )}
                    <div className={cn("flex min-w-0 flex-col gap-0.5", !isCurrentMonth && "opacity-50")}>
                      {shown.map((event) => {
                        const color = event.color ?? FALLBACK_EVENT_COLOR;
                        return event.all_day ? (
                          <span
                            key={event.id}
                            className="truncate rounded-[5px] px-1.5 text-[11px] leading-[17px] font-medium text-(--color-ink)"
                            style={{ backgroundColor: `color-mix(in srgb, ${color} 24%, transparent)` }}
                          >
                            {event.title}
                          </span>
                        ) : (
                          <span
                            key={event.id}
                            className="flex min-w-0 items-center gap-1 text-[11px] leading-[17px] text-(--color-ink)"
                          >
                            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                            <span className="shrink-0 text-(--color-ink-muted)">{eventTimeLabel(event)}</span>
                            <span className="truncate font-medium">{event.title}</span>
                          </span>
                        );
                      })}
                      {dayEvents.length > shown.length && (
                        <span className="px-1.5 text-[11px] leading-[17px] font-medium text-(--color-ink-muted)">
                          +{dayEvents.length - shown.length} mais
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </Card>
      </div>

      <CalendarSourcesDialog open={sourcesOpen} onOpenChange={setSourcesOpen} onSync={syncNow} />
      <DayEventsDialog
        day={selectedDay}
        events={selectedEvents}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      />
    </div>
  );
}
