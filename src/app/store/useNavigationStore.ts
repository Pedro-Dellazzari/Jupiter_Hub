import { create } from "zustand";

type NavigationState = {
  activeModuleId: string;
  setActiveModule: (id: string) => void;
};

export const useNavigationStore = create<NavigationState>((set) => ({
  activeModuleId: "home",
  setActiveModule: (id) => set({ activeModuleId: id }),
}));
