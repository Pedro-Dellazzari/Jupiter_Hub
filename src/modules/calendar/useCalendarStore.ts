import { create } from "zustand";
import { newId } from "../../db/record";
import { externalEventsRepo } from "../../db/repositories/externalEventsRepo";
import { settingsRepo } from "../../db/repositories/settingsRepo";
import { fetchGoogleEvents, GOOGLE_PROVIDER } from "./google/api";
import { cancelGoogleConnect, connectGoogle, disconnectGoogle, GoogleAuthError, hasGoogleSession } from "./google/oauth";
import {
  fetchFeedEvents,
  forgetFeedDownload,
  IcsFeedError,
  icsProvider,
  loadFeeds,
  nextFeedColor,
  normalizeFeedUrl,
  probeFeed,
  saveFeeds,
  type IcsFeed,
} from "./ics/feeds";

const EMAIL_KEY = "google.email";
const HIDDEN_KEYWORDS_KEY = "calendar.hidden_keywords";
/** Enquanto a pessoa não mexer na lista: eventos de ausência ("OOO"/"OoO") ficam de fora. */
const DEFAULT_HIDDEN_KEYWORDS = ["OOO"];

async function loadHiddenKeywords(): Promise<string[]> {
  try {
    const stored = await settingsRepo.get(HIDDEN_KEYWORDS_KEY);
    if (stored === null) return DEFAULT_HIDDEN_KEYWORDS;
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return DEFAULT_HIDDEN_KEYWORDS;
  }
}
/** Um mesmo intervalo não é buscado de novo antes disso (trocar de mês e voltar, foco da janela). */
const MIN_RESYNC_GAP_MS = 5 * 60_000;

type CalendarState = {
  /** `false` até as conexões salvas serem lidas do banco local. */
  ready: boolean;
  /** Conta Google conectada neste dispositivo, se houver. */
  account: { email: string | null } | null;
  /** Assinaturas iCal (ex.: calendário publicado do Outlook). */
  feeds: IcsFeed[];
  /** Eventos cujo título contém um destes termos não aparecem (vale para todas as fontes). */
  hiddenKeywords: string[];
  connecting: boolean;
  syncing: boolean;
  error: string | null;
  lastSyncedAt: number | null;
  /** Sobe quando o cache de eventos muda; as telas recarregam com isso. */
  eventsVersion: number;
  init: () => Promise<void>;
  connect: () => Promise<void>;
  cancelConnect: () => void;
  disconnect: () => Promise<void>;
  /** Valida o link e salva a assinatura. Lança `IcsFeedError` com a mensagem a mostrar. */
  addFeed: (input: { url: string; name: string }) => Promise<void>;
  removeFeed: (id: string) => Promise<void>;
  setHiddenKeywords: (keywords: string[]) => Promise<void>;
  /** Busca nas fontes conectadas os eventos de [start, end) e atualiza o cache local. */
  syncRange: (start: Date, end: Date, options?: { force?: boolean }) => Promise<void>;
};

let initPromise: Promise<void> | null = null;
const syncedAt = new Map<string, number>();
const inFlight = new Set<string>();

