import type { TaskWithRelations } from "../../../db/repositories/tasksRepo";
import { groupTasksByCompletion } from "../utils/dateGroups";
import { TaskRow } from "./TaskRow";

/** Histórico de concluídas (filtro "Concluídas"), agrupado pela data de conclusão — tela de Tarefas e aba do Espaço. */
export function CompletedTaskList({
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
  /** Esconde o chip de Espaço das linhas (ex: dentro da página de um Espaço). */
  hideSpace?: boolean;
}) {
  const groups = groupTasksByCompletion(tasks.filter((t) => t.status === "done"), today);

  if (groups.length === 0) {
    return <p className="px-1 py-6 text-[13px] text-(--color-ink-muted)">Nenhuma tarefa concluída ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {groups.map((group) => (
        <div key={group.key} className="mb-2">
          <div className="mb-1 flex items-center gap-1.5 px-1 py-1.5 text-[12px] font-semibold text-(--color-ink-muted)">
            {group.label}
            <span className="font-normal text-(--color-ink-muted)/70">{group.tasks.length}</span>
          </div>
          <div className="flex flex-col divide-y divide-(--color-track)">
            {group.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                selected={task.id === selectedTaskId}
                hideSpace={hideSpace}
                showCompletedDate
                onSelect={onSelect}
                onToggleDone={onToggleDone}
                onSubtasksChanged={onSubtasksChanged}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
