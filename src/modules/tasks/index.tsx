import { useMemo, useState } from "react";
import { DropdownMenu } from "radix-ui";
import { CheckSquare, ChevronDown, Flag, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { tasksRepo } from "../../db/repositories/tasksRepo";
import { projectsRepo } from "../../db/repositories/projectsRepo";
import { spacesRepo } from "../../db/repositories/spacesRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { springs } from "../../shared/motion/springs";
import { cn } from "../../shared/utils/cn";
import { CompletedTaskList } from "./components/CompletedTaskList";
import { CreateTaskDialog } from "./components/CreateTaskDialog";
import { StatusFilterChips, type TaskStatusFilter } from "./components/StatusFilterChips";
import { TaskBoard } from "./components/TaskBoard";
import { TaskDetailPanel } from "./components/TaskDetailPanel";
import { TaskGroupedList } from "./components/TaskGroupedList";
import { PRIORITY_OPTIONS } from "./utils/priority";

const FILTER_TRIGGER_CLASS =
  "flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)";
const MENU_CONTENT_CLASS =
  "z-50 w-[190px] rounded-xl bg-(--color-surface-elevated) p-1.5 shadow-[0px_8px_24px_-2px_rgba(0,0,0,0.16)]";
const MENU_ITEM_CLASS =
  "cursor-pointer truncate rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-ink) outline-none data-[highlighted]:bg-(--color-fill)";

const PANEL_WIDTH = 400;

export default function Tasks() {
  const tasksState = useRepoList(tasksRepo.listWithRelations);
  const projectsState = useRepoList(projectsRepo.list);
  const spacesState = useRepoList(spacesRepo.list);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<"list" | "board">("list");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [spaceFilter, setSpaceFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const projects = projectsState.state.status === "ready" ? projectsState.state.items : [];
  const spaces = spacesState.state.status === "ready" ? spacesState.state.items : [];

  const hasError = tasksState.state.status === "error";
  const tasks = tasksState.state.status === "ready" ? tasksState.state.items : [];
  const filteredTasks = tasks.filter(
    (t) => (!spaceFilter || t.space_id === spaceFilter) && (!priorityFilter || t.priority === priorityFilter),
  );
  const spaceFilterLabel = spaceFilter ? (spaces.find((s) => s.id === spaceFilter)?.name ?? "Espaço") : "Todos os Espaços";
  const priorityFilterLabel = priorityFilter
    ? (PRIORITY_OPTIONS.find((o) => o.value === priorityFilter)?.label ?? "Prioridade")
    : "Prioridade";
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  return (
    <div className="flex h-full">
      <div className="h-full min-w-0 flex-1 overflow-y-auto px-10 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-(--color-ink)">Tarefas</h1>
          <div className="flex items-center gap-2">
            {/* O histórico de concluídas é sempre uma lista, então o seletor Lista/Board some nele. */}
            <div
              className={cn(
                "flex items-center gap-0.5 rounded-lg bg-(--color-fill) p-0.5",
                statusFilter === "done" && "hidden",
              )}
            >
              <button
                onClick={() => setView("list")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-semibold",
                  view === "list"
                    ? "bg-(--color-surface-elevated) text-(--color-ink) shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]"
                    : "text-(--color-ink-muted) hover:text-(--color-ink)",
                )}
              >
                Lista
              </button>
              <button
                onClick={() => setView("board")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-semibold",
                  view === "board"
                    ? "bg-(--color-surface-elevated) text-(--color-ink) shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]"
                    : "text-(--color-ink-muted) hover:text-(--color-ink)",
                )}
              >
                Board
              </button>
            </div>
            <motion.button
              onClick={() => setDialogOpen(true)}
              whileHover={{ scale: 1.03, transition: springs.snappy }}
              whileTap={{ scale: 0.97, transition: springs.snappy }}
              className="flex items-center gap-1.5 rounded-lg bg-(--color-accent) py-2 pr-3.5 pl-3 text-[12px] font-semibold text-(--color-accent-ink) hover:brightness-110"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
              Nova tarefa
            </motion.button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <StatusFilterChips value={statusFilter} onChange={setStatusFilter} />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={FILTER_TRIGGER_CLASS}>
                {spaceFilterLabel}
                <ChevronDown className="size-3" strokeWidth={2} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="start" sideOffset={6} className={MENU_CONTENT_CLASS}>
                <DropdownMenu.Item onSelect={() => setSpaceFilter(null)} className={MENU_ITEM_CLASS}>
                  Todos os Espaços
                </DropdownMenu.Item>
                {spaces.map((space) => (
                  <DropdownMenu.Item key={space.id} onSelect={() => setSpaceFilter(space.id)} className={MENU_ITEM_CLASS}>
                    {space.name}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={cn(FILTER_TRIGGER_CLASS, priorityFilter && "text-(--color-ink)")}>
                <Flag className="size-3" strokeWidth={2} />
                {priorityFilterLabel}
                <ChevronDown className="size-3" strokeWidth={2} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="start" sideOffset={6} className={MENU_CONTENT_CLASS}>
                <DropdownMenu.Item onSelect={() => setPriorityFilter(null)} className={MENU_ITEM_CLASS}>
                  Todas as prioridades
                </DropdownMenu.Item>
                {[...PRIORITY_OPTIONS].reverse().map((option) => (
                  <DropdownMenu.Item
                    key={option.value}
                    onSelect={() => setPriorityFilter(option.value)}
                    className={MENU_ITEM_CLASS}
                  >
                    {option.label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {tasksState.state.status === "loading" && null}
        {hasError && <ModuleErrorState />}
        {tasksState.state.status === "ready" && filteredTasks.length === 0 && (
          <EmptyState
            icon={CheckSquare}
            title="Nenhuma tarefa ainda"
            description="Organize seu dia criando sua primeira tarefa."
            ctaLabel="+ Nova tarefa"
            onAction={() => setDialogOpen(true)}
          />
        )}
        {tasksState.state.status === "ready" && filteredTasks.length > 0 && statusFilter === "done" && (
          <CompletedTaskList
            tasks={filteredTasks}
            today={today}
            selectedTaskId={selectedTaskId}
            onSelect={setSelectedTaskId}
            onToggleDone={(id, done) => tasksRepo.toggleDone(id, done).then(tasksState.reload)}
            onSubtasksChanged={tasksState.reload}
          />
        )}

        {tasksState.state.status === "ready" && filteredTasks.length > 0 && statusFilter !== "done" && view === "list" && (
          <TaskGroupedList
            tasks={filteredTasks}
            today={today}
            selectedTaskId={selectedTaskId}
            onSelect={setSelectedTaskId}
            onToggleDone={(id, done) => tasksRepo.toggleDone(id, done).then(tasksState.reload)}
            onChanged={tasksState.reload}
            completedGroup={statusFilter === "all"}
            onShowAllCompleted={() => setStatusFilter("done")}
          />
        )}

        {tasksState.state.status === "ready" && filteredTasks.length > 0 && statusFilter !== "done" && view === "board" && (
          <TaskBoard
            tasks={filteredTasks}
            today={today}
            selectedTaskId={selectedTaskId}
            onSelect={setSelectedTaskId}
            onToggleDone={(id, done) => tasksRepo.toggleDone(id, done).then(tasksState.reload)}
            onChanged={tasksState.reload}
            hideDoneColumn={statusFilter === "open"}
            onShowAllCompleted={() => setStatusFilter("done")}
          />
        )}
      </div>

      <AnimatePresence>
        {selectedTask && (
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
                projects={projects}
                spaces={spaces}
                onClose={() => setSelectedTaskId(null)}
                onChanged={tasksState.reload}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projects={projects}
        spaces={spaces}
        defaultSpaceId={spaceFilter}
        onCreateSpace={async (name) => {
          const space = await spacesRepo.create({ name });
          spacesState.reload();
          return space;
        }}
        onCreate={async ({ title, projectId, spaceId, priority, dueDate }) => {
          await tasksRepo.create({ title, project_id: projectId, space_id: spaceId, priority, due_date: dueDate });
          // A tarefa nova está aberta: no histórico ela não apareceria.
          if (statusFilter === "done") setStatusFilter("all");
          tasksState.reload();
        }}
      />
    </div>
  );
}
