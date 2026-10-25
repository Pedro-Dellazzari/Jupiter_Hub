import { useMemo, useState } from "react";
import { DropdownMenu } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CheckSquare, FolderKanban, Hexagon, MoreHorizontal, NotebookText } from "lucide-react";
import { spacesRepo, type SpaceWithStats } from "../../../db/repositories/spacesRepo";
import { notebooksRepo } from "../../../db/repositories/notebooksRepo";
import { tasksRepo } from "../../../db/repositories/tasksRepo";
import { Card } from "../../../shared/ui/Card";
import { ConfirmDialog } from "../../../shared/ui/ConfirmDialog";
import { Dialog } from "../../../shared/ui/Dialog";
import { ProgressBar } from "../../../shared/ui/ProgressBar";
import { useRepoList } from "../../../shared/hooks/useRepoList";
import { useBackHandler } from "../../../shared/hooks/useBackHandler";
import { useIsCompact } from "../../../shared/hooks/useIsCompact";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";
import { loadProjectsWithStats } from "../../../shared/queries/projectStats";
import { ProjectDetailView } from "../../projects/components/ProjectDetailView";
import { TaskDetailPanel } from "../../tasks/components/TaskDetailPanel";
import { SpaceProjectsTab } from "./SpaceProjectsTab";
import { SpaceTasksTab } from "./SpaceTasksTab";
import { TaskLine } from "./TaskLine";

const TABS = [
  { value: "overview", label: "Visão Geral" },
  { value: "tasks", label: "Tarefas" },
  { value: "projects", label: "Projetos" },
  { value: "notebooks", label: "Cadernos" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const PANEL_WIDTH = 400;

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

function DeleteSpaceDialog({
  space,
  open,
  onOpenChange,
  onDeleted,
}: {
  space: SpaceWithStats;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasContents = space.task_count > 0 || space.project_count > 0;

  async function handleDelete(deleteContents: boolean) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await spacesRepo.remove(space.id, { deleteContents });
      onOpenChange(false);
      onDeleted();
    } catch {
      setError("Não foi possível excluir. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasContents) {
    return (
      <ConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`Excluir "${space.name}"?`}
        confirmLabel="Excluir"
        onConfirm={() => handleDelete(false)}
      />
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) {
          onOpenChange(next);
          if (!next) setError(null);
        }
      }}
      title="Deletar todas tarefas e projetos desse espaço?"
      description={`"${space.name}" tem ${space.task_count} tarefas e ${space.project_count} projetos. Se escolher "Não", só o Espaço é excluído e eles ficam sem Espaço.`}
    >
      {error && <p className="mb-3 text-[12px] text-(--color-danger)">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => handleDelete(false)}
          disabled={submitting}
          className="rounded-lg bg-(--color-fill) px-3 py-2 text-[13px] font-medium text-(--color-ink) hover:bg-(--color-divider) disabled:opacity-40"
        >
          Não
        </button>
        <button
          onClick={() => handleDelete(true)}
          disabled={submitting}
          className="rounded-lg bg-(--color-danger) px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          Sim
        </button>
      </div>
    </Dialog>
  );
}

