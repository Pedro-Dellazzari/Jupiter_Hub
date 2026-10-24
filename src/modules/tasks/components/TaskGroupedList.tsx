import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  AlertCircle,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  ChevronRight,
  Clock,
  GripVertical,
  Sun,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { tasksRepo, type TaskWithRelations } from "../../../db/repositories/tasksRepo";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";
import {
  groupTasksByDueDate,
  isRecentlyDone,
  sortByCompletion,
  type TaskGroup,
  type TaskGroupKey,
} from "../utils/dateGroups";
import { acceptsTaskFromOtherGroup, isNoopDrop, planTaskDrop, sortByListOrder, type DropTarget } from "../utils/listOrder";
import { DropLine } from "./DropLine";
import { TaskRow } from "./TaskRow";

const GROUP_ICONS: Record<TaskGroupKey, typeof AlertCircle> = {
  overdue: AlertCircle,
  today: Sun,
  week: CalendarDays,
  later: Clock,
  noDate: CalendarOff,
};

/** Quanto tempo a tarefa recém-concluída fica riscada no lugar antes de sair do grupo de prazo (dá tempo de desfazer). */
const LINGER_MS = 1500;

/**
 * Lista de tarefas agrupada por prazo (Atrasadas / Hoje / Esta semana / ...) — tela de Tarefas e aba Tarefas do Espaço.
 * Recebe abertas e concluídas: as concluídas saem dos grupos de prazo e, com `completedGroup`, vão para um grupo
 * "Concluídas" recolhido no fim, que mostra só as dos últimos dias.
 * As abertas podem ser arrastadas: dentro do grupo muda só a ordem; em outro grupo, também o prazo.
 */
