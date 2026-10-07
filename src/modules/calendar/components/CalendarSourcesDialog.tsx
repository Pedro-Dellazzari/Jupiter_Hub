import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Trash2, X } from "lucide-react";
import { Dialog } from "../../../shared/ui/Dialog";
import { isGoogleAvailable } from "../google/oauth";
import { IcsFeedError } from "../ics/feeds";
import { useCalendarStore } from "../useCalendarStore";

const PRIMARY_BUTTON_CLASS =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-(--color-accent) py-2 text-[13px] font-semibold text-(--color-accent-ink) disabled:opacity-60";
const SECONDARY_BUTTON_CLASS =
  "w-full rounded-lg bg-(--color-fill) py-2 text-[13px] font-semibold text-(--color-ink) disabled:opacity-60";
const SECTION_LABEL_CLASS = "text-[12px] font-medium text-(--color-ink-muted)";
const INPUT_CLASS =
  "w-full rounded-lg bg-(--color-fill) px-3 py-2 text-[13px] text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)/60";
const ROW_CLASS = "flex items-center gap-3 rounded-xl bg-(--color-fill) px-3.5 py-3";

function syncedLabel(lastSyncedAt: number | null) {
  if (lastSyncedAt === null) return "Ainda não sincronizado nesta sessão";
  const minutes = Math.floor((Date.now() - lastSyncedAt) / 60_000);
  if (minutes < 1) return "Sincronizado agora há pouco";
  if (minutes < 60) return `Sincronizado há ${minutes} min`;
  return `Sincronizado há ${Math.floor(minutes / 60)} h`;
}

