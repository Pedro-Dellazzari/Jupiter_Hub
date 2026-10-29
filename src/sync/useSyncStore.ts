import { create } from "zustand";
import { getDb } from "../db/client";
import { newId, now } from "../db/record";
import { settingsRepo } from "../db/repositories/settingsRepo";
import { createSyncEngine, SyncAccountMismatchError, type LocalDb } from "./engine";
import { supabase } from "./supabaseClient";
import { createSupabaseRemote } from "./supabaseRemote";

const AUTO_SYNC_INTERVAL_MS = 60_000;
/** Foco/blur/online disparam sync; este intervalo evita rajadas quando a janela troca de foco várias vezes. */
const MIN_AUTO_SYNC_GAP_MS = 5_000;

type SyncState = {
  status: "idle" | "syncing" | "error";
  lastSyncedAt: number | null;
  error: string | null;
  /** Sobe quando o pull mudou dados locais; as listas (useRepoList) recarregam com isso. */
  dataVersion: number;
  /**
   * Modo nuvem sem sessão do Supabase neste WebView (a sessão expirou, ou o banco local veio de outra
   * instalação/origem do app). Nada sincroniza até a pessoa entrar de novo.
   */
  needsSignIn: boolean;
  signInDialogOpen: boolean;
  setSignInDialogOpen: (open: boolean) => void;
  /** Chamado depois de um login bem-sucedido: libera o sync e roda uma rodada. */
  signedIn: () => void;
  sync: () => Promise<void>;
};

const localDb: LocalDb = {
  select: async <T>(query: string, bindValues?: unknown[]) => (await getDb()).select<T>(query, bindValues),
  execute: async (query, bindValues) => (await getDb()).execute(query, bindValues),
};

let engine: ReturnType<typeof createSyncEngine> | null = null;

function getEngine() {
  if (!supabase) return null;
  engine ??= createSyncEngine({
    db: localDb,
    remote: createSupabaseRemote(supabase),
    settings: settingsRepo,
    now,
    newId,
  });
  return engine;
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function isOffline(err: unknown) {
  return !navigator.onLine || /failed to fetch|networkerror|load failed/i.test(errorMessage(err));
}

function isAuthError(err: unknown) {
  return !isOffline(err) && /jwt|not authenticated|invalid claim/i.test(errorMessage(err));
}

function describeError(err: unknown) {
  if (err instanceof SyncAccountMismatchError) return err.message;
  if (isOffline(err)) return "Sem conexão. Tentaremos de novo em instantes.";
  if (isAuthError(err)) return "Sua sessão expirou. Entre novamente.";
  console.error("Falha no sync:", err);
  return `Não foi possível sincronizar (${errorMessage(err)}). Tentaremos de novo em instantes.`;
}

let running: Promise<void> | null = null;

export const useSyncStore = create<SyncState>((set, get) => ({
  status: "idle",
  lastSyncedAt: null,
  error: null,
  dataVersion: 0,
  needsSignIn: false,
  signInDialogOpen: false,

  setSignInDialogOpen: (open) => set({ signInDialogOpen: open }),

  signedIn: () => {
    set({ needsSignIn: false, signInDialogOpen: false });
    void get().sync();
  },

  // Uma rodada por vez: gatilhos que chegam durante um sync reaproveitam a rodada em andamento.
  sync: () => {
    running ??= (async () => {
      const activeEngine = getEngine();
      if (!activeEngine || !supabase) return;

      set({ status: "syncing", error: null });
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("not authenticated");
        const result = await activeEngine.sync(data.session.user.id);
        set((s) => ({
          status: "idle",
          needsSignIn: false,
          lastSyncedAt: Date.now(),
          dataVersion: result.pulled > 0 ? s.dataVersion + 1 : s.dataVersion,
        }));
      } catch (err) {
        const needsSignIn = isAuthError(err);
        // O diálogo abre sozinho só na primeira falha; depois de dispensado, reabre pelo indicador de sync.
        set((s) => ({
          status: "error",
          error: describeError(err),
          needsSignIn,
          signInDialogOpen: s.signInDialogOpen || (needsSignIn && !s.needsSignIn),
        }));
      }
    })().finally(() => {
      running = null;
    });
    return running;
  },
}));

function syncIfStale() {
  const { lastSyncedAt, status, sync } = useSyncStore.getState();
  if (status === "syncing") return;
  if (lastSyncedAt === null || Date.now() - lastSyncedAt > MIN_AUTO_SYNC_GAP_MS) void sync();
}

/**
 * Sincroniza ao abrir, a cada minuto (janela visível), ao voltar/perder o foco e ao reconectar.
 * Perder o foco também sincroniza para que uma edição feita agora chegue aos outros dispositivos
 * sem esperar o próximo minuto. Devolve a função que desliga tudo.
 */
export function startAutoSync() {
  const trigger = () => {
    if (navigator.onLine) syncIfStale();
  };
  trigger();

  const timer = window.setInterval(() => {
    if (document.visibilityState === "visible") trigger();
  }, AUTO_SYNC_INTERVAL_MS);
  window.addEventListener("focus", trigger);
  window.addEventListener("blur", trigger);
  window.addEventListener("online", trigger);

  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", trigger);
    window.removeEventListener("blur", trigger);
    window.removeEventListener("online", trigger);
  };
}
