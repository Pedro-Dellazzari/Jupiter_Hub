import { create } from "zustand";
import { getCurrentWindow } from "@tauri-apps/api/window";

export type Theme = "light" | "dark";

const STORAGE_KEY = "jupiter-hub:theme";

function readPreference(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function writePreference(preference: Theme | null) {
  try {
    if (preference) localStorage.setItem(STORAGE_KEY, preference);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sem storage (modo privado etc.): a escolha só vale até fechar o app.
  }
}

const systemQuery = window.matchMedia("(prefers-color-scheme: dark)");

function readSystemTheme(): Theme {
  return systemQuery.matches ? "dark" : "light";
}

/**
 * Sem preferência salva, o `data-theme` some e o CSS segue o sistema
 * (`prefers-color-scheme`). Com preferência, ela vence o sistema.
 * A janela nativa (barra de título) é sincronizada quando roda dentro do Tauri.
 */
function applyPreference(preference: Theme | null) {
  const root = document.documentElement;
  if (preference) root.dataset.theme = preference;
  else delete root.dataset.theme;

  if ("__TAURI_INTERNALS__" in window) {
    getCurrentWindow()
      .setTheme(preference)
      .catch(() => {});
  }
}

type ThemeState = {
  /** Escolha explícita do usuário; `null` = seguir o sistema. */
  preference: Theme | null;
  system: Theme;
  toggle: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: readPreference(),
  system: readSystemTheme(),
  toggle: () => {
    const { preference, system } = get();
    const next: Theme = (preference ?? system) === "dark" ? "light" : "dark";
    writePreference(next);
    applyPreference(next);
    set({ preference: next });
  },
}));

/** Tema efetivamente em uso, já considerando a preferência e o sistema. */
export function useResolvedTheme(): Theme {
  return useThemeStore((s) => s.preference ?? s.system);
}

/** Chamar uma vez, antes do primeiro render, para não piscar o tema errado. */
export function initTheme() {
  applyPreference(useThemeStore.getState().preference);
  systemQuery.addEventListener("change", () => {
    useThemeStore.setState({ system: readSystemTheme() });
  });
}