export const useCalendarStore = create<CalendarState>((set, get) => {
  /** Uma fonte que falha não impede as outras: devolve a mensagem de erro, se houver. */
  async function syncGoogle(start: Date, end: Date): Promise<string | null> {
    try {
      const snapshot = await fetchGoogleEvents(start, end);
      // Desconectou enquanto a busca corria: não repovoa o cache.
      if (!get().account) return null;
      await externalEventsRepo.replaceRange(GOOGLE_PROVIDER, start, end, snapshot.events);
      if (snapshot.email) await settingsRepo.set(EMAIL_KEY, snapshot.email);
      set((state) => ({ account: { email: snapshot.email ?? state.account?.email ?? null } }));
      return null;
    } catch (err) {
      if (err instanceof GoogleAuthError && err.kind === "expired") {
        // O cache fica: a agenda continua visível até a pessoa reconectar.
        set({ account: null });
        return err.message;
      }
      return navigator.onLine ? "Não foi possível atualizar os eventos do Google Calendar." : null;
    }
  }

  async function syncFeed(feed: IcsFeed, start: Date, end: Date, fresh: boolean): Promise<string | null> {
    try {
      const events = await fetchFeedEvents(feed, start, end, fresh);
      if (!get().feeds.some((current) => current.id === feed.id)) return null;
      await externalEventsRepo.replaceRange(icsProvider(feed.id), start, end, events);
      return null;
    } catch (err) {
      if (!navigator.onLine) return null;
      return `${feed.name}: ${err instanceof IcsFeedError ? err.message : "não foi possível atualizar."}`;
    }
  }

  return {
    ready: false,
    account: null,
    feeds: [],
    hiddenKeywords: [],
    connecting: false,
    syncing: false,
    error: null,
    lastSyncedAt: null,
    eventsVersion: 0,

    init() {
      initPromise ??= (async () => {
        const [connected, feeds, hiddenKeywords] = await Promise.all([
          hasGoogleSession().catch(() => false),
          loadFeeds(),
          loadHiddenKeywords(),
        ]);
        const email = connected ? await settingsRepo.get(EMAIL_KEY).catch(() => null) : null;
        set({ ready: true, feeds, hiddenKeywords, account: connected ? { email: email || null } : null });
      })();
      return initPromise;
    },

    async connect() {
      if (get().connecting) return;
      set({ connecting: true, error: null });
      try {
        await connectGoogle();
        syncedAt.clear();
        set({ account: { email: null } });
      } catch (err) {
        // Cancelar é uma escolha da pessoa, não um erro a mostrar.
        if (!(err instanceof GoogleAuthError && err.kind === "cancelled")) {
          set({ error: err instanceof GoogleAuthError ? err.message : "Não foi possível conectar ao Google." });
        }
      } finally {
        set({ connecting: false });
      }
    },

    cancelConnect() {
      void cancelGoogleConnect();
    },

    async disconnect() {
      await disconnectGoogle();
      await Promise.all([externalEventsRepo.clear(GOOGLE_PROVIDER), settingsRepo.set(EMAIL_KEY, "")]);
      set((state) => ({ account: null, error: null, eventsVersion: state.eventsVersion + 1 }));
    },

    async addFeed(input) {
      const url = normalizeFeedUrl(input.url);
      if (get().feeds.some((feed) => feed.url === url)) throw new IcsFeedError("Este calendário já foi adicionado.");
      const probe = await probeFeed(url);
      const feeds = [
        ...get().feeds,
        { id: newId(), url, name: input.name.trim() || probe.name || "Calendário iCal", color: nextFeedColor(get().feeds) },
      ];
      await saveFeeds(feeds);
      // A fonte nova ainda não foi buscada em nenhum intervalo.
      syncedAt.clear();
      set({ feeds, error: null });
    },

    async removeFeed(id) {
      const feed = get().feeds.find((current) => current.id === id);
      if (!feed) return;
      const feeds = get().feeds.filter((current) => current.id !== id);
      await saveFeeds(feeds);
      await externalEventsRepo.clear(icsProvider(id));
      forgetFeedDownload(feed.url);
      set((state) => ({ feeds, error: null, eventsVersion: state.eventsVersion + 1 }));
    },

    async setHiddenKeywords(keywords) {
      await settingsRepo.set(HIDDEN_KEYWORDS_KEY, JSON.stringify(keywords));
      set({ hiddenKeywords: keywords });
    },

    async syncRange(start, end, options) {
      const { account, feeds } = get();
      if (!account && feeds.length === 0) return;
      const key = `${start.getTime()}-${end.getTime()}`;
      if (inFlight.has(key)) return;
      if (!options?.force && Date.now() - (syncedAt.get(key) ?? 0) < MIN_RESYNC_GAP_MS) return;

      inFlight.add(key);
      set({ syncing: true, error: null });
      try {
        const errors = await Promise.all([
          account ? syncGoogle(start, end) : null,
          ...feeds.map((feed) => syncFeed(feed, start, end, options?.force ?? false)),
        ]);
        syncedAt.set(key, Date.now());
        set((state) => ({
          error: errors.find((message) => message !== null) ?? null,
          lastSyncedAt: Date.now(),
          eventsVersion: state.eventsVersion + 1,
        }));
      } finally {
        inFlight.delete(key);
        set({ syncing: inFlight.size > 0 });
      }
    },
  };
});