export function TaskGroupedList({
  tasks,
  today,
  selectedTaskId,
  onSelect,
  onToggleDone,
  onChanged,
  completedGroup,
  onShowAllCompleted,
  hideSpace,
}: {
  tasks: TaskWithRelations[];
  today: Date;
  selectedTaskId: string | null;
  onSelect: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
  /** Recarrega a lista após mudar uma subtarefa ou mover uma tarefa de lugar. */
  onChanged: () => void;
  /** Mostra o grupo "Concluídas" no fim (filtro "Todas"); sem ele, as concluídas ficam de fora (filtro "Abertas"). */
  completedGroup: boolean;
  /** Abre o histórico completo (filtro "Concluídas") a partir do link de concluídas mais antigas. */
  onShowAllCompleted: () => void;
  /** Esconde o chip de Espaço das linhas (ex: dentro da página de um Espaço, onde ele seria sempre o mesmo). */
  hideSpace?: boolean;
}) {
  const [completedOpen, setCompletedOpen] = useState(false);
  const [lingering, setLingering] = useState<ReadonlySet<string>>(() => new Set());
  const lingerTimers = useRef(new Map<string, number>());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const dragStartTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const timers = lingerTimers.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  function stopLingering(id: string) {
    clearTimeout(lingerTimers.current.get(id));
    lingerTimers.current.delete(id);
    setLingering((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleDone(id: string, done: boolean) {
    stopLingering(id);
    if (done) {
      setLingering((prev) => new Set(prev).add(id));
      lingerTimers.current.set(id, window.setTimeout(() => stopLingering(id), LINGER_MS));
    }
    onToggleDone(id, done);
  }

  const activeTasks = tasks.filter((t) => t.status !== "done" || lingering.has(t.id));
  const doneTasks = tasks.filter((t) => t.status === "done" && !lingering.has(t.id));
  const recentDone = sortByCompletion(doneTasks.filter((t) => isRecentlyDone(t, today)));
  const olderDoneCount = doneTasks.length - recentDone.length;

  const allGroups = groupTasksByDueDate(activeTasks, today, true).map((g) => ({ ...g, tasks: sortByListOrder(g.tasks) }));
  const fromGroup = draggingId ? allGroups.find((g) => g.tasks.some((t) => t.id === draggingId)) : undefined;
  const movedTask = fromGroup?.tasks.find((t) => t.id === draggingId);

  function acceptsDrop(group: TaskGroup): boolean {
    if (!fromGroup) return false;
    return group.key === fromGroup.key || acceptsTaskFromOtherGroup(group.key, group.tasks, today);
  }

  // Enquanto uma tarefa é arrastada, os grupos vazios que podem recebê-la aparecem como alvo.
  const groups = allGroups.filter((g) => g.tasks.length > 0 || acceptsDrop(g));
  const shownTarget =
    dropTarget &&
    movedTask &&
    fromGroup &&
    !isNoopDrop(movedTask.id, fromGroup.key, dropTarget, allGroups.find((g) => g.key === dropTarget.group)?.tasks ?? [])
      ? dropTarget
      : null;

  function startDrag(e: DragEvent<HTMLDivElement>, id: string) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    // Mexer no DOM dentro do dragstart pode cancelar o arrasto nativo: o estado entra no próximo tick.
    dragStartTimer.current = window.setTimeout(() => setDraggingId(id), 0);
  }

  function endDrag() {
    clearTimeout(dragStartTimer.current);
    setDraggingId(null);
    setDropTarget(null);
  }

  function aimAt(e: DragEvent<HTMLElement>, group: TaskGroup, index: number) {
    if (!acceptsDrop(group)) {
      setDropTarget(null);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget((prev) => (prev?.group === group.key && prev.index === index ? prev : { group: group.key, index }));
  }

  /** Metade de cima da linha solta antes dela; metade de baixo, depois. */
  function aimAtRow(e: DragEvent<HTMLDivElement>, group: TaskGroup, index: number) {
    const rect = e.currentTarget.getBoundingClientRect();
    aimAt(e, group, e.clientY < rect.top + rect.height / 2 ? index : index + 1);
  }

  async function drop() {
    const target = dropTarget;
    endDrag();
    if (!target || !movedTask || !fromGroup) return;
    const groupTasks = allGroups.find((g) => g.key === target.group)?.tasks ?? [];
    const updates = planTaskDrop(movedTask, fromGroup.key, target, groupTasks, today);
    if (updates.length === 0) return;
    for (const { id, patch } of updates) await tasksRepo.update(id, patch);
    onChanged();
  }

  return (
    <div
      className="flex flex-col gap-1"
      onDragOver={(e) => {
        // Nos espaços entre grupos, vale o último alvo mirado.
        if (dropTarget) e.preventDefault();
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        drop();
      }}
    >
      {groups.length === 0 && (
        <p className="px-1 py-6 text-[13px] text-(--color-ink-muted)">Tudo em dia: nenhuma tarefa em aberto.</p>
      )}

      {groups.map((group) => {
        const Icon = GROUP_ICONS[group.key];
        const isTargetGroup = shownTarget?.group === group.key;
        return (
          <div key={group.key} className="mb-2">
            <div
              onDragOver={(e) => aimAt(e, group, 0)}
              className={cn(
                "mb-1 flex items-center gap-1.5 px-1 py-1.5 text-[12px] font-semibold",
                group.key === "overdue" ? "text-(--color-danger)" : "text-(--color-ink-muted)",
              )}
            >
              <Icon className="size-3" strokeWidth={2} />
              {group.label}
              {group.tasks.length > 0 && (
                <span className="font-normal text-(--color-ink-muted)/70">{group.tasks.length}</span>
              )}
            </div>
            {group.tasks.length === 0 ? (
              <div
                onDragOver={(e) => aimAt(e, group, 0)}
                className={cn(
                  "rounded-md border border-dashed px-3 py-2 text-[12px] text-(--color-ink-muted)",
                  isTargetGroup ? "border-(--color-accent) bg-(--color-accent)/8" : "border-(--color-divider)",
                )}
              >
                Soltar aqui
              </div>
            ) : (
              <div className="relative flex flex-col divide-y divide-(--color-track)">
                <AnimatePresence initial={false} mode="popLayout">
                  {group.tasks.map((task, index) => {
                    const draggable = task.status !== "done";
                    return (
                      <motion.div
                        key={task.id}
                        layout="position"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={springs.standard}
                      >
                        <div
                          draggable={draggable}
                          onDragStart={(e) => startDrag(e, task.id)}
                          onDragEnd={endDrag}
                          onDragOver={(e) => aimAtRow(e, group, index)}
                          className={cn("group/drag relative", task.id === draggingId && "opacity-40")}
                        >
                          {draggable && (
                            <GripVertical
                              className="pointer-events-none absolute top-1/2 -left-4 size-3 -translate-y-1/2 text-(--color-ink-muted) opacity-0 group-hover/drag:opacity-100"
                              strokeWidth={2}
                            />
                          )}
                          {isTargetGroup && shownTarget.index === index && <DropLine edge="top" />}
                          {isTargetGroup && shownTarget.index === group.tasks.length && index === group.tasks.length - 1 && (
                            <DropLine edge="bottom" />
                          )}
                          <TaskRow
                            task={task}
                            today={today}
                            selected={task.id === selectedTaskId}
                            hideSpace={hideSpace}
                            onSelect={onSelect}
                            onToggleDone={toggleDone}
                            onSubtasksChanged={onChanged}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        );
      })}

      {completedGroup && doneTasks.length > 0 && (
        <div className="mb-2" onDragOver={() => setDropTarget(null)}>
          <button
            onClick={() => setCompletedOpen((v) => !v)}
            className="mb-1 flex items-center gap-1.5 rounded-md px-1 py-1.5 text-[12px] font-semibold text-(--color-ink-muted) hover:text-(--color-ink)"
            aria-expanded={completedOpen}
          >
            <ChevronRight className={cn("size-3 transition-transform", completedOpen && "rotate-90")} strokeWidth={2} />
            <CheckCircle2 className="size-3" strokeWidth={2} />
            Concluídas
            <span className="font-normal text-(--color-ink-muted)/70">{doneTasks.length}</span>
          </button>
          {completedOpen && (
            <div className="flex flex-col divide-y divide-(--color-track)">
              {recentDone.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  selected={task.id === selectedTaskId}
                  hideSpace={hideSpace}
                  showCompletedDate
                  onSelect={onSelect}
                  onToggleDone={toggleDone}
                  onSubtasksChanged={onChanged}
                />
              ))}
              {olderDoneCount > 0 && (
                <button
                  onClick={onShowAllCompleted}
                  className="px-3 py-2.5 text-left text-[12px] font-medium text-(--color-accent-text) hover:underline"
                >
                  Ver {olderDoneCount === 1 ? "1 mais antiga" : `${olderDoneCount} mais antigas`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
