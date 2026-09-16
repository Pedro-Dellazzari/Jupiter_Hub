import { useState } from "react";
import { Compass } from "lucide-react";
import { projectsRepo } from "../../db/repositories/projectsRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { QuickCreateDialog } from "../../shared/ui/QuickCreateDialog";

/**
 * Roadmap é uma visão sobre projects/tasks (sem tabela própria — ver schema),
 * então "Criar roadmap" cria um projeto que pode ser visualizado aqui depois.
 */
export default function Roadmap() {
  const { state, reload } = useRepoList(projectsRepo.list);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <h1 className="mb-6 text-[24px] font-bold tracking-[-0.5px] text-(--color-ink)">Roadmap</h1>

      {state.status === "loading" && null}
      {state.status === "error" && <ModuleErrorState />}
      {state.status === "ready" && state.items.length === 0 && (
        <EmptyState
          icon={Compass}
          title="Nenhum roadmap criado ainda"
          description="Crie um roadmap pra planejar os próximos passos de um objetivo — estudo, projeto, o que for."
          ctaLabel="+ Criar roadmap"
          onAction={() => setDialogOpen(true)}
        />
      )}
      {state.status === "ready" && state.items.length > 0 && (
        <div className="flex h-full items-center justify-center">
          <p className="max-w-sm text-center text-[13px] text-(--color-ink-muted)">
            {state.items.length} projeto{state.items.length > 1 ? "s" : ""} catalogado
            {state.items.length > 1 ? "s" : ""} — a visualização completa do Roadmap ainda não
            está disponível.
          </p>
        </div>
      )}

      <QuickCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Criar roadmap"
        description="Um roadmap é um projeto com etapas — você pode reorganizar depois."
        placeholder="Nome do roadmap"
        submitLabel="Criar roadmap"
        onSubmit={async (name) => {
          await projectsRepo.create({ name });
          reload();
        }}
      />
    </div>
  );
}
