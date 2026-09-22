import { useMemo, useRef, useState } from "react";
import { Circle, Plus, Square } from "lucide-react";
import type { Project } from "../../../db/repositories/projectsRepo";
import type { Space } from "../../../db/repositories/spacesRepo";
import { Dialog } from "../../../shared/ui/Dialog";
import { SelectMenu } from "../../../shared/ui/SelectMenu";
import { PriorityChips } from "./PriorityChips";

export type CreateTaskInput = {
  title: string;
  projectId: string | null;
  spaceId: string | null;
  priority: string;
  dueDate: string | null;
};

export function CreateTaskDialog({
  open,
  onOpenChange,
  projects,
  spaces,
  defaultSpaceId,
  defaultProjectId,
  onCreateSpace,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  spaces: Space[];
  /** Espaço pré-selecionado (ex: o filtro de Espaço ativo na lista). */
  defaultSpaceId?: string | null;
  /** Projeto pré-selecionado (ex: o botão "Nova tarefa" dentro da página de um projeto). */
  defaultProjectId?: string | null;
  onCreateSpace: (name: string) => Promise<Space>;
  onCreate: (input: CreateTaskInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<string>("none");
  const [dueDate, setDueDate] = useState("");
  const [creatingSpace, setCreatingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveSpaceId = spaceId || defaultSpaceId || "";
  const effectiveProjectId = projectId || defaultProjectId || "";
  // Com um Espaço escolhido, só oferece os projetos dele — evita uma tarefa "de um Espaço" com projeto de outro.
  const visibleProjects = useMemo(
    () => (effectiveSpaceId ? projects.filter((p) => p.space_id === effectiveSpaceId) : projects),
    [projects, effectiveSpaceId],
  );

  function handleSpaceChange(next: string) {
    setSpaceId(next);
    const project = projects.find((p) => p.id === projectId);
    if (project && next && project.space_id !== next) setProjectId("");
  }

  function handleProjectChange(next: string) {
    setProjectId(next);
    const project = projects.find((p) => p.id === next);
    if (project?.space_id) setSpaceId(project.space_id);
  }

  async function handleCreateSpace() {
    const name = newSpaceName.trim();
    if (!name) {
      setCreatingSpace(false);
      return;
    }
    try {
      const space = await onCreateSpace(name);
      handleSpaceChange(space.id);
    } catch {
      setError("Não foi possível criar o espaço. Tente novamente.");
    } finally {
      setCreatingSpace(false);
      setNewSpaceName("");
    }
  }

  function reset() {
    setTitle("");
    setSpaceId("");
    setProjectId("");
    setPriority("none");
    setDueDate("");
    setCreatingSpace(false);
    setNewSpaceName("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        title: trimmed,
        projectId: effectiveProjectId || null,
        // Com projeto, o Espaço é herdado dele; sem projeto, a tarefa fica direto no Espaço escolhido.
        spaceId: effectiveProjectId ? null : effectiveSpaceId || null,
        priority,
        dueDate: dueDate || null,
      });
      reset();
      onOpenChange(false);
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const spaceOptions = spaces.map((s) => ({
    value: s.id,
    label: s.name,
    icon: <Circle className="size-3 shrink-0" strokeWidth={2} />,
  }));
  const projectOptions = visibleProjects.map((p) => ({
    value: p.id,
    label: p.name,
    icon: <Square className="size-2.5 shrink-0 fill-current" strokeWidth={0} style={{ color: p.color ?? "#007AFF" }} />,
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) {
          onOpenChange(next);
          if (!next) setError(null);
        }
      }}
      title="Nova tarefa"
      initialFocusRef={inputRef}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-(--color-ink-muted)">Título</span>
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="O que você precisa fazer?"
            className="rounded-lg border border-(--color-divider) bg-(--color-surface) px-3 py-2 text-[14px] text-(--color-ink) outline-none focus:border-(--color-accent)"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-[13px] font-medium text-(--color-ink-muted)">Espaço</span>
              {creatingSpace ? (
                <input
                  autoFocus
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  onBlur={handleCreateSpace}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setNewSpaceName("");
                      setCreatingSpace(false);
                    }
                  }}
                  placeholder="Nome do espaço"
                  className="rounded-lg border border-(--color-accent) bg-(--color-surface) px-3 py-2 text-[13px] text-(--color-ink) outline-none"
                />
              ) : (
                <SelectMenu
                  value={effectiveSpaceId}
                  options={spaceOptions}
                  onChange={handleSpaceChange}
                  emptyLabel="Sem espaço"
                  leadingIcon={<Circle className="size-3 shrink-0" strokeWidth={2} />}
                  footer={{
                    label: "Novo espaço",
                    icon: <Plus className="size-3.5" strokeWidth={2} />,
                    onSelect: () => setCreatingSpace(true),
                  }}
                />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-[13px] font-medium text-(--color-ink-muted)">Projeto</span>
              <SelectMenu
                value={effectiveProjectId}
                options={projectOptions}
                onChange={handleProjectChange}
                emptyLabel="Sem projeto"
              />
            </div>
          </div>
          {effectiveSpaceId && !effectiveProjectId && (
            <p className="text-[12px] text-(--color-ink-muted)/70">
              Sem projeto? Tudo bem — a tarefa fica direto no espaço.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-(--color-ink-muted)">Prioridade</span>
          <PriorityChips value={priority} onChange={setPriority} />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-(--color-ink-muted)">Data de vencimento</span>
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
          disabled={!title.trim() || submitting}
          className="rounded-lg bg-(--color-accent) py-2 text-[13px] font-semibold text-(--color-accent-ink) disabled:opacity-40"
        >
          {submitting ? "Salvando…" : "Adicionar tarefa"}
        </button>
      </form>
    </Dialog>
  );
}
