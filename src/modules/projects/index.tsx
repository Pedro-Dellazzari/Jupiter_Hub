import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import { ArrowRight, CheckSquare, ChevronDown, FolderKanban, LayoutGrid, List as ListIcon, Plus } from "lucide-react";
import { motion } from "motion/react";
import { projectsRepo } from "../../db/repositories/projectsRepo";
import { spacesRepo } from "../../db/repositories/spacesRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { Badge } from "../../shared/ui/Badge";
import { ChipSelect } from "../../shared/ui/ChipSelect";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ListCard, ListRow } from "../../shared/ui/ListCard";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { ModuleHeader } from "../../shared/ui/ModuleHeader";
import { ProgressBar } from "../../shared/ui/ProgressBar";
import { springs } from "../../shared/motion/springs";
import { cn } from "../../shared/utils/cn";
import { loadProjectsWithStats, type ProjectWithStats } from "../../shared/queries/projectStats";
import { CreateProjectDialog } from "./components/CreateProjectDialog";
import { ProjectCard } from "./components/ProjectCard";
import { ProjectDetailView } from "./components/ProjectDetailView";
import { projectStatusBucket, projectStatusInfo } from "./utils/projectStatus";

type SortKey = "progress" | "name" | "due";
type StatusFilter = "all" | "active" | "planning" | "paused";
type ViewMode = "grid" | "list";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "progress", label: "Progresso" },
  { value: "name", label: "Nome" },
  { value: "due", label: "Prazo" },
];

const FILTER_TRIGGER_CLASS =
  "flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)";
const MENU_CONTENT_CLASS =
  "z-50 w-[160px] rounded-xl bg-(--color-surface-elevated) p-1.5 shadow-[0px_8px_24px_-2px_rgba(0,0,0,0.16)]";
const MENU_ITEM_CLASS =
  "cursor-pointer truncate rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-ink) outline-none data-[highlighted]:bg-(--color-fill)";

function sortProjects(items: ProjectWithStats[], sort: SortKey): ProjectWithStats[] {
  const sorted = [...items];
  if (sort === "progress") sorted.sort((a, b) => b.progress - a.progress);
  else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
  else sorted.sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"));
  return sorted;
}

export default function Projects() {
  const { state, reload } = useRepoList(loadProjectsWithStats);
  const spacesState = useRepoList(spacesRepo.list);
  const spaces = spacesState.state.status === "ready" ? spacesState.state.items : [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("progress");
  const [view, setView] = useState<ViewMode>("grid");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const items = state.status === "ready" ? state.items : [];
  const selectedProject = items.find((p) => p.id === selectedProjectId) ?? null;

  if (selectedProject) {
    return (
      <ProjectDetailView
        project={selectedProject}
        spaces={spaces}
        onBack={() => setSelectedProjectId(null)}
        onChanged={reload}
      />
    );
  }

  const counts = {
    all: items.length,
    active: items.filter((p) => projectStatusBucket(p.status) === "active").length,
    planning: items.filter((p) => projectStatusBucket(p.status) === "planning").length,
    paused: items.filter((p) => projectStatusBucket(p.status) === "paused").length,
  };
  const statusChipOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: `Todos · ${counts.all}` },
    { value: "active", label: `Em andamento · ${counts.active}` },
    { value: "planning", label: `Planejado · ${counts.planning}` },
    { value: "paused", label: `Pausado · ${counts.paused}` },
  ];
  const filtered = statusFilter === "all" ? items : items.filter((p) => projectStatusBucket(p.status) === statusFilter);
  const sorted = sortProjects(filtered, sort);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Progresso";

  const subtitle =
    items.length === 0
      ? undefined
      : `${items.length} ${items.length === 1 ? "projeto" : "projetos"}${counts.active > 0 ? ` · ${counts.active} em andamento` : ""}`;

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
            className="flex items-center gap-1.5 rounded-lg bg-(--color-accent) py-2 pr-3.5 pl-3 text-[12px] font-semibold text-(--color-accent-ink) hover:brightness-110"
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
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <ChipSelect options={statusChipOptions} value={statusFilter} onChange={setStatusFilter} />

            <div className="flex items-center gap-1.5">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className={FILTER_TRIGGER_CLASS}>
                    Ordenar: {sortLabel}
                    <ChevronDown className="size-3" strokeWidth={2} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content align="end" sideOffset={6} className={MENU_CONTENT_CLASS}>
                    {SORT_OPTIONS.map((option) => (
                      <DropdownMenu.Item key={option.value} onSelect={() => setSort(option.value)} className={MENU_ITEM_CLASS}>
                        {option.label}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              <div className="flex items-center gap-0.5 rounded-lg bg-(--color-fill) p-0.5">
                <button
                  onClick={() => setView("grid")}
                  title="Grade"
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md",
                    view === "grid" ? "bg-(--color-surface-elevated) text-(--color-ink) shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]" : "text-(--color-ink-muted) hover:text-(--color-ink)",
                  )}
                >
                  <LayoutGrid className="size-3.5" strokeWidth={2} />
                </button>
                <button
                  onClick={() => setView("list")}
                  title="Lista"
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md",
                    view === "list" ? "bg-(--color-surface-elevated) text-(--color-ink) shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]" : "text-(--color-ink-muted) hover:text-(--color-ink)",
                  )}
                >
                  <ListIcon className="size-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-(--color-ink-muted)">Nenhum projeto com esse status.</p>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {sorted.map((project) => (
                <ProjectCard key={project.id} project={project} onClick={() => setSelectedProjectId(project.id)} />
              ))}
            </div>
          ) : (
            <ListCard>
              {sorted.map((project) => {
                const statusInfo = projectStatusInfo(project.status);
                return (
                  <div key={project.id} onClick={() => setSelectedProjectId(project.id)} className="cursor-pointer">
                    <ListRow
                      leading={
                        <span
                          className="size-2.5 shrink-0 rounded-[3px]"
                          style={{ backgroundColor: project.color ?? "#007aff" }}
                        />
                      }
                      title={project.name}
                      trailing={
                        <Badge
                          className={statusInfo.tone === "active" ? "bg-(--color-accent)/12 text-(--color-accent-text)" : undefined}
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
                  </div>
                );
              })}
            </ListCard>
          )}
        </>
      )}

      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        spaces={spaces}
        onCreate={async ({ name, spaceId, status, color, description, dueDate }) => {
          await projectsRepo.create({ name, space_id: spaceId, status, color, description, due_date: dueDate });
          reload();
        }}
      />
    </div>
  );
}
