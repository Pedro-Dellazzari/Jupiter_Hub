import { ArrowRight, CheckSquare } from "lucide-react";
import type { ProjectWithStats } from "../../../shared/queries/projectStats";
import { Badge } from "../../../shared/ui/Badge";
import { ListRow } from "../../../shared/ui/ListCard";
import { ProgressBar } from "../../../shared/ui/ProgressBar";
import { projectStatusInfo } from "../utils/projectStatus";

/** Linha de um projeto na visão em lista (dentro de um ListCard) — tela de Projetos e aba Projetos do Espaço. */
export function ProjectListRow({ project, onClick }: { project: ProjectWithStats; onClick: () => void }) {
  const statusInfo = projectStatusInfo(project.status);
  return (
    <div onClick={onClick} className="cursor-pointer">
      <ListRow
        leading={
          <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: project.color ?? "#007aff" }} />
        }
        title={project.name}
        trailing={
          <Badge className={statusInfo.tone === "active" ? "bg-(--color-accent)/12 text-(--color-accent-text)" : undefined}>
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
    </div>
  );
}
