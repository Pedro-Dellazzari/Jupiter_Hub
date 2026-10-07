import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, MapPin } from "lucide-react";
import type { ExternalEvent } from "../../../db/repositories/externalEventsRepo";
import { Dialog } from "../../../shared/ui/Dialog";
import { eventTimeRangeLabel } from "../utils/events";

const FALLBACK_COLOR = "#4285f4";

function dayTitle(day: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(day);
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

/** Eventos de um dia, com hora, local e atalho para abrir no Google Calendar. */
export function DayEventsDialog({
  day,
  events,
  onOpenChange,
}: {
  day: Date | null;
  events: ExternalEvent[];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={day !== null}
      onOpenChange={onOpenChange}
      title={day ? dayTitle(day) : ""}
      description={events.length === 0 ? "Nada agendado neste dia." : undefined}
    >
      <div className="-mr-2 flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto pr-2">
        {events.map((event) => (
          <div key={event.id} className="flex gap-3 rounded-xl bg-(--color-fill) px-3.5 py-3">
            <span
              className="mt-1 size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: event.color ?? FALLBACK_COLOR }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-[13px] font-semibold break-words text-(--color-ink)">{event.title}</p>
              <p className="text-[12px] text-(--color-ink-muted)">
                {eventTimeRangeLabel(event)}
                {event.calendar_name && ` · ${event.calendar_name}`}
              </p>
              {event.location && (
                <p className="flex items-center gap-1 text-[12px] text-(--color-ink-muted)">
                  <MapPin className="size-3 shrink-0" strokeWidth={2} />
                  <span className="truncate">{event.location}</span>
                </p>
              )}
            </div>
            {event.url && (
              <button
                onClick={() => void openUrl(event.url!)}
                title="Abrir no Google Calendar"
                className="shrink-0 self-start text-(--color-ink-muted) hover:text-(--color-ink)"
              >
                <ExternalLink className="size-3.5" strokeWidth={2} />
              </button>
            )}
          </div>
        ))}
      </div>
    </Dialog>
  );
}
