import { create } from "zustand";

/** Telas do app mobile que não são módulos: o menu "Mais" e as Configurações. */
export const MORE_SCREEN_ID = "more";
export const SETTINGS_SCREEN_ID = "settings";

/** Módulos que ficam na barra de navegação do celular; os demais moram no "Mais". */
export const NAV_BAR_MODULE_IDS = ["home", "today", "tasks", "projects"];

type NavigationState = {
  activeModuleId: string;
  setActiveModule: (id: string) => void;
  /** Para onde o voltar do Android leva a partir da tela atual (null = sair do app). */
  backTarget: () => string | null;
};

export const useNavigationStore = create<NavigationState>((set, get) => ({
  activeModuleId: "home",
  setActiveModule: (id) => set({ activeModuleId: id }),
  backTarget: () => {
    const id = get().activeModuleId;
    if (id === "home") return null;
    // Configurações e os módulos do "Mais" foram abertos a partir dele.
    if (id === MORE_SCREEN_ID || NAV_BAR_MODULE_IDS.includes(id)) return "home";
    return MORE_SCREEN_ID;
  },
}));
