import type { ExternalEvent } from "../../../db/repositories/externalEventsRepo";
import { formatIsoDate, parseIsoDate, startOfDay } from "../../../shared/utils/date";

const timeFormat = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Hora local de início ("09:00"); vazio para eventos de dia inteiro. */
export function eventTimeLabel(event: ExternalEvent): string {
  return event.all_day ? "" : timeFormat.format(new Date(event.start_at));
}

/** "09:00 – 10:30" ou "Dia inteiro". */
export function eventTimeRangeLabel(event: ExternalEvent): string {
  if (event.all_day) return "Dia inteiro";
  return `${timeFormat.format(new Date(event.start_at))} – ${timeFormat.format(new Date(event.end_at))}`;
}

/**
 * Filtro de títulos a ocultar. Cada termo casa como palavra inteira, sem diferenciar maiúsculas:
 * "OOO" esconde "OoO - Ana" e "Ana (ooo)", mas não uma palavra que só contenha essas letras.
 */
export function buildHiddenTitleMatcher(keywords: string[]): (title: string) => boolean {
  const terms = keywords.map((keyword) => keyword.trim()).filter(Boolean);
  if (terms.length === 0) return () => false;
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${escaped.join("|")})(?![\\p{L}\\p{N}])`, "iu");
  return (title) => pattern.test(title);
}

/** Primeiro e último dia (locais, inclusivos) que o evento ocupa. */
function eventDaySpan(event: ExternalEvent): [Date, Date] {
  if (event.all_day) {
    const first = parseIsoDate(event.start_at);
    const last = parseIsoDate(event.end_at);
    last.setDate(last.getDate() - 1);
    return [first, last < first ? first : last];
  }
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  // Terminar à meia-noite não ocupa o dia seguinte.
  const last = end > start ? new Date(end.getTime() - 1) : start;
  return [startOfDay(start), startOfDay(last)];
}

/** Eventos por dia ("YYYY-MM-DD"), dentro de [start, end); um evento de vários dias entra em cada um. */
export function groupEventsByDay(events: ExternalEvent[], start: Date, end: Date): Map<string, ExternalEvent[]> {
  const byDay = new Map<string, ExternalEvent[]>();
  for (const event of events) {
    const [first, last] = eventDaySpan(event);
    const day = new Date(Math.max(first.getTime(), startOfDay(start).getTime()));
    for (; day <= last && day < end; day.setDate(day.getDate() + 1)) {
      const key = formatIsoDate(day);
      const list = byDay.get(key);
      if (list) list.push(event);
      else byDay.set(key, [event]);
    }
  }
  return byDay;
}
