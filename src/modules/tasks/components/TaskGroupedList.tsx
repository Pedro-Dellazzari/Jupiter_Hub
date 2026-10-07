import { AlertCircle, CalendarDays, CalendarOff, Clock, Sun } from "lucide-react";
import type { TaskWithRelations } from "../../../db/repositories/tasksRepo";
import { cn } from "../../../shared/utils/cn";
import { groupTasksByDueDate, type TaskGroupKey } from "../utils/dateGroups";
import { sortByPriority } from "../utils/priority";
import { TaskRow } from "./TaskRow";

const GROUP_ICONS: Record<TaskGroupKey, typeof AlertCircle> = {
  overdue: AlertCircle,
  today: Sun,
  week: CalendarDays,
  later: Clock,
  noDate: CalendarOff,
};

/** Lista de tarefas agrupada por prazo (Atrasadas / Hoje / Esta semana / ...) — tela de Tarefas e aba Tarefas do Espaço. */
export function TaskGroupedList({
  tasks,
  today,
  selectedTaskId,
  onSelect,
  onToggleDone,
  onSubtasksChanged,
  hideSpace,
}: {
  tasks: TaskWithRelations[];
  today: Date;
  selectedTaskId: string | null;
  onSelect: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
  onSubtasksChanged: () => void;
  /** Esconde o chip de Espaço das linhas (ex: dentro da página de um Espaço, onde ele seria sempre o mesmo). */
  hideSpace?: boolean;
}) {
  const groups = groupTasksByDueDate(tasks, today);

  return (
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
              {sortByPriority(group.tasks).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  selected={task.id === selectedTaskId}
                  hideSpace={hideSpace}
                  onSelect={onSelect}
                  onToggleDone={onToggleDone}
                  onSubtasksChanged={onSubtasksChanged}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
