import ICAL from "ical.js";
import type { ExternalEvent } from "../../../db/repositories/externalEventsRepo";
import { formatIsoDate } from "../../../shared/utils/date";

/** Teto de ocorrências percorridas por evento recorrente (um diário de muitos anos fica bem abaixo disso). */
const MAX_OCCURRENCES = 20_000;
const MOVED_OCCURRENCE_MARGIN_MS = 7 * 86_400_000;

export type IcsSource = { provider: string; calendarName: string; color: string };

export class IcsParseError extends Error {}

/** Lê o texto de um .ics. Lança `IcsParseError` se não for um calendário. */
export function parseCalendar(text: string): ICAL.Component {
  let root: ICAL.Component;
  try {
    root = new ICAL.Component(ICAL.parse(text));
  } catch {
    throw new IcsParseError("O endereço não devolveu um calendário iCal válido.");
  }
  if (root.name !== "vcalendar") throw new IcsParseError("O endereço não devolveu um calendário iCal válido.");
  // Os fusos vêm definidos no próprio arquivo (o Outlook usa nomes do Windows, que só existem ali).
  for (const timezone of root.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(timezone);
  return root;
}

/** Nome que o calendário declara para si (X-WR-CALNAME), se houver. */
export function calendarName(root: ICAL.Component): string | null {
  const name = root.getFirstPropertyValue("x-wr-calname");
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function isoDay(time: ICAL.Time) {
  return `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
}

function toExternalEvent(
  source: IcsSource,
  item: ICAL.Event,
  start: ICAL.Time,
  end: ICAL.Time,
  rangeStart: Date,
  rangeEnd: Date,
): ExternalEvent | null {
  if (item.component.getFirstPropertyValue("status") === "CANCELLED") return null;

  let startAt: string;
  let endAt: string;
  if (start.isDate) {
    startAt = isoDay(start);
    endAt = isoDay(end);
    // Dia inteiro sem DTEND (ou com DTEND igual ao início) dura um dia; o fim é exclusivo.
    if (endAt <= startAt) {
      const next = start.clone();
      next.adjust(1, 0, 0, 0);
      endAt = isoDay(next);
    }
    if (startAt >= formatIsoDate(rangeEnd) || endAt <= formatIsoDate(rangeStart)) return null;
  } else {
    const startDate = start.toJSDate();
    const endDate = end.toJSDate();
    if (startDate >= rangeEnd || (endDate <= rangeStart && startDate < rangeStart)) return null;
    startAt = startDate.toISOString();
    endAt = (endDate < startDate ? startDate : endDate).toISOString();
  }

  return {
    id: `${source.provider}:${item.uid}:${startAt}`,
    provider: source.provider,
    calendar_id: source.provider,
    calendar_name: source.calendarName,
    title: item.summary?.trim() || "(Sem título)",
    description: item.description || null,
    location: item.location || null,
    start_at: startAt,
    end_at: endAt,
    all_day: start.isDate ? 1 : 0,
    color: source.color,
    url: null,
  };
}

/** Eventos de [rangeStart, rangeEnd), com as recorrências expandidas e as exceções aplicadas. */
export function expandEvents(
  root: ICAL.Component,
  source: IcsSource,
  rangeStart: Date,
  rangeEnd: Date,
): ExternalEvent[] {
  const masters = new Map<string, ICAL.Event>();
  const exceptions: ICAL.Event[] = [];
  for (const component of root.getAllSubcomponents("vevent")) {
    const event = new ICAL.Event(component);
    if (!event.startDate) continue;
    if (event.isRecurrenceException()) exceptions.push(event);
    else masters.set(event.uid, event);
  }

  const events: ExternalEvent[] = [];
  const push = (event: ExternalEvent | null) => {
    if (event) events.push(event);
  };

  for (const exception of exceptions) {
    const master = masters.get(exception.uid);
    if (master) master.relateException(exception);
    // Exceção sem a série original no arquivo: entra como evento avulso.
    else push(toExternalEvent(source, exception, exception.startDate, exception.endDate, rangeStart, rangeEnd));
  }

  for (const master of masters.values()) {
    if (!master.isRecurring()) {
      push(toExternalEvent(source, master, master.startDate, master.endDate, rangeStart, rangeEnd));
      continue;
    }
    const iterator = master.iterator();
    for (let count = 0; count < MAX_OCCURRENCES; count++) {
      const next = iterator.next();
      if (!next) break;
      // As ocorrências vêm em ordem: passou do fim do intervalo, acabou. A folga cobre uma
      // ocorrência remarcada para alguns dias antes da data original.
      if (next.toJSDate().getTime() >= rangeEnd.getTime() + MOVED_OCCURRENCE_MARGIN_MS) break;
      const occurrence = master.getOccurrenceDetails(next);
      push(toExternalEvent(source, occurrence.item, occurrence.startDate, occurrence.endDate, rangeStart, rangeEnd));
    }
  }
  return events;
}
