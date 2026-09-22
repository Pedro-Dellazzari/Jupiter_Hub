import { useMemo, useState } from "react";
import { ArrowLeft, CheckSquare, FolderKanban, Hexagon, NotebookText } from "lucide-react";
import type { SpaceWithStats } from "../../../db/repositories/spacesRepo";
import { notebooksRepo } from "../../../db/repositories/notebooksRepo";
import { tasksRepo } from "../../../db/repositories/tasksRepo";
import { Card } from "../../../shared/ui/Card";
import { ProgressBar } from "../../../shared/ui/ProgressBar";
import { useRepoList } from "../../../shared/hooks/useRepoList";
import { cn } from "../../../shared/utils/cn";
import { loadProjectsWithStats } from "../../../shared/queries/projectStats";
import { TaskLine } from "./TaskLine";

const TABS = [
  { value: "overview", label: "Visão Geral" },
  { value: "tasks", label: "Tarefas" },
  { value: "projects", label: "Projetos" },
  { value: "notebooks", label: "Cadernos" },
] as const;

type Tab = (typeof TABS)[number]["value"];

function Panel({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-1 flex-col gap-2.5 p-[18px] shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-1.5 text-[14px] font-semibold text-(--color-ink)">
        {icon}
        <span>{title}</span>
        <span className="text-[12px] font-normal text-(--color-ink-muted)/70">{count}</span>
      </div>
      {children}
    </Card>
  );
}

function ProjectMiniCard({ project }: { project: { id: string; name: string; progress: number; color: string | null } }) {
  return (
    <div className="flex flex-col gap-2 rounded-[10px] bg-(--color-fill) p-3">
      <span className="text-[13px] font-semibold text-(--color-ink)">{project.name}</span>
      <ProgressBar value={project.progress} color={project.color ?? undefined} />
      <span className="text-[11px] text-(--color-ink-muted)/70">{project.progress}% concluído</span>
    </div>
  );
}

export function SpaceDetailView({ space, onBack }: { space: SpaceWithStats; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const tasksState = useRepoList(tasksRepo.listWithRelations);
  const projectsState = useRepoList(loadProjectsWithStats);
  const notebooksState = useRepoList(notebooksRepo.list);

  const tasks = useMemo(
    () => (tasksState.state.status === "ready" ? tasksState.state.items.filter((t) => t.space_id === space.id) : []),
    [tasksState.state, space.id],
  );
  const projects = useMemo(
    () =>
      projectsState.state.status === "ready"
        ? projectsState.state.items.filter((p) => p.space_id === space.id)
        : [],
    [projectsState.state, space.id],
  );
  const notebooks = useMemo(
    () =>
      notebooksState.state.status === "ready" ? notebooksState.state.items.filter((n) => n.space_id === space.id && !n.parent_id) : [],
    [notebooksState.state, space.id],
  );

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-1 text-[12px] font-medium text-(--color-ink-muted) hover:text-(--color-ink)"
      >
        <ArrowLeft className="size-3" strokeWidth={2} />
        Espaços
        <span className="text-(--color-ink-muted)/60">/</span>
        <span className="text-(--color-ink)">{space.name}</span>
      </button>

      <div className="mb-6 flex items-center gap-3.5">
        <div
          className="flex size-[46px] shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: space.color ?? "#007aff" }}
        >
          <Hexagon className="size-[18px] text-white" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-[22px] leading-[1.05] font-bold tracking-[-0.4px] text-(--color-ink)">{space.name}</h1>
          {space.description && <p className="mt-0.5 text-[13px] text-(--color-ink-muted)">{space.description}</p>}
        </div>
      </div>

      <div className="mb-5 flex items-center gap-1 border-b border-(--color-divider)">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "border-b-2 px-1 pb-2 text-[14px]",
              tab === t.value
                ? "border-(--color-accent) font-semibold text-(--color-ink)"
                : "border-transparent font-medium text-(--color-ink-muted) hover:text-(--color-ink)",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Tarefas" count={tasks.length} icon={<CheckSquare className="size-3.5" strokeWidth={2} />}>
            {tasks.length === 0 ? (
              <p className="text-[12px] text-(--color-ink-muted)">Nenhuma tarefa neste Espaço.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {tasks.slice(0, 5).map((task) => (
                  <TaskLine
                    key={task.id}
                    task={task}
                    onToggleDone={(id, done) => tasksRepo.toggleDone(id, done).then(tasksState.reload)}
                  />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Projetos" count={projects.length} icon={<FolderKanban className="size-3.5" strokeWidth={2} />}>
            {projects.length === 0 ? (
              <p className="text-[12px] text-(--color-ink-muted)">Nenhum projeto neste Espaço.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {projects.slice(0, 4).map((project) => (
                  <ProjectMiniCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Cadernos" count={notebooks.length} icon={<NotebookText className="size-3.5" strokeWidth={2} />}>
            {notebooks.length === 0 ? (
              <p className="text-[12px] text-(--color-ink-muted)">Nenhum caderno neste Espaço.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {notebooks.slice(0, 5).map((notebook) => (
                  <div key={notebook.id} className="flex items-center gap-2">
                    <NotebookText className="size-3 shrink-0 text-(--color-ink-muted)" strokeWidth={2} />
                    <span className="truncate text-[13px] font-medium text-(--color-ink)">{notebook.name}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === "tasks" && (
        <Card className="flex flex-col gap-3 p-[18px] shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]">
          {tasks.length === 0 ? (
            <p className="text-[13px] text-(--color-ink-muted)">Nenhuma tarefa neste Espaço.</p>
          ) : (
            tasks.map((task) => (
              <TaskLine
                key={task.id}
                task={task}
                onToggleDone={(id, done) => tasksRepo.toggleDone(id, done).then(tasksState.reload)}
              />
            ))
          )}
        </Card>
      )}

      {tab === "projects" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.length === 0 ? (
            <p className="text-[13px] text-(--color-ink-muted)">Nenhum projeto neste Espaço.</p>
          ) : (
            projects.map((project) => <ProjectMiniCard key={project.id} project={project} />)
          )}
        </div>
      )}

      {tab === "notebooks" && (
        <Card className="flex flex-col gap-3 p-[18px] shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]">
          {notebooks.length === 0 ? (
            <p className="text-[13px] text-(--color-ink-muted)">Nenhum caderno neste Espaço.</p>
          ) : (
            notebooks.map((notebook) => (
              <div key={notebook.id} className="flex items-center gap-2">
                <NotebookText className="size-3.5 shrink-0 text-(--color-ink-muted)" strokeWidth={2} />
                <span className="truncate text-[13px] font-medium text-(--color-ink)">{notebook.name}</span>
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  );
}
