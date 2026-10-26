import { useState } from "react";
import { useFirstName } from "../../app/store/useAccountStore";
import { useSyncStore } from "../../sync/useSyncStore";
import { tasksRepo } from "../../db/repositories/tasksRepo";
import { useIsCompact } from "../../shared/hooks/useIsCompact";
import { formatIsoDate } from "../../shared/utils/date";
import { Fab } from "../../shared/ui/Fab";
import { QuickCreateDialog } from "../../shared/ui/QuickCreateDialog";
import { TopBar } from "./components/TopBar";
import { StatCards } from "./components/StatCards";
import { ProjectsSection } from "./components/ProjectsSection";
import { SpacesRow } from "./components/SpacesRow";
import { TodayTasksSection } from "./components/TodayTasksSection";

export function DashboardView() {
  const firstName = useFirstName();
  const compact = useIsCompact();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="h-full overflow-y-auto px-10 py-8 compact:px-4 compact:pt-3 compact:pb-24">
      <div className="flex flex-col gap-6 compact:gap-5">
        <TopBar name={firstName} />
        <StatCards />
        {compact ? (
          <TodayTasksSection />
        ) : (
          <>
            <ProjectsSection />
            <SpacesRow />
          </>
        )}
      </div>

      <Fab label="Nova tarefa" onClick={() => setCreateOpen(true)} />
      <QuickCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nova tarefa"
        placeholder="O que você precisa fazer?"
        submitLabel="Adicionar tarefa"
        onSubmit={async (title) => {
          await tasksRepo.create({ title, due_date: formatIsoDate(new Date()) });
          useSyncStore.setState((s) => ({ dataVersion: s.dataVersion + 1 }));
        }}
      />
    </div>
  );
}
