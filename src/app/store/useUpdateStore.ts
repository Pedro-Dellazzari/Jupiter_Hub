import { create } from "zustand";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

const CHECK_INTERVAL_MS = 4 * 60 * 60_000;

type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "installing" | "error";

type UpdateState = {
  status: UpdateStatus;
  dialogOpen: boolean;
  version: string | null;
  notes: string | null;
  progress: number | null;
  error: string | null;
  checkForUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  dismiss: () => void;
};

let pendingUpdate: Update | null = null;

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: "idle",
  dialogOpen: false,
  version: null,
  notes: null,
  progress: null,
  error: null,

  checkForUpdate: async () => {
    if (get().status === "checking" || get().status === "downloading") return;
    set({ status: "checking" });
    try {
      const update = await check();
      if (update) {
        pendingUpdate = update;
        set({ status: "available", dialogOpen: true, version: update.version, notes: update.body ?? null });
      } else {
        set({ status: "idle" });
      }
    } catch (err) {
      // Checagem em segundo plano: falha silenciosa (ex: offline) não deve incomodar o usuário.
      console.error("Falha ao checar atualizações:", err);
      set({ status: "idle" });
    }
  },

  installUpdate: async () => {
    if (!pendingUpdate) return;
    set({ status: "downloading", progress: 0, error: null });
    let total = 0;
    let downloaded = 0;
    try {
      await pendingUpdate.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          set({ progress: total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : null });
        } else if (event.event === "Finished") {
          set({ progress: 100 });
        }
      });
      set({ status: "installing" });
      await relaunch();
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  },

  dismiss: () => set({ dialogOpen: false }),
}));

/** Checa atualizações ao abrir e a cada 4h enquanto a janela está visível. Devolve a função que desliga o timer. */
export function startAutoUpdateCheck() {
  const trigger = () => void useUpdateStore.getState().checkForUpdate();
  trigger();

  const timer = window.setInterval(() => {
    if (document.visibilityState === "visible") trigger();
  }, CHECK_INTERVAL_MS);

  return () => window.clearInterval(timer);
}
