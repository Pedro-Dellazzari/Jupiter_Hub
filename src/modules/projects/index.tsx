import { useState } from "react";
import { FolderKanban } from "lucide-react";
import { projectsRepo } from "../../db/repositories/projectsRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ListCard, ListRow } from "../../shared/ui/ListCard";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { QuickCreateDialog } from "../../shared/ui/QuickCreateDialog";

export default function Projects() {
  const { state, reload } = useRepoList(projectsRepo.list);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <h1 className="mb-6 text-[24px] font-bold tracking-[-0.5px] text-(--color-ink)">Projetos</h1>

      {state.status === "loading" && null}
      {state.status === "error" && <ModuleErrorState />}
      {state.status === "ready" && state.items.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum projeto ainda"
          description="Projetos vivem dentro de um Espaço e acompanham progresso ao longo do tempo."
          ctaLabel="+ Criar projeto"
          onAction={() => setDialogOpen(true)}
        />
      )}
      {state.status === "ready" && state.items.length > 0 && (
        <ListCard>
          {state.items.map((project) => (
            <ListRow
              key={project.id}
              leading={<span className="size-2.5 shrink-0 rounded-[3px] bg-(--color-accent)" />}
              title={project.name}
              trailing={<span className="text-[12px] text-(--color-ink-muted)">{project.status}</span>}
            />
          ))}
        </ListCard>
      )}

      <QuickCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Criar projeto"
        placeholder="Nome do projeto"
        submitLabel="Criar projeto"
        onSubmit={async (name) => {
          await projectsRepo.create({ name });
          reload();
        }}
      />
    </div>
  );
}
