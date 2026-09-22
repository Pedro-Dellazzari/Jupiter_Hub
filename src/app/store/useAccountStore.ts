import { create } from "zustand";
import { settingsRepo } from "../../db/repositories/settingsRepo";

/** "local": dados só neste computador. "cloud": banco de dados na nuvem (Supabase), sincronizado entre dispositivos. */
export type AccountMode = "local" | "cloud";

const MODE_KEY = "account.mode";
const NAME_KEY = "account.name";

type AccountState = {
  /** `onboarding` = primeira abertura (ainda sem conta); `error` = não deu para ler as configurações locais. */
  status: "loading" | "onboarding" | "ready" | "error";
  mode: AccountMode | null;
  name: string;
  load: () => Promise<void>;
  /** Grava a escolha feita no onboarding e libera o app. */
  complete: (mode: AccountMode, name: string) => Promise<void>;
};

let loading: Promise<void> | null = null;

export const useAccountStore = create<AccountState>((set) => ({
  status: "loading",
  mode: null,
  name: "",

  // Idempotente: o StrictMode monta o App duas vezes em dev.
  load: () => {
    loading ??= (async () => {
      set({ status: "loading" });
      try {
        const settings = await settingsRepo.all();
        const mode = settings[MODE_KEY];
        const name = settings[NAME_KEY];
        if ((mode === "local" || mode === "cloud") && name) {
          set({ status: "ready", mode, name });
        } else {
          set({ status: "onboarding" });
        }
      } catch {
        loading = null;
        set({ status: "error" });
      }
    })();
    return loading;
  },

  complete: async (mode, name) => {
    await settingsRepo.set(NAME_KEY, name);
    await settingsRepo.set(MODE_KEY, mode);
    set({ status: "ready", mode, name });
  },
}));

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** Primeiro nome de quem está usando o app, para saudações. */
export function useFirstName() {
  return useAccountStore((s) => firstName(s.name));
}
