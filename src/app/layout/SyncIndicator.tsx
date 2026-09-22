import { Cloud, CloudAlert, RefreshCw } from "lucide-react";
import { useAccountStore } from "../store/useAccountStore";
import { useSyncStore } from "../../sync/useSyncStore";
import { cn } from "../../shared/utils/cn";

function timeLabel(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Estado do sync (só no modo "Banco de dados"); clicar força uma rodada agora. */
export function SyncIndicator({ className }: { className?: string }) {
  const mode = useAccountStore((s) => s.mode);
  const status = useSyncStore((s) => s.status);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const error = useSyncStore((s) => s.error);
  const sync = useSyncStore((s) => s.sync);

  if (mode !== "cloud") return null;

  const label =
    status === "syncing"
      ? "Sincronizando…"
      : status === "error"
        ? `${error} Clique para tentar agora.`
        : lastSyncedAt
          ? `Sincronizado às ${timeLabel(lastSyncedAt)}. Clique para sincronizar agora.`
          : "Clique para sincronizar agora.";
  const Icon = status === "syncing" ? RefreshCw : status === "error" ? CloudAlert : Cloud;

  return (
    <button
      type="button"
      onClick={() => void sync()}
      disabled={status === "syncing"}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-(--color-fill)",
        status === "error" ? "text-(--color-danger)" : "text-(--color-ink-muted) hover:text-(--color-ink)",
        className,
      )}
    >
      <Icon className={cn("size-4", status === "syncing" && "animate-spin")} strokeWidth={1.75} />
    </button>
  );
}