export function SpaceDetailView({
  space,
  onBack,
  onDeleted,
  onChanged,
}: {
  space: SpaceWithStats;
  onBack: () => void;
  onDeleted: () => void;
  /** Avisa a tela de Espaços para recarregar as contagens após criar/mudar tarefas e projetos aqui. */
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const tasksState = useRepoList(tasksRepo.listWithRelations);
  const projectsState = useRepoList(loadProjectsWithStats);
  const notebooksState = useRepoList(notebooksRepo.list);
  const spacesState = useRepoList(spacesRepo.list);
  const today = useMemo(() => new Date(), []);
  const allProjects = projectsState.state.status === "ready" ? projectsState.state.items : [];
  const spaces = spacesState.state.status === "ready" ? spacesState.state.items : [];

  function reloadAll() {
    tasksState.reload();
    projectsState.reload();
    onChanged();
  }

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
  const selectedTask = tab === "tasks" ? (tasks.find((t) => t.id === selectedTaskId) ?? null) : null;
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const compact = useIsCompact();
  useBackHandler(selectedTask !== null, () => setSelectedTaskId(null));
  useBackHandler(selectedProject !== null, () => setSelectedProjectId(null));

  if (selectedProject) {
    return (
      <ProjectDetailView
        project={selectedProject}
        spaces={spaces}
        onBack={() => setSelectedProjectId(null)}
        onChanged={reloadAll}
      />
    );
  }

  return (
    <div className="flex h-full">
      <div className="h-full min-w-0 flex-1 overflow-y-auto px-10 py-8 compact:px-4 compact:pt-3 compact:pb-24">
        <button
          onClick={onBack}
          className="mb-5 flex items-center gap-1 text-[12px] font-medium text-(--color-ink-muted) hover:text-(--color-ink) compact:mb-3 compact:text-[15px] compact:text-(--color-accent-text)"
        >
          <ArrowLeft className="size-3 compact:size-4" strokeWidth={2} />
          Espaços
          <span className="text-(--color-ink-muted)/60 compact:hidden">/</span>
          <span className="text-(--color-ink) compact:hidden">{space.name}</span>
        </button>

        <div className="mb-6 flex items-center gap-3.5">
          <div
            className="flex size-[46px] shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: space.color ?? "#007aff" }}
          >
            <Hexagon className="size-[18px] text-white" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] leading-[1.05] font-bold tracking-[-0.4px] text-(--color-ink)">{space.name}</h1>
            {space.description && <p className="mt-0.5 text-[13px] text-(--color-ink-muted)">{space.description}</p>}
          </div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--color-fill) text-(--color-ink-muted) hover:text-(--color-ink)">
                <MoreHorizontal className="size-4" strokeWidth={2} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 w-[180px] rounded-xl bg-(--color-surface-elevated) p-1.5 shadow-[0px_8px_24px_-2px_rgba(0,0,0,0.16)]"
              >
                <DropdownMenu.Item
                  onSelect={() => setConfirmingDelete(true)}
                  className="cursor-pointer truncate rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-danger) outline-none data-[highlighted]:bg-(--color-danger)/10"
                >
                  Excluir espaço
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <div className="mb-5 flex items-center gap-1 overflow-x-auto border-b border-(--color-divider) compact:gap-3">
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
          <SpaceTasksTab
            space={space}
            tasks={tasks}
            spaceProjects={projects}
            allProjects={allProjects}
            spaces={spaces}
            today={today}
            selectedTaskId={selectedTaskId}
            onSelect={setSelectedTaskId}
            onChanged={reloadAll}
            onSpacesChanged={() => {
              spacesState.reload();
              onChanged();
            }}
          />
        )}

        {tab === "projects" && (
          <SpaceProjectsTab
            space={space}
            projects={projects}
            spaces={spaces}
            onOpenProject={setSelectedProjectId}
            onChanged={reloadAll}
          />
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

        <DeleteSpaceDialog
          space={space}
          open={confirmingDelete}
          onOpenChange={setConfirmingDelete}
          onDeleted={onDeleted}
        />
      </div>

      <AnimatePresence>
        {selectedTask && compact && (
          <motion.div
            key="task-detail-screen"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={springs.standard}
            className="absolute inset-0 z-30 overflow-y-auto bg-(--color-surface-elevated)"
          >
            <TaskDetailPanel
              key={selectedTask.id}
              task={selectedTask}
              projects={allProjects}
              spaces={spaces}
              onClose={() => setSelectedTaskId(null)}
              onChanged={reloadAll}
            />
          </motion.div>
        )}
        {selectedTask && !compact && (
          <motion.aside
            key="task-detail"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: PANEL_WIDTH, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={springs.standard}
            className="h-full shrink-0 overflow-hidden border-l border-(--color-divider) bg-(--color-surface-elevated)"
          >
            <div className="h-full overflow-y-auto" style={{ width: PANEL_WIDTH }}>
              <TaskDetailPanel
                key={selectedTask.id}
                task={selectedTask}
                projects={allProjects}
                spaces={spaces}
                onClose={() => setSelectedTaskId(null)}
                onChanged={reloadAll}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
