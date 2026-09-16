import { useState } from "react";
import { CheckSquare } from "lucide-react";
import { tasksRepo } from "../../db/repositories/tasksRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ListCard, ListRow } from "../../shared/ui/ListCard";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { QuickCreateDialog } from "../../shared/ui/QuickCreateDialog";

export default function Tasks() {
  const { state, reload } = useRepoList(tasksRepo.list);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <h1 className="mb-6 text-[24px] font-bold tracking-[-0.5px] text-(--color-ink)">Tarefas</h1>

      {state.status === "loading" && null}
      {state.status === "error" && <ModuleErrorState />}
      {state.status === "ready" && state.items.length === 0 && (
        <EmptyState
          icon={CheckSquare}
          title="Nenhuma tarefa ainda"
          description="Organize seu dia criando sua primeira tarefa."
          ctaLabel="+ Nova tarefa"
          onAction={() => setDialogOpen(true)}
        />
      )}
      {state.status === "ready" && state.items.length > 0 && (
        <ListCard>
          {state.items.map((task) => (
            <ListRow
              key={task.id}
              leading={<CheckSquare className="size-4 shrink-0 text-(--color-ink-muted)" strokeWidth={1.75} />}
              title={task.title}
              trailing={<span className="text-[12px] text-(--color-ink-muted)">{task.status}</span>}
            />
          ))}
        </ListCard>
      )}

      <QuickCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Nova tarefa"
        placeholder="O que você precisa fazer?"
        submitLabel="Adicionar tarefa"
        onSubmit={async (title) => {
          await tasksRepo.create({ title });
          reload();
        }}
      />
    </div>
  );
}