/** Fontes do calendário: conta Google e assinaturas iCal. `onSync` atualiza o intervalo que a tela mostra. */
export function CalendarSourcesDialog({
  open,
  onOpenChange,
  onSync,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSync: () => void;
}) {
  const account = useCalendarStore((s) => s.account);
  const feeds = useCalendarStore((s) => s.feeds);
  const connecting = useCalendarStore((s) => s.connecting);
  const syncing = useCalendarStore((s) => s.syncing);
  const error = useCalendarStore((s) => s.error);
  const lastSyncedAt = useCalendarStore((s) => s.lastSyncedAt);
  const connect = useCalendarStore((s) => s.connect);
  const cancelConnect = useCalendarStore((s) => s.cancelConnect);
  const disconnect = useCalendarStore((s) => s.disconnect);
  const addFeed = useCalendarStore((s) => s.addFeed);
  const removeFeed = useCalendarStore((s) => s.removeFeed);
  const hiddenKeywords = useCalendarStore((s) => s.hiddenKeywords);
  const setHiddenKeywords = useCalendarStore((s) => s.setHiddenKeywords);

  const [disconnecting, setDisconnecting] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");
  const [feedName, setFeedName] = useState("");
  const [adding, setAdding] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  // Fechar o diálogo no meio da autorização desiste dela.
  useEffect(() => {
    if (!open && connecting) cancelConnect();
  }, [open, connecting, cancelConnect]);

  useEffect(() => {
    if (open) {
      setFeedUrl("");
      setFeedName("");
      setFeedError(null);
      setKeyword("");
    }
  }, [open]);

  function handleAddKeyword(event: FormEvent) {
    event.preventDefault();
    const term = keyword.trim();
    if (!term) return;
    if (!hiddenKeywords.some((current) => current.toLowerCase() === term.toLowerCase())) {
      void setHiddenKeywords([...hiddenKeywords, term]);
    }
    setKeyword("");
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnect();
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleAddFeed(event: FormEvent) {
    event.preventDefault();
    if (!feedUrl.trim() || adding) return;
    setAdding(true);
    setFeedError(null);
    try {
      await addFeed({ url: feedUrl, name: feedName });
      setFeedUrl("");
      setFeedName("");
      onSync();
    } catch (err) {
      setFeedError(err instanceof IcsFeedError ? err.message : "Não foi possível adicionar o calendário.");
    } finally {
      setAdding(false);
    }
  }

  const hasSources = account !== null || feeds.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Calendários"
      description="Fontes que aparecem no Hub, em modo somente leitura. As conexões ficam só neste dispositivo."
    >
      <div className="-mr-2 flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-2">
        <section className="flex flex-col gap-2">
          <p className={SECTION_LABEL_CLASS}>Google Calendar</p>
          {account ? (
            <div className={ROW_CLASS}>
              <span className="size-2.5 shrink-0 rounded-full bg-[#4285f4]" />
              <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-(--color-ink)">
                {account.email ?? "Conta Google"}
              </p>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="shrink-0 text-[12px] font-semibold text-(--color-ink-muted) hover:text-(--color-ink) disabled:opacity-60"
              >
                Desconectar
              </button>
            </div>
          ) : !isGoogleAvailable ? (
            <p className="text-[12px] text-(--color-ink-muted)">
              Indisponível: este build foi compilado sem as credenciais do Google (VITE_GOOGLE_CLIENT_ID e
              VITE_GOOGLE_CLIENT_SECRET).
            </p>
          ) : connecting ? (
            <>
              <div className="flex items-center justify-center gap-2 py-2 text-[13px] text-(--color-ink-muted)">
                <LoaderCircle className="size-3.5 animate-spin" strokeWidth={2.5} />
                Aguardando a autorização no navegador…
              </div>
              <button onClick={cancelConnect} className={SECONDARY_BUTTON_CLASS}>
                Cancelar
              </button>
            </>
          ) : (
            <button onClick={() => void connect()} className={SECONDARY_BUTTON_CLASS}>
              Conectar com Google
            </button>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <p className={SECTION_LABEL_CLASS}>Assinaturas iCal (Outlook e outros)</p>
          {feeds.map((feed) => (
            <div key={feed.id} className={ROW_CLASS}>
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: feed.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-(--color-ink)">{feed.name}</p>
                <p className="truncate text-[12px] text-(--color-ink-muted)">{new URL(feed.url).hostname}</p>
              </div>
              <button
                onClick={() => void removeFeed(feed.id)}
                title="Remover assinatura"
                className="shrink-0 text-(--color-ink-muted) hover:text-(--color-danger)"
              >
                <Trash2 className="size-3.5" strokeWidth={2} />
              </button>
            </div>
          ))}
          <form onSubmit={handleAddFeed} className="flex flex-col gap-2">
            <input
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="Link iCal (.ics) do calendário"
              autoComplete="off"
              spellCheck={false}
              className={INPUT_CLASS}
            />
            <input
              value={feedName}
              onChange={(e) => setFeedName(e.target.value)}
              placeholder="Nome (opcional) — ex.: Trabalho"
              autoComplete="off"
              className={INPUT_CLASS}
            />
            {feedError && <p className="text-[12px] text-(--color-danger)">{feedError}</p>}
            <button type="submit" disabled={!feedUrl.trim() || adding} className={SECONDARY_BUTTON_CLASS}>
              <span className="flex items-center justify-center gap-2">
                {adding && <LoaderCircle className="size-3.5 animate-spin" strokeWidth={2.5} />}
                Adicionar assinatura
              </span>
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-2">
          <p className={SECTION_LABEL_CLASS}>Ocultar eventos com estes termos no título</p>
          {hiddenKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hiddenKeywords.map((term) => (
                <span
                  key={term}
                  className="flex items-center gap-1 rounded-md bg-(--color-fill) py-1 pr-1.5 pl-2 text-[12px] font-semibold text-(--color-ink)"
                >
                  {term}
                  <button
                    onClick={() => void setHiddenKeywords(hiddenKeywords.filter((current) => current !== term))}
                    title="Voltar a mostrar"
                    className="text-(--color-ink-muted) hover:text-(--color-ink)"
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <form onSubmit={handleAddKeyword} className="flex gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Ex.: OOO, Férias"
              autoComplete="off"
              className={INPUT_CLASS}
            />
            <button
              type="submit"
              disabled={!keyword.trim()}
              className="shrink-0 rounded-lg bg-(--color-fill) px-3 text-[13px] font-semibold text-(--color-ink) disabled:opacity-60"
            >
              Ocultar
            </button>
          </form>
        </section>

        {hasSources && (
          <section className="flex flex-col gap-2">
            {error && <p className="text-[12px] text-(--color-danger)">{error}</p>}
            <button onClick={onSync} disabled={syncing} className={PRIMARY_BUTTON_CLASS}>
              {syncing && <LoaderCircle className="size-3.5 animate-spin" strokeWidth={2.5} />}
              Sincronizar agora
            </button>
            <p className="text-center text-[12px] text-(--color-ink-muted)">
              {syncing ? "Sincronizando…" : syncedLabel(lastSyncedAt)}
            </p>
          </section>
        )}
        {!hasSources && error && <p className="text-[12px] text-(--color-danger)">{error}</p>}
      </div>
    </Dialog>
  );
}
