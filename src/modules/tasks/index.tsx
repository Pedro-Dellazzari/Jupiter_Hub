import { useMemo, useState } from "react";
import { DropdownMenu } from "radix-ui";
import { AlertCircle, CalendarDays, CalendarOff, CheckSquare, ChevronDown, Clock, Plus, Sun } from "lucide-react";
import { motion } from "motion/react";
import { tasksRepo } from "../../db/repositories/tasksRepo";
import { projectsRepo } from "../../db/repositories/projectsRepo";
import { spacesRepo } from "../../db/repositories/spacesRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { springs } from "../../shared/motion/springs";
import { cn } from "../../shared/utils/cn";
import { CreateTaskDialog } from "./components/CreateTaskDialog";
import { TaskRow } from "./components/TaskRow";
import { groupTasksByDueDate, type TaskGroupKey } from "./utils/dateGroups";

const GROUP_ICONS: Record<TaskGroupKey, typeof AlertCircle> = {
  overdue: AlertCircle,
  today: Sun,
  week: CalendarDays,
  later: Clock,
  noDate: CalendarOff,
};

export default function Tasks() {
  const tasksState = useRepoList(tasksRepo.listWithRelations);
  const projectsState = useRepoList(projectsRepo.list);
  const spacesState = useRepoList(spacesRepo.list);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [spaceFilter, setSpaceFilter] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const projects = projectsState.state.status === "ready" ? projectsState.state.items : [];
  const spaces = spacesState.state.status === "ready" ? spacesState.state.items : [];

  const hasError = tasksState.state.status === "error";
  const tasks = tasksState.state.status === "ready" ? tasksState.state.items : [];
  const filteredTasks = spaceFilter ? tasks.filter((t) => t.space_id === spaceFilter) : tasks;
  const groups = groupTasksByDueDate(filteredTasks, today);
  const filterLabel = spaceFilter ? (spaces.find((s) => s.id === spaceFilter)?.name ?? "Espaço") : "Todos os Espaços";

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[24px] font-bold tracking-[-0.5px] text-(--color-ink)">Tarefas</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-(--color-fill) p-0.5">
            <button className="rounded-md bg-(--color-surface-elevated) px-3 py-1.5 text-[12px] font-semibold text-(--color-ink) shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]">
              Lista
            </button>
            <button
              disabled
              title="Em breve"
              className="cursor-not-allowed rounded-md px-3 py-1.5 text-[12px] font-medium text-(--color-ink-muted) opacity-60"
            >
              Board
            </button>
          </div>
          <motion.button
            onClick={() => setDialogOpen(true)}
            whileHover={{ scale: 1.03, transition: springs.snappy }}
            whileTap={{ scale: 0.97, transition: springs.snappy }}
            className="flex items-center gap-1.5 rounded-lg bg-(--color-accent) py-2 pr-3.5 pl-3 text-[12px] font-semibold text-white hover:brightness-110"
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            Nova tarefa
          </motion.button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-1.5">
        <span className="rounded-lg bg-(--color-accent)/12 px-3 py-1.5 text-[12px] font-semibold text-(--color-accent)">
          Todas
        </span>
        <button
          disabled
          title="Em breve"
          className="cursor-not-allowed rounded-lg px-3 py-1.5 text-[12px] font-medium text-(--color-ink-muted) opacity-60"
        >
          Tarefas
        </button>
        <button
          disabled
          title="Em breve"
          className="cursor-not-allowed rounded-lg px-3 py-1.5 text-[12px] font-medium text-(--color-ink-muted) opacity-60"
        >
          Projetos
        </button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)">
              {filterLabel}
              <ChevronDown className="size-3" strokeWidth={2} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={6}
              className="z-50 w-[190px] rounded-xl bg-(--color-surface-elevated) p-1.5 shadow-[0px_8px_24px_-2px_rgba(0,0,0,0.16)]"
            >
              <DropdownMenu.Item
                onSelect={() => setSpaceFilter(null)}
                className="cursor-pointer rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-ink) outline-none data-[highlighted]:bg-(--color-fill)"
              >
                Todos os Espaços
              </DropdownMenu.Item>
              {spaces.map((space) => (
                <DropdownMenu.Item
                  key={space.id}
                  onSelect={() => setSpaceFilter(space.id)}
                  className="cursor-pointer truncate rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-ink) outline-none data-[highlighted]:bg-(--color-fill)"
                >
                  {space.name}
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
      {tasksState.state.status === "ready" && filteredTasks.length > 0 && (
        <div className="flex flex-col gap-1">
          {groups.map((group) => {
            const Icon = GROUP_ICONS[group.key];
            return (
              <div key={group.key} className="mb-2">
                <div
                  className={cn(
                    "mb-1 flex items-center gap-1.5 px-1 py-1.5 text-[12px] font-semibold",
                    group.key === "overdue" ? "text-(--color-danger)" : "text-(--color-ink-muted)",
                  )}
                >
                  <Icon className="size-3" strokeWidth={2} />
                  {group.label}
                  <span className="font-normal text-(--color-ink-muted)/70">{group.tasks.length}</span>
                </div>
                <div className="flex flex-col divide-y divide-(--color-track)">
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      today={today}
                      onToggleDone={(id, done) => tasksRepo.toggleDone(id, done).then(tasksState.reload)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projects={projects}
        onCreate={async ({ title, projectId, priority, dueDate }) => {
          await tasksRepo.create({ title, project_id: projectId, priority, due_date: dueDate });
          tasksState.reload();
        }}
      />
    </div>
  );
}
