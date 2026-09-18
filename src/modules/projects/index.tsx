import { useState } from "react";
import { ArrowRight, CheckSquare, FolderKanban, Plus } from "lucide-react";
import { motion } from "motion/react";
import { projectsRepo } from "../../db/repositories/projectsRepo";
import { spacesRepo } from "../../db/repositories/spacesRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { Badge } from "../../shared/ui/Badge";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ListCard, ListRow } from "../../shared/ui/ListCard";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { ModuleHeader } from "../../shared/ui/ModuleHeader";
import { ProgressBar } from "../../shared/ui/ProgressBar";
import { springs } from "../../shared/motion/springs";
import { CreateProjectDialog } from "./components/CreateProjectDialog";
import { loadProjectsWithStats } from "./utils/projectStats";
import { projectStatusInfo } from "./utils/projectStatus";

export default function Projects() {
  const { state, reload } = useRepoList(loadProjectsWithStats);
  const spacesState = useRepoList(spacesRepo.list);
  const spaces = spacesState.state.status === "ready" ? spacesState.state.items : [];
  const [dialogOpen, setDialogOpen] = useState(false);

  const items = state.status === "ready" ? state.items : [];
  const activeCount = items.filter((p) => projectStatusInfo(p.status).tone === "active").length;
  const subtitle =
    items.length === 0
      ? undefined
      : `${items.length} ${items.length === 1 ? "projeto" : "projetos"}${activeCount > 0 ? ` · ${activeCount} em andamento` : ""}`;

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <ModuleHeader
        title="Projetos"
        subtitle={subtitle}
        action={
          <motion.button
            onClick={() => setDialogOpen(true)}
            whileHover={{ scale: 1.03, transition: springs.snappy }}
            whileTap={{ scale: 0.97, transition: springs.snappy }}
            className="flex items-center gap-1.5 rounded-lg bg-(--color-accent) py-2 pr-3.5 pl-3 text-[12px] font-semibold text-white hover:brightness-110"
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            Novo projeto
          </motion.button>
        }
      />

      {state.status === "loading" && null}
      {state.status === "error" && <ModuleErrorState />}
      {state.status === "ready" && items.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum projeto ainda"
          description="Projetos vivem dentro de um Espaço e acompanham progresso ao longo do tempo."
          ctaLabel="+ Criar projeto"
          onAction={() => setDialogOpen(true)}
        />
      )}
      {state.status === "ready" && items.length > 0 && (
        <ListCard>
          {items.map((project) => {
            const statusInfo = projectStatusInfo(project.status);
            return (
              <ListRow
                key={project.id}
                leading={
                  <span
                    className="size-2.5 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: project.color ?? "#007aff" }}
                  />
                }
                title={project.name}
                trailing={
                  <Badge
                    className={statusInfo.tone === "active" ? "bg-(--color-accent)/12 text-(--color-accent)" : undefined}
                  >
                    {statusInfo.label}
                  </Badge>
                }
                progress={
                  <div className="flex items-center gap-2.5 pl-[22px]">
                    <ProgressBar value={project.progress} className="flex-1" />
                    <span className="text-[12px] font-semibold text-(--color-ink-muted)">{project.progress}%</span>
                  </div>
                }
                subtitle={
                  <div className="flex items-center gap-3 pl-[22px] text-[12px] text-(--color-ink-muted)">
                    <span className="flex items-center gap-1">
                      <CheckSquare className="size-3" strokeWidth={2} />
                      {project.tasksCount} {project.tasksCount === 1 ? "tarefa" : "tarefas"}
                    </span>
                    {project.overdueCount > 0 && (
                      <span className="font-semibold text-(--color-danger)">
                        {project.overdueCount} atrasada{project.overdueCount > 1 ? "s" : ""}
                      </span>
                    )}
                    {project.nextTask && (
                      <span className="flex min-w-0 items-center gap-1">
                        <ArrowRight className="size-3 shrink-0" strokeWidth={2} />
                        <span className="truncate">{project.nextTask}</span>
                      </span>
                    )}
                  </div>
                }
              />
            );
          })}
        </ListCard>
      )}

      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        spaces={spaces}
        onCreate={async ({ name, spaceId, status, color, dueDate }) => {
          await projectsRepo.create({ name, space_id: spaceId, status, color, due_date: dueDate });
          reload();
        }}
      />
    </div>
  );
}
