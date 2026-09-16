import { useState } from "react";
import { Repeat } from "lucide-react";
import { habitsRepo } from "../../db/repositories/habitsRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ListCard, ListRow } from "../../shared/ui/ListCard";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { QuickCreateDialog } from "../../shared/ui/QuickCreateDialog";

export default function Habits() {
  const { state, reload } = useRepoList(habitsRepo.list);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <h1 className="mb-6 text-[24px] font-bold tracking-[-0.5px] text-(--color-ink)">Hábitos</h1>

      {state.status === "loading" && null}
      {state.status === "error" && <ModuleErrorState />}
      {state.status === "ready" && state.items.length === 0 && (
        <EmptyState
          icon={Repeat}
          title="Nenhum hábito ainda"
          description="Comece a acompanhar algo que você quer manter todo dia ou toda semana."
          ctaLabel="+ Novo hábito"
          onAction={() => setDialogOpen(true)}
        />
      )}
      {state.status === "ready" && state.items.length > 0 && (
        <ListCard>
          {state.items.map((habit) => (
            <ListRow
              key={habit.id}
              leading={<Repeat className="size-4 shrink-0 text-(--color-ink-muted)" strokeWidth={1.75} />}
              title={habit.name}
              trailing={<span className="text-[12px] text-(--color-ink-muted)">{habit.frequency_type}</span>}
            />
          ))}
        </ListCard>
      )}

      <QuickCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Novo hábito"
        placeholder="O que você quer manter todo dia?"
        submitLabel="Criar hábito"
        onSubmit={async (name) => {
          await habitsRepo.create({ name });
          reload();
        }}
      />
    </div>
  );
}
