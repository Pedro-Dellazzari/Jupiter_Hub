import { useRef, useState } from "react";
import { CheckSquare, FolderKanban, Hexagon, NotebookText, Plus } from "lucide-react";
import { motion } from "motion/react";
import { spacesRepo } from "../../db/repositories/spacesRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { Card } from "../../shared/ui/Card";
import { Dialog } from "../../shared/ui/Dialog";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { springs } from "../../shared/motion/springs";

const SPACE_COLORS = ["#007AFF", "#8B5CF6", "#22C55E", "#F59E0B", "#FF2D55", "#00C7BE"];

function CreateSpaceDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: { name: string; description: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ name: trimmedName, description: description.trim() });
      setName("");
      setDescription("");
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
      title="Criar Espaço"
      initialFocusRef={inputRef}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Trabalho"
          className="rounded-lg border border-(--color-divider) bg-(--color-surface) px-3 py-2 text-[14px] text-(--color-ink) outline-none focus:border-(--color-accent)"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional) — ex: Betsson · Compliance & Data"
          className="rounded-lg border border-(--color-divider) bg-(--color-surface) px-3 py-2 text-[14px] text-(--color-ink) outline-none focus:border-(--color-accent)"
        />
        {error && <p className="text-[12px] text-(--color-danger)">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="rounded-lg bg-(--color-accent) py-2 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Salvando…" : "Criar Espaço"}
        </button>
      </form>
    </Dialog>
  );
}

export default function Spaces() {
  const { state, reload } = useRepoList(spacesRepo.listWithStats);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[24px] font-bold tracking-[-0.5px] text-(--color-ink)">Espaços</h1>
        <motion.button
          onClick={() => setDialogOpen(true)}
          whileHover={{ scale: 1.03, transition: springs.snappy }}
          whileTap={{ scale: 0.97, transition: springs.snappy }}
          className="flex items-center gap-1.5 rounded-lg bg-(--color-accent) py-2 pr-3.5 pl-3 text-[12px] font-semibold text-white hover:brightness-110"
        >
          <Plus className="size-3.5" strokeWidth={2.5} />
          Novo Espaço
        </motion.button>
      </div>

      {state.status === "loading" && null}
      {state.status === "error" && <ModuleErrorState />}
      {state.status === "ready" && state.items.length === 0 && (
        <EmptyState
          icon={Hexagon}
          title="Nenhum Espaço ainda"
          description="Espaços organizam suas tarefas, projetos e cadernos por contexto — Trabalho, Estudos, o que fizer sentido."
          ctaLabel="+ Criar Espaço"
          onAction={() => setDialogOpen(true)}
        />
      )}
      {state.status === "ready" && state.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.items.map((space, index) => (
            <Card key={space.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: space.color ?? SPACE_COLORS[index % SPACE_COLORS.length] }}
                >
                  <Hexagon className="size-4 text-white" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-(--color-ink)">{space.name}</p>
                  {space.description && (
                    <p className="truncate text-[12px] text-(--color-ink-muted)">{space.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3.5 border-t border-(--color-divider) pt-3 text-[12px] text-(--color-ink-muted)">
                <span className="flex items-center gap-1">
                  <CheckSquare className="size-3" strokeWidth={2} />
                  {space.task_count} tarefas
                </span>
                <span className="flex items-center gap-1">
                  <FolderKanban className="size-3" strokeWidth={2} />
                  {space.project_count} projetos
                </span>
                <span className="flex items-center gap-1">
                  <NotebookText className="size-3" strokeWidth={2} />
                  {space.note_count} notas
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateSpaceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={async ({ name, description }) => {
          await spacesRepo.create({ name, description: description || undefined });
          reload();
        }}
      />
    </div>
  );
}
