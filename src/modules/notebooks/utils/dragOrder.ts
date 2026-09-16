/**
 * Recoloca `draggedId` na posição `dropIndex` de `ids` (índice calculado sobre a lista
 * como ela está renderizada, ou seja, ainda incluindo o próprio item arrastado).
 */
export function reorderList<T extends string>(ids: T[], draggedId: T, dropIndex: number): T[] {
  const withoutDragged = ids.filter((id) => id !== draggedId);
  const removedBeforeTarget = ids.slice(0, dropIndex).filter((id) => id === draggedId).length;
  const adjustedIndex = Math.max(0, Math.min(withoutDragged.length, dropIndex - removedBeforeTarget));
  withoutDragged.splice(adjustedIndex, 0, draggedId);
  return withoutDragged;
}
