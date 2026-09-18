import { ArrowRight, CheckSquare } from "lucide-react";
import { Card } from "../../../shared/ui/Card";
import { Badge } from "../../../shared/ui/Badge";
import { ProgressBar } from "../../../shared/ui/ProgressBar";
import { useRepoList } from "../../../shared/hooks/useRepoList";
import { loadProjectsWithStats } from "../../../shared/queries/projectStats";

export function ProjectsSection() {
  const { state } = useRepoList(loadProjectsWithStats);
  if (state.status !== "ready" || state.items.length === 0) return null;

  const projects = state.items.slice(0, 4);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-[17px] font-semibold text-(--color-ink)">Projetos &amp; Tarefas</h2>
        <p className="text-[12px] text-(--color-ink-muted)">
          Visão consolidada do que está em andamento
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {projects.map((project) => (
          <Card key={project.id} className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2.5">
              <div
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: project.color ?? "#007aff" }}
              />
              <span className="text-[15px] font-semibold text-(--color-ink)">{project.name}</span>
              <div className="flex-1" />
              {project.spaceName && <Badge>{project.spaceName}</Badge>}
            </div>

            <div className="flex items-center gap-2.5">
              <ProgressBar value={project.progress} color={project.color ?? undefined} className="flex-1" />
              <span className="text-[12px] font-semibold text-(--color-ink-muted)">
                {project.progress}%
              </span>
            </div>

            <div className="flex items-center gap-3 text-[12px]">
              <span className="flex items-center gap-1 text-(--color-ink-muted)/70">
                <CheckSquare className="size-3" strokeWidth={2} />
                {project.tasksCount} {project.tasksCount === 1 ? "tarefa" : "tarefas"}
              </span>
              {project.overdueCount > 0 && (
                <span className="font-semibold text-(--color-danger)">
                  {project.overdueCount} atrasada{project.overdueCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {project.nextTask && (
              <>
                <div className="h-px w-full bg-(--color-track)" />
                <div className="flex items-center gap-2 text-[12px]">
                  <ArrowRight className="size-3 shrink-0 text-(--color-ink-muted)/70" strokeWidth={2} />
                  <span className="font-medium text-(--color-ink-muted)">{project.nextTask}</span>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
