import type { TaskPatch, TaskWithRelations } from "../../../db/repositories/tasksRepo";
import { formatIsoDate, startOfDay } from "../../../shared/utils/date";
import { endOfWeek, type TaskGroupKey } from "./dateGroups";
import { priorityStyle } from "./priority";

/** Distância entre posições vizinhas: deixa folga para encaixar tarefas no meio sem renumerar o grupo todo. */
const SORT_STEP = 1024;

/** Ordem manual (`sort_order`) primeiro; empates — tarefas nunca arrastadas, todas com 0 — seguem pela prioridade. */
export function sortByListOrder<T extends { sort_order: number; priority: string }>(tasks: T[]): T[] {
  return [...tasks].sort(
    (a, b) => a.sort_order - b.sort_order || priorityStyle(b.priority).rank - priorityStyle(a.priority).rank,
  );
}

/**
 * Prazo ao soltar num grupo sem vizinha para copiar a data. `undefined` = o grupo não recebe tarefas de outros:
 * Atrasadas (não há data passada óbvia) e Esta semana quando hoje já é o último dia da semana.
 */
function defaultDueDate(group: TaskGroupKey, today: Date): string | null | undefined {
  switch (group) {
    case "today":
      return formatIsoDate(today);
    case "week": {
      const tomorrow = startOfDay(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow <= endOfWeek(today) ? formatIsoDate(tomorrow) : undefined;
    }
    case "later": {
      const nextWeek = endOfWeek(today);
      nextWeek.setDate(nextWeek.getDate() + 1);
      return formatIsoDate(nextWeek);
    }
    case "noDate":
      return null;
    case "overdue":
      return undefined;
  }
}

/** Se o grupo aceita uma tarefa vinda de outro grupo de prazo (dentro do próprio grupo, reordenar é sempre possível). */
export function acceptsTaskFromOtherGroup(group: TaskGroupKey, groupTasks: TaskWithRelations[], today: Date): boolean {
  if (group === "overdue") return false;
  return groupTasks.length > 0 || defaultDueDate(group, today) !== undefined;
}

/** Onde a tarefa arrastada vai cair: grupo e índice na lista exibida do grupo (antes da linha `index`). */
export type DropTarget = { group: TaskGroupKey; index: number };

/** Soltar na própria posição (logo antes ou depois de si mesmo) não muda nada. */
export function isNoopReorder(movedId: string, index: number, list: { id: string }[]): boolean {
  const from = list.findIndex((item) => item.id === movedId);
  return index === from || index === from + 1;
}

/** Soltar na própria posição (logo antes ou depois de si mesma no mesmo grupo) não muda nada. */
export function isNoopDrop(
  movedId: string,
  fromGroup: TaskGroupKey,
  target: DropTarget,
  groupTasks: TaskWithRelations[],
): boolean {
  return fromGroup === target.group && isNoopReorder(movedId, target.index, groupTasks);
}

type Ordered = { id: string; sort_order: number };

/** `sort_order` para um item novo entrar no fim da lista (a ordem manual usa passos de `SORT_STEP`). */
export function nextSortOrder(list: Ordered[]): number {
  return list.length === 0 ? 0 : Math.max(...list.map((item) => item.sort_order)) + SORT_STEP;
}

/**
 * Gravações de `sort_order` para encaixar `moved` na posição `index` de `siblings` (a lista sem ele, na ordem exibida).
 * Na maioria das vezes só o item movido muda; a lista inteira é renumerada apenas quando não há folga entre as vizinhas.
 */
function planPlacement<T extends Ordered>(
  moved: T,
  siblings: T[],
  index: number,
): { sortOrder?: number; others: { id: string; patch: TaskPatch }[] } {
  const prev = siblings[index - 1];
  const next = siblings[index];
  const others: { id: string; patch: TaskPatch }[] = [];

  if (prev && next && next.sort_order - prev.sort_order >= 2) {
    return { sortOrder: Math.floor((prev.sort_order + next.sort_order) / 2), others };
  }
  if (prev && next) {
    // Sem folga entre as vizinhas (ex: itens nunca arrastados, todos com 0): renumera a lista na nova ordem.
    let sortOrder: number | undefined;
    const ordered = [...siblings.slice(0, index), moved, ...siblings.slice(index)];
    ordered.forEach((item, i) => {
      const value = (i + 1) * SORT_STEP;
      if (item.id === moved.id) sortOrder = value;
      else if (item.sort_order !== value) others.push({ id: item.id, patch: { sort_order: value } });
    });
    return { sortOrder, others };
  }
  if (next) return { sortOrder: next.sort_order - SORT_STEP, others };
  if (prev) return { sortOrder: prev.sort_order + SORT_STEP, others };
  return { others };
}

/**
 * Gravações para soltar a subtarefa `moved` na posição `index` (antes da linha `index`) de `subtasks`, a lista
 * exibida com ela mesma. Vazio quando soltar não muda nada.
 */
export function planSubtaskDrop<T extends Ordered>(
  moved: T,
  index: number,
  subtasks: T[],
): { id: string; patch: TaskPatch }[] {
  if (isNoopReorder(moved.id, index, subtasks)) return [];
  const from = subtasks.findIndex((s) => s.id === moved.id);
  const siblings = subtasks.filter((s) => s.id !== moved.id);
  const { sortOrder, others } = planPlacement(moved, siblings, from !== -1 && from < index ? index - 1 : index);
  return sortOrder === undefined ? others : [{ id: moved.id, patch: { sort_order: sortOrder } }, ...others];
}

/**
 * Gravações para soltar `moved` em `target`. `groupTasks` é o grupo destino na ordem exibida (com a própria tarefa,
 * se ela já for desse grupo). Em outro grupo a tarefa também ganha o prazo dele: Hoje = hoje, Sem data = nenhum,
 * Esta semana / Mais tarde = a data da vizinha. Na maioria das vezes só a tarefa movida muda; o grupo inteiro é
 * renumerado apenas quando não há folga entre as vizinhas.
 */
export function planTaskDrop(
  moved: TaskWithRelations,
  fromGroup: TaskGroupKey,
  target: DropTarget,
  groupTasks: TaskWithRelations[],
  today: Date,
): { id: string; patch: TaskPatch }[] {
  if (isNoopDrop(moved.id, fromGroup, target, groupTasks)) return [];

  const siblings = groupTasks.filter((t) => t.id !== moved.id);
  const from = groupTasks.findIndex((t) => t.id === moved.id);
  const index = from !== -1 && from < target.index ? target.index - 1 : target.index;
  const prev = siblings[index - 1];
  const next = siblings[index];

  const movedPatch: TaskPatch = {};
  if (fromGroup !== target.group) {
    const neighborDue = target.group === "week" || target.group === "later" ? (prev ?? next)?.due_date : undefined;
    const due = neighborDue ?? defaultDueDate(target.group, today);
    if (due === undefined) return [];
    if (due !== moved.due_date) movedPatch.due_date = due;
  }

  const { sortOrder, others } = planPlacement(moved, siblings, index);
  if (sortOrder !== undefined) movedPatch.sort_order = sortOrder;

  const updates = Object.keys(movedPatch).length > 0 ? [{ id: moved.id, patch: movedPatch }] : [];
  return [...updates, ...others];
}
