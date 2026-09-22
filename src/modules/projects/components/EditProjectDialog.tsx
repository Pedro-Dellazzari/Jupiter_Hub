import { useEffect, useRef, useState } from "react";
import type { Project } from "../../../db/repositories/projectsRepo";
import type { Space } from "../../../db/repositories/spacesRepo";
import { ChipSelect } from "../../../shared/ui/ChipSelect";
import { Dialog } from "../../../shared/ui/Dialog";
import { cn } from "../../../shared/utils/cn";

const STATUS_OPTIONS = [
  { value: "planning", label: "Planejado" },
  { value: "active", label: "Em andamento" },
  { value: "paused", label: "Pausado" },
] as const;

const COLOR_OPTIONS = ["#007aff", "#8c59f2", "#33a673", "#f28c26", "#ff2d78", "#12b3a8"];

export type EditProjectInput = {
  name: string;
  spaceId: string | null;
  status: string;
  color: string;
  description: string | null;
  dueDate: string | null;
};

export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  spaces,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  spaces: Space[];
  onSave: (input: EditProjectInput) => Promise<void>;
}) {
  const [name, setName] = useState(project.name);
  const [spaceId, setSpaceId] = useState(project.space_id ?? "");
  const [status, setStatus] = useState<string>(project.status);
  const [color, setColor] = useState(project.color ?? COLOR_OPTIONS[0]);
  const [description, setDescription] = useState(project.description ?? "");
  const [dueDate, setDueDate] = useState(project.due_date ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reabre com os dados atuais do projeto a cada vez (o dialog fica montado entre aberturas).
  useEffect(() => {
    if (!open) return;
    setName(project.name);
    setSpaceId(project.space_id ?? "");
    setStatus(project.status);
    setColor(project.color ?? COLOR_OPTIONS[0]);
    setDescription(project.description ?? "");
    setDueDate(project.due_date ?? "");
    setError(null);
  }, [open, project]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        name: trimmed,
        spaceId: spaceId || null,
        status,
        color,
        description: description.trim() || null,
        dueDate: dueDate || null,
      });
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
        if (!submitting) onOpenChange(next);
      }}
      title="Editar projeto"
      initialFocusRef={inputRef}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-(--color-ink-muted)">Nome</span>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do projeto"
            className="rounded-lg border border-(--color-divider) bg-(--color-surface) px-3 py-2 text-[14px] text-(--color-ink) outline-none focus:border-(--color-accent)"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-(--color-ink-muted)">Espaço</span>
          <select
            value={spaceId}
            onChange={(e) => setSpaceId(e.target.value)}
            className="rounded-lg border border-(--color-divider) bg-(--color-surface) px-3 py-2 text-[13px] text-(--color-ink) outline-none focus:border-(--color-accent)"
          >
            <option value="">Nenhum Espaço</option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-(--color-ink-muted)">Status</span>
          <ChipSelect options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-(--color-ink-muted)">Descrição (opcional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Sobre o que é esse projeto?"
            rows={2}
            className="resize-none rounded-lg border border-(--color-divider) bg-(--color-surface) px-3 py-2 text-[13px] text-(--color-ink) outline-none focus:border-(--color-accent)"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-(--color-ink-muted)">Cor</span>
          <div className="flex items-center gap-2.5">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setColor(option)}
                aria-label={`Cor ${option}`}
                style={{ backgroundColor: option }}
                className={cn(
                  "size-6 shrink-0 rounded-full outline-offset-2",
                  color === option && "outline outline-2 outline-(--color-ink)",
                )}
              />
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-(--color-ink-muted)">Data alvo</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-(--color-divider) bg-(--color-surface) px-3 py-2 text-[13px] text-(--color-ink) outline-none focus:border-(--color-accent)"
          />
        </label>

        {error && <p className="text-[12px] text-(--color-danger)">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="rounded-lg bg-(--color-accent) py-2 text-[13px] font-semibold text-(--color-accent-ink) disabled:opacity-40"
        >
          {submitting ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>
    </Dialog>
  );
}
