import { useEffect, useRef } from "react";
import { isMobilePlatform } from "../utils/platform";

/**
 * Botão "voltar" do Android. O WebView do Tauri volta no histórico quando pode e, quando não pode,
 * fecha o app. Então o app mantém uma entrada de histórico "armada": o voltar a consome (popstate),
 * o handler mais recente (um diálogo, uma tela de detalhe) trata, e a entrada é armada de novo.
 * Sem nada para tratar, ela fica desarmada e o próximo voltar sai do app, como no resto do Android.
 */
type BackHandler = () => void;

const handlers: BackHandler[] = [];
let fallback: (() => boolean) | null = null;
let armed = false;

function arm() {
  if (armed) return;
  history.pushState({ jupiterBack: true }, "");
  armed = true;
}

if (isMobilePlatform) {
  window.addEventListener("popstate", () => {
    armed = false;
    const handler = handlers[handlers.length - 1];
    if (handler) {
      handler();
      arm();
    } else if (fallback?.()) {
      arm();
    }
  });
  arm();
}

/** Quem trata o voltar quando nenhuma tela registrou handler (ex: voltar para a Home). Devolve se tratou. */
export function setBackFallback(fn: () => boolean) {
  fallback = fn;
}

/** Enquanto `active`, o voltar do Android chama `onBack` (o registro mais recente vence). */
export function useBackHandler(active: boolean, onBack: () => void) {
  const ref = useRef(onBack);
  ref.current = onBack;

  useEffect(() => {
    if (!active || !isMobilePlatform) return;
    const handler = () => ref.current();
    handlers.push(handler);
    arm();
    return () => {
      const index = handlers.lastIndexOf(handler);
      if (index !== -1) handlers.splice(index, 1);
    };
  }, [active]);
}
