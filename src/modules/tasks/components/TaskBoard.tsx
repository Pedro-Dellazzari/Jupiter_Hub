import { useState } from "react";
import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { tasksRepo, type TaskWithRelations } from "../../../db/repositories/tasksRepo";
import { isRecentlyDone, RECENT_DONE_DAYS, sortByCompletion } from "../utils/dateGroups";
import { sortByPriority } from "../utils/priority";
import { cn } from "../../../shared/utils/cn";
import { TaskCard } from "./TaskCard";

type BoardStatus = "todo" | "in_progress" | "done";

const COLUMNS: { key: BoardStatus; label: string; icon: typeof Circle; color: string }[] = [
  { key: "todo", label: "A Fazer", icon: Circle, color: "var(--color-ink-muted)" },
  { key: "in_progress", label: "Em Andamento", icon: CircleDot, color: "var(--color-accent)" },
  { key: "done", label: "Concluído", icon: CheckCircle2, color: "var(--color-accent)" },
];

function columnOf(task: TaskWithRelations): BoardStatus {
  if (task.status === "done") return "done";
  if (task.status === "in_progress") return "in_progress";
  return "todo";
}

/**
 * Board Kanban da tela de Tarefas: colunas A Fazer / Em Andamento / Concluído, com arrastar-e-soltar entre elas.
 * A coluna Concluído mostra só as concluídas recentes; as mais antigas ficam no histórico (filtro "Concluídas").
 */
export function TaskBoard({
  tasks,
  today,
  selectedTaskId,
  onSelect,
  onToggleDone,
  onChanged,
  hideDoneColumn,
  onShowAllCompleted,
  hideSpace,
}: {
  tasks: TaskWithRelations[];
  today: Date;
  selectedTaskId: string | null;
  onSelect: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
  /** Avisa a tela de Tarefas para recarregar a lista após mover uma tarefa de coluna. */
  onChanged: () => void;
  /** Esconde a coluna Concluído (filtro "Abertas"). */
  hideDoneColumn: boolean;
  /** Abre o histórico completo (filtro "Concluídas") a partir do link de concluídas mais antigas. */
  onShowAllCompleted: () => void;
  /** Esconde o chip de Espaço dos cards (ex: dentro da página de um Espaço). */
  hideSpace?: boolean;
}) {
  const [dragOverColumn, setDragOverColumn] = useState<BoardStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function moveTo(id: string, status: BoardStatus) {
    if (tasks.find((t) => t.id === id && columnOf(t) === status)) return;
    tasksRepo.setStatus(id, status).then(onChanged);
  }

  const doneTasks = tasks.filter((t) => columnOf(t) === "done");
  const recentDone = sortByCompletion(doneTasks.filter((t) => isRecentlyDone(t, today)));
  const olderDoneCount = doneTasks.length - recentDone.length;
  const columns = hideDoneColumn ? COLUMNS.filter((c) => c.key !== "done") : COLUMNS;

  return (
    <div className="flex items-start gap-4 compact:-mx-4 compact:snap-x compact:snap-mandatory compact:gap-3 compact:overflow-x-auto compact:px-4 compact:pb-2">
      {columns.map((column) => {
        const columnTasks =
          column.key === "done" ? recentDone : sortByPriority(tasks.filter((t) => columnOf(t) === column.key));
        const Icon = column.icon;
        return (
          <div
            key={column.key}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverColumn !== column.key) setDragOverColumn(column.key);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setDragOverColumn((c) => (c === column.key ? null : c));
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              setDragOverColumn(null);
              if (id) moveTo(id, column.key);
            }}
            className={cn(
              "min-w-0 flex-1 rounded-2xl p-2 transition-colors compact:w-[85%] compact:flex-none compact:snap-center",
              dragOverColumn === column.key ? "bg-(--color-accent)/8" : "bg-(--color-fill)/60",
            )}
          >
            <div className="flex items-center gap-1.5 px-2 py-2 text-[12px] font-semibold text-(--color-ink)">
              <Icon className="size-3" strokeWidth={2.5} style={{ color: column.color }} />
              {column.label}
              <span className="font-normal text-(--color-ink-muted)">{columnTasks.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  today={today}
                  selected={task.id === selectedTaskId}
                  dragging={task.id === draggingId}
                  hideSpace={hideSpace}
                  onSelect={onSelect}
                  onToggleDone={onToggleDone}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", task.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDraggingId(task.id);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                />
              ))}
              {columnTasks.length === 0 && (
                <div className="rounded-xl border border-dashed border-(--color-divider) px-3 py-6 text-center text-[12px] text-(--color-ink-muted)">
                  {column.key === "done" && olderDoneCount > 0
                    ? `Nada concluído nos últimos ${RECENT_DONE_DAYS} dias`
                    : "Sem tarefas"}
                </div>
              )}
              {column.key === "done" && olderDoneCount > 0 && (
                <button
                  onClick={onShowAllCompleted}
                  className="rounded-lg px-2 py-1.5 text-left text-[12px] font-medium text-(--color-accent-text) hover:underline"
                >
                  Ver {olderDoneCount === 1 ? "1 mais antiga" : `${olderDoneCount} mais antigas`}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
