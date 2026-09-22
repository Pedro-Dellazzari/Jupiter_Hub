import { useUpdateStore } from "../../app/store/useUpdateStore";
import { Dialog } from "./Dialog";
import { ProgressBar } from "./ProgressBar";

const BUSY_STATUSES = new Set(["downloading", "installing"]);

export function UpdateDialog() {
  const { dialogOpen, status, version, notes, progress, error, installUpdate, dismiss } = useUpdateStore();
  const busy = BUSY_STATUSES.has(status);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open && !busy) dismiss();
      }}
      title={version ? `Nova versão disponível: ${version}` : "Nova versão disponível"}
      description={notes ?? "Há uma nova versão do Jupiter Hub pronta para instalar."}
    >
      <div className="flex flex-col gap-3">
        {status === "downloading" && <ProgressBar value={progress ?? 0} />}
        {status === "installing" && (
          <p className="text-[13px] text-(--color-ink-muted)">Instalando e reiniciando o app…</p>
        )}
        {status === "error" && error && <p className="text-[13px] text-(--color-danger)">{error}</p>}

        <div className="flex justify-end gap-2">
          {!busy && (
            <button
              onClick={dismiss}
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)"
            >
              Mais tarde
            </button>
          )}
          <button
            onClick={() => void installUpdate()}
            disabled={busy}
            className="rounded-lg bg-(--color-accent) px-3 py-2 text-[13px] font-semibold text-(--color-accent-ink) disabled:opacity-60"
          >
            {status === "downloading" ? "Baixando…" : status === "installing" ? "Instalando…" : status === "error" ? "Tentar novamente" : "Atualizar agora"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
