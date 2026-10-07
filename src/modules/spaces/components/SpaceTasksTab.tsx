import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import { ChevronDown, Flag, Plus } from "lucide-react";
import { motion } from "motion/react";
import type { Project } from "../../../db/repositories/projectsRepo";
import { spacesRepo, type Space } from "../../../db/repositories/spacesRepo";
import { tasksRepo, type TaskWithRelations } from "../../../db/repositories/tasksRepo";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";
import { CreateTaskDialog } from "../../tasks/components/CreateTaskDialog";
import { TaskBoard } from "../../tasks/components/TaskBoard";
import { TaskGroupedList } from "../../tasks/components/TaskGroupedList";
import { PRIORITY_OPTIONS } from "../../tasks/utils/priority";
import { TaskQuickAdd } from "./TaskQuickAdd";

const FILTER_TRIGGER_CLASS =
  "flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)";
const MENU_CONTENT_CLASS =
  "z-50 w-[190px] rounded-xl bg-(--color-surface-elevated) p-1.5 shadow-[0px_8px_24px_-2px_rgba(0,0,0,0.16)]";
const MENU_ITEM_CLASS =
  "cursor-pointer truncate rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-ink) outline-none data-[highlighted]:bg-(--color-fill)";

/** Aba Tarefas do Espaço: uma versão menor da tela de Tarefas, só com as tarefas deste Espaço. */
export function SpaceTasksTab({
  space,
  tasks,
  spaceProjects,
  allProjects,
  spaces,
  today,
  selectedTaskId,
  onSelect,
  onChanged,
  onSpacesChanged,
}: {
  space: Space;
  /** Tarefas cujo Espaço efetivo é este (próprio ou herdado do projeto). */
  tasks: TaskWithRelations[];
  spaceProjects: Project[];
  allProjects: Project[];
  spaces: Space[];
  today: Date;
  selectedTaskId: string | null;
  onSelect: (id: string) => void;
  /** Recarrega tarefas/projetos/contagens após criar ou mudar uma tarefa aqui. */
  onChanged: () => void;
  onSpacesChanged: () => void;
}) {
  const [view, setView] = useState<"list" | "board">("list");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredTasks = priorityFilter ? tasks.filter((t) => t.priority === priorityFilter) : tasks;
  const priorityFilterLabel = priorityFilter
    ? (PRIORITY_OPTIONS.find((o) => o.value === priorityFilter)?.label ?? "Prioridade")
    : "Prioridade";
  const toggleDone = (id: string, done: boolean) => tasksRepo.toggleDone(id, done).then(onChanged);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setPriorityFilter(null)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[12px]",
              priorityFilter
                ? "font-medium text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)"
                : "bg-(--color-accent)/12 font-semibold text-(--color-accent-text)",
            )}
          >
            Todas
          </button>
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

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-(--color-fill) p-0.5">
            {(["list", "board"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-semibold",
                  view === mode
                    ? "bg-(--color-surface-elevated) text-(--color-ink) shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]"
                    : "text-(--color-ink-muted) hover:text-(--color-ink)",
                )}
              >
                {mode === "list" ? "Lista" : "Board"}
              </button>
            ))}
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

      <TaskQuickAdd
        spaceName={space.name}
        projects={spaceProjects}
        today={today}
        onCreate={async ({ title, projectId, priority, dueDate }) => {
          // Com projeto, o Espaço é herdado dele (mesma regra do diálogo "Nova tarefa").
          await tasksRepo.create({
            title,
            project_id: projectId,
            space_id: projectId ? null : space.id,
            priority,
            due_date: dueDate,
          });
          onChanged();
        }}
      />

      {filteredTasks.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-(--color-ink-muted)">
          {tasks.length === 0 ? "Nenhuma tarefa neste Espaço ainda — crie a primeira acima." : "Nenhuma tarefa com essa prioridade."}
        </p>
      ) : view === "list" ? (
        <TaskGroupedList
          tasks={filteredTasks}
          today={today}
          selectedTaskId={selectedTaskId}
          onSelect={onSelect}
          onToggleDone={toggleDone}
          onSubtasksChanged={onChanged}
          hideSpace
        />
      ) : (
        <TaskBoard
          tasks={filteredTasks}
          today={today}
          selectedTaskId={selectedTaskId}
          onSelect={onSelect}
          onToggleDone={toggleDone}
          onChanged={onChanged}
          hideSpace
        />
      )}

      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projects={allProjects}
        spaces={spaces}
        defaultSpaceId={space.id}
        onCreateSpace={async (name) => {
          const created = await spacesRepo.create({ name });
          onSpacesChanged();
          return created;
        }}
        onCreate={async ({ title, projectId, spaceId, priority, dueDate }) => {
          await tasksRepo.create({ title, project_id: projectId, space_id: spaceId, priority, due_date: dueDate });
          onChanged();
        }}
      />
    </>
  );
}
