import { Dialog } from "./Dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

/** Diálogo genérico de confirmação para ações destrutivas (ex: excluir pasta, nota, item). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => onOpenChange(false)}
          className="rounded-lg px-3 py-2 text-[13px] font-medium text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
          className="rounded-lg bg-(--color-danger) px-3 py-2 text-[13px] font-semibold text-white"
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
