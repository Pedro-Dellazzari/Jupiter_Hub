import { invoke } from "@tauri-apps/api/core";
import type ICAL from "ical.js";
import type { ExternalEvent } from "../../../db/repositories/externalEventsRepo";
import { settingsRepo } from "../../../db/repositories/settingsRepo";
import { calendarName, expandEvents, IcsParseError, parseCalendar } from "./parse";

/** Assinatura de calendário por link iCal (.ics) — somente leitura. Ex.: calendário publicado do Outlook. */
export type IcsFeed = { id: string; name: string; url: string; color: string };

/**
 * As assinaturas ficam em `app_settings`: só neste dispositivo, fora do sync. O link é secreto
 * (quem tem o endereço lê a agenda), então não vai para o Supabase.
 */
const FEEDS_KEY = "ics.feeds";
/** O arquivo traz a agenda inteira: trocar de mês reaproveita o download por este tempo. */
const DOWNLOAD_TTL_MS = 5 * 60_000;
const DOWNLOAD_TIMEOUT_MS = 45_000;
const FEED_COLORS = ["#0078d4", "#8e24aa", "#0b8043", "#f4511e", "#d50000"];

export class IcsFeedError extends Error {}

export const icsProvider = (feedId: string) => `ics:${feedId}`;

export function nextFeedColor(feeds: IcsFeed[]) {
  return FEED_COLORS[feeds.length % FEED_COLORS.length];
}

export async function loadFeeds(): Promise<IcsFeed[]> {
  try {
    const parsed: unknown = JSON.parse((await settingsRepo.get(FEEDS_KEY)) || "[]");
    return Array.isArray(parsed) ? (parsed as IcsFeed[]) : [];
  } catch {
    return [];
  }
}

export function saveFeeds(feeds: IcsFeed[]) {
  return settingsRepo.set(FEEDS_KEY, JSON.stringify(feeds));
}

/** Aceita o link como o Outlook/Google mostram, inclusive com o esquema webcal://. */
export function normalizeFeedUrl(input: string): string {
  const url = input.trim().replace(/^webcals?:\/\//i, "https://");
  if (!/^https:\/\/\S+$/i.test(url)) throw new IcsFeedError("Cole um link iCal que comece com https:// ou webcal://.");
  return url;
}

const downloads = new Map<string, { at: number; calendar: ICAL.Component }>();

async function download(url: string, fresh: boolean): Promise<ICAL.Component> {
  const cached = downloads.get(url);
  if (!fresh && cached && Date.now() - cached.at < DOWNLOAD_TTL_MS) return cached.calendar;

  let text: string;
  try {
    // O Rust já tem timeout de 30s; este é a rede de segurança para a tela nunca ficar esperando para sempre.
    text = await Promise.race([
      invoke<string>("fetch_calendar_feed", { url }),
      new Promise<never>((_, reject) => setTimeout(() => reject("timeout"), DOWNLOAD_TIMEOUT_MS)),
    ]);
  } catch (err) {
    const code = String(err);
    if (code === "http_401" || code === "http_403" || code === "http_404") {
      throw new IcsFeedError("O link não está acessível. Confira se o calendário continua publicado.");
    }
    if (code === "too_large") throw new IcsFeedError("O calendário é grande demais para importar.");
    throw new IcsFeedError("Não foi possível baixar o calendário. Confira o link e a conexão.");
  }
  try {
    const calendar = parseCalendar(text);
    downloads.set(url, { at: Date.now(), calendar });
    return calendar;
  } catch (err) {
    throw new IcsFeedError(err instanceof IcsParseError ? err.message : "Não foi possível ler o calendário.");
  }
}

/** Baixa e valida o link antes de salvar a assinatura; devolve o nome que o calendário declara. */
export async function probeFeed(url: string): Promise<{ name: string | null }> {
  return { name: calendarName(await download(url, true)) };
}

export function forgetFeedDownload(url: string) {
  downloads.delete(url);
}

/** Eventos da assinatura em [start, end). `fresh` ignora o download recente. */
export async function fetchFeedEvents(feed: IcsFeed, start: Date, end: Date, fresh = false): Promise<ExternalEvent[]> {
  const calendar = await download(feed.url, fresh);
  return expandEvents(calendar, { provider: icsProvider(feed.id), calendarName: feed.name, color: feed.color }, start, end);
}
