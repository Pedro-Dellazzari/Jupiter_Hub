import { useState } from "react";
import { Hexagon } from "lucide-react";
import { spacesRepo } from "../../db/repositories/spacesRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ListCard, ListRow } from "../../shared/ui/ListCard";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { QuickCreateDialog } from "../../shared/ui/QuickCreateDialog";

export default function Spaces() {
  const { state, reload } = useRepoList(spacesRepo.list);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <h1 className="mb-6 text-[24px] font-bold tracking-[-0.5px] text-(--color-ink)">Espaços</h1>

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
        <ListCard>
          {state.items.map((space) => (
            <ListRow
              key={space.id}
              leading={<Hexagon className="size-4 shrink-0 text-(--color-accent)" strokeWidth={2} />}
              title={space.name}
            />
          ))}
        </ListCard>
      )}

      <QuickCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Criar Espaço"
        placeholder="Ex: Trabalho"
        submitLabel="Criar Espaço"
        onSubmit={async (name) => {
          await spacesRepo.create({ name });
          reload();
        }}
      />
    </div>
  );
}
