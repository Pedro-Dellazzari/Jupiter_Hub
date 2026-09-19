import { useRef, useState } from "react";
import { Dialog } from "./Dialog";

type QuickCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<void>;
};

/** Diálogo genérico "nome + criar", usado pelos fluxos rápidos de criação (Espaço, Tarefa, Nota, Hábito, Projeto). */
export function QuickCreateDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  submitLabel,
  onSubmit,
}: QuickCreateDialogProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setName("");
      onOpenChange(false);
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) {
          onOpenChange(next);
          if (!next) setError(null);
        }
      }}
      title={title}
      description={description}
      initialFocusRef={inputRef}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="rounded-lg border border-(--color-divider) bg-(--color-surface) px-3 py-2 text-[14px] text-(--color-ink) outline-none focus:border-(--color-accent)"
        />
        {error && <p className="text-[12px] text-(--color-danger)">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="rounded-lg bg-(--color-accent) py-2 text-[13px] font-semibold text-(--color-accent-ink) disabled:opacity-40"
        >
          {submitting ? "Salvando…" : submitLabel}
        </button>
      </form>
    </Dialog>
  );
}
