import { useSyncExternalStore } from "react";

/** Mesmo corte do variant `compact:` em styles/index.css. */
const COMPACT_QUERY = window.matchMedia("(width < 600px)");

function subscribe(onChange: () => void) {
  COMPACT_QUERY.addEventListener("change", onChange);
  return () => COMPACT_QUERY.removeEventListener("change", onChange);
}

/** Layout de celular: tela estreita (ex: Fold fechado), com barra de navegação embaixo. */
export function useIsCompact() {
  return useSyncExternalStore(subscribe, () => COMPACT_QUERY.matches);
}
