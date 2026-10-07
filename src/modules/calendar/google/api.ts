import type { ExternalEvent } from "../../../db/repositories/externalEventsRepo";
import { getGoogleAccessToken } from "./oauth";

const API_URL = "https://www.googleapis.com/calendar/v3";
export const GOOGLE_PROVIDER = "google";

type GoogleCalendar = {
  id: string;
  summary?: string;
  summaryOverride?: string;
  backgroundColor?: string;
  primary?: boolean;
  /** Marcado na lista "Meus calendários" do Google Calendar. */
  selected?: boolean;
};

type GoogleEventTime = { date?: string; dateTime?: string };

type GoogleEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
  attendees?: { self?: boolean; responseStatus?: string }[];
};

type Page<T> = { items?: T[]; nextPageToken?: string };

async function getAllPages<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const items: T[] = [];
  let pageToken: string | undefined;
  do {
    const accessToken = await getGoogleAccessToken();
    const query = new URLSearchParams({ ...params, ...(pageToken ? { pageToken } : {}) });
    const response = await fetch(`${API_URL}${path}?${query}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Google Calendar respondeu ${response.status}`);
    const page = (await response.json()) as Page<T>;
    items.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}

function toExternalEvent(calendar: GoogleCalendar, event: GoogleEvent): ExternalEvent | null {
  const allDay = Boolean(event.start?.date);
  const start = allDay ? event.start?.date : event.start?.dateTime;
  const end = allDay ? event.end?.date : event.end?.dateTime;
  if (!start || !end || event.status === "cancelled") return null;
  // Convites recusados continuam vindo na lista; não entram na agenda.
  if (event.attendees?.some((attendee) => attendee.self && attendee.responseStatus === "declined")) return null;
  return {
    id: `${GOOGLE_PROVIDER}:${calendar.id}:${event.id}`,
    provider: GOOGLE_PROVIDER,
    calendar_id: calendar.id,
    calendar_name: calendar.summaryOverride ?? calendar.summary ?? null,
    title: event.summary?.trim() || "(Sem título)",
    description: event.description ?? null,
    location: event.location ?? null,
    start_at: allDay ? start : new Date(start).toISOString(),
    end_at: allDay ? end : new Date(end).toISOString(),
    all_day: allDay ? 1 : 0,
    color: calendar.backgroundColor ?? null,
    url: event.htmlLink ?? null,
  };
}

export type GoogleSnapshot = {
  /** Id do calendário principal, que no Google é o e-mail da conta. */
  email: string | null;
  events: ExternalEvent[];
};

/** Eventos de [start, end) nos calendários marcados na conta, com as recorrências já expandidas. */
export async function fetchGoogleEvents(start: Date, end: Date): Promise<GoogleSnapshot> {
  const calendars = await getAllPages<GoogleCalendar>("/users/me/calendarList", { minAccessRole: "reader" });
  const visible = calendars.filter((calendar) => calendar.selected || calendar.primary);
  const perCalendar = await Promise.all(
    visible.map(async (calendar) => {
      const events = await getAllPages<GoogleEvent>(`/calendars/${encodeURIComponent(calendar.id)}/events`, {
        singleEvents: "true",
        orderBy: "startTime",
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        maxResults: "2500",
      });
      return events.flatMap((event) => toExternalEvent(calendar, event) ?? []);
    }),
  );
  return {
    email: calendars.find((calendar) => calendar.primary)?.id ?? null,
    events: perCalendar.flat(),
  };
}
