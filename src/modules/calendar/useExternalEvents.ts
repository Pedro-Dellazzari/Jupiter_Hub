import { useEffect, useMemo, useState } from "react";
import { externalEventsRepo, type ExternalEvent } from "../../db/repositories/externalEventsRepo";
import { useCalendarStore } from "./useCalendarStore";
import { buildHiddenTitleMatcher } from "./utils/events";

/**
 * Eventos externos de [start, end): mostra o cache local na hora e, com alguma fonte conectada
 * (Google ou assinatura iCal), atualiza em segundo plano (ao montar, ao mudar o intervalo e quando a janela ganha foco).
 */
export function useExternalEvents(start: Date, end: Date): ExternalEvent[] {
  const startMs = start.getTime();
  const endMs = end.getTime();
  // Muda quando uma fonte entra ou sai: refaz a busca do intervalo.
  const sourcesKey = useCalendarStore((s) => `${s.account ? "google" : ""}|${s.feeds.map((feed) => feed.id).join(",")}`);
  const eventsVersion = useCalendarStore((s) => s.eventsVersion);
  const hiddenKeywords = useCalendarStore((s) => s.hiddenKeywords);
  const [events, setEvents] = useState<ExternalEvent[]>([]);

  useEffect(() => {
    void useCalendarStore.getState().init();
  }, []);

  useEffect(() => {
    let stale = false;
    externalEventsRepo
      .listInRange(new Date(startMs), new Date(endMs))
      .then((items) => {
        if (!stale) setEvents(items);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [startMs, endMs, eventsVersion]);

  useEffect(() => {
    if (sourcesKey === "|") return;
    const sync = () => void useCalendarStore.getState().syncRange(new Date(startMs), new Date(endMs));
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, [sourcesKey, startMs, endMs]);

  // O filtro age na leitura: mudar os termos vale na hora, sem buscar de novo nas fontes.
  return useMemo(() => {
    const isHidden = buildHiddenTitleMatcher(hiddenKeywords);
    return events.filter((event) => !isHidden(event.title));
  }, [events, hiddenKeywords]);
}
