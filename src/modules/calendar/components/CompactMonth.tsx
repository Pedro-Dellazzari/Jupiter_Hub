import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ExternalEvent } from "../../../db/repositories/externalEventsRepo";
import { Card } from "../../../shared/ui/Card";
import { cn } from "../../../shared/utils/cn";
import { formatIsoDate } from "../../../shared/utils/date";
import { eventTimeLabel, eventTimeRangeLabel } from "../utils/events";

const WEEKDAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];
const FALLBACK_EVENT_COLOR = "#4285f4";

function dayHeading(day: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(day);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Calendário do celular: mês em grade compacta (número + ponto quando há evento) e,
 * embaixo, a agenda do dia tocado. No desktop cada célula já lista os eventos.
 */
export function CompactMonth({
  weeks,
  viewedMonth,
  monthLabel,
  selectedDay,
  eventsByDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onOpenEvent,
}: {
  weeks: Date[][];
  viewedMonth: Date;
  monthLabel: string;
  selectedDay: Date;
  eventsByDay: Map<string, ExternalEvent[]>;
  onSelectDay: (day: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenEvent: (day: Date) => void;
}) {
  const today = new Date();
  const selectedEvents = eventsByDay.get(formatIsoDate(selectedDay)) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-1 p-3.5">
        <div className="mb-1 flex items-center justify-between px-1.5">
          <span className="text-[16px] font-semibold text-(--color-ink)">{monthLabel}</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onPrevMonth} className="p-1.5 text-(--color-ink-muted)" aria-label="Mês anterior">
              <ChevronLeft className="size-4" strokeWidth={2} />
            </button>
            <button type="button" onClick={onNextMonth} className="p-1.5 text-(--color-ink-muted)" aria-label="Próximo mês">
              <ChevronRight className="size-4" strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7">
          {WEEKDAY_LETTERS.map((letter, i) => (
            <span key={i} className="py-1 text-center text-[11px] font-medium text-(--color-ink-muted)/70">
              {letter}
            </span>
          ))}
        </div>
        {weeks.map((week, i) => (
          <div key={i} className="grid grid-cols-7">
            {week.map((day) => {
              const iso = formatIsoDate(day);
              const isCurrentMonth = day.getMonth() === viewedMonth.getMonth();
              const isToday = day.toDateString() === today.toDateString();
              const isSelected = iso === formatIsoDate(selectedDay);
              const hasEvents = (eventsByDay.get(iso)?.length ?? 0) > 0;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className="flex h-11 flex-col items-center justify-center gap-0.5"
                >
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full text-[15px]",
                      isSelected
                        ? "bg-(--color-accent) font-semibold text-(--color-accent-ink)"
                        : isToday
                          ? "font-semibold text-(--color-accent-text)"
                          : isCurrentMonth
                            ? "text-(--color-ink)"
                            : "text-(--color-ink-muted)/45",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <span className={cn("size-1 rounded-full", hasEvents && !isSelected ? "bg-(--color-accent)" : "bg-transparent")} />
                </button>
              );
            })}
          </div>
        ))}
      </Card>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold text-(--color-ink)">{dayHeading(selectedDay)}</h2>
          <span className="text-[13px] text-(--color-ink-muted)">
            {selectedEvents.length === 1 ? "1 evento" : `${selectedEvents.length} eventos`}
          </span>
        </div>
        {selectedEvents.length === 0 ? (
          <Card className="px-4 py-5 text-center text-[14px] text-(--color-ink-muted)">Nada agendado neste dia.</Card>
        ) : (
          <Card className="flex flex-col divide-y divide-(--color-divider)">
            {selectedEvents.map((event) => {
              const color = event.color ?? FALLBACK_EVENT_COLOR;
              const range = eventTimeRangeLabel(event);
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onOpenEvent(selectedDay)}
                  className="flex items-stretch gap-3 px-4 py-3 text-left"
                >
                  <span className="w-11 shrink-0 text-[13px] text-(--color-ink-muted) tabular-nums">
                    {event.all_day ? "—" : eventTimeLabel(event)}
                  </span>
                  <span className="w-[3px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-(--color-ink)">{event.title}</span>
                    <span className="block truncate text-[12px] text-(--color-ink-muted)">
                      {[range, event.calendar_name].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
