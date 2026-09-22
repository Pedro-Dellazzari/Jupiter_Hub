import { ArrowRight, CheckSquare, Circle } from "lucide-react";
import type { ProjectWithStats } from "../../../shared/queries/projectStats";
import { Badge } from "../../../shared/ui/Badge";
import { Card } from "../../../shared/ui/Card";
import { ProgressBar } from "../../../shared/ui/ProgressBar";
import { projectStatusInfo } from "../utils/projectStatus";

function formatDueChip(dueIso: string | null): string | null {
  if (!dueIso) return null;
  const [y, m, d] = dueIso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const label = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
  return `Prazo ${label}`;
}

/** Card de um projeto na visão em grade da tela de Projetos. */
export function ProjectCard({ project, onClick }: { project: ProjectWithStats; onClick: () => void }) {
  const statusInfo = projectStatusInfo(project.status);
  const dueChip = formatDueChip(project.due_date);

  return (
    <Card
      onClick={onClick}
      className="flex cursor-pointer flex-col gap-3 border border-(--color-divider) p-5 text-left transition-transform hover:scale-[1.005]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="size-3 shrink-0 rounded-[3px]" style={{ backgroundColor: project.color ?? "#007aff" }} />
          <span className="truncate text-[17px] font-bold text-(--color-ink)">{project.name}</span>
        </div>
        <Badge
          className={
            statusInfo.tone === "active" ? "shrink-0 bg-(--color-accent)/12 text-(--color-accent-text)" : "shrink-0"
          }
        >
          {statusInfo.label}
        </Badge>
      </div>

      {project.description && <p className="line-clamp-1 text-[13px] text-(--color-ink-muted)">{project.description}</p>}

      {(project.spaceName || dueChip) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {project.spaceName && (
            <span className="flex items-center gap-1 rounded-md bg-(--color-fill) px-2 py-1 text-[12px] text-(--color-ink-muted)">
              <Circle className="size-2.5" strokeWidth={2.5} />
              {project.spaceName}
            </span>
          )}
          {dueChip && (
            <span className="rounded-md bg-(--color-fill) px-2 py-1 text-[12px] text-(--color-ink-muted)">{dueChip}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-[12px] text-(--color-ink-muted)">
        <span>Progresso</span>
        <span className="font-bold text-(--color-ink)">{project.progress}%</span>
      </div>
      <ProgressBar value={project.progress} color={project.color ?? undefined} />

      <div className="flex items-center gap-3 border-t border-(--color-divider) pt-3 text-[12px] text-(--color-ink-muted)">
        <span className="flex shrink-0 items-center gap-1">
          <CheckSquare className="size-3" strokeWidth={2} />
          {project.tasksCount} {project.tasksCount === 1 ? "tarefa" : "tarefas"}
        </span>
        {project.overdueCount > 0 && (
          <span className="shrink-0 font-bold text-(--color-danger)">
            {project.overdueCount} atrasada{project.overdueCount > 1 ? "s" : ""}
          </span>
        )}
        {project.nextTask && (
          <span className="ml-auto flex min-w-0 items-center gap-1 text-right">
            <ArrowRight className="size-3 shrink-0" strokeWidth={2} />
            <span className="truncate">{project.nextTask}</span>
          </span>
        )}
      </div>
    </Card>
  );
}
