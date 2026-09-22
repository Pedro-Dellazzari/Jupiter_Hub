import type { Notebook } from "../../../db/repositories/notebooksRepo";

/** Pasta pai efetiva: uma referência a pasta inexistente/excluída vira raiz, para nada sumir da árvore. */
function parentOf(notebook: Notebook, known: Set<string>): string | null {
  return notebook.parent_id && known.has(notebook.parent_id) ? notebook.parent_id : null;
}

/** Subpastas diretas de `parentId` (`null` = raiz), na ordem definida pelo usuário. */
export function childrenOf(notebooks: Notebook[], parentId: string | null): Notebook[] {
  const known = new Set(notebooks.map((n) => n.id));
  return notebooks.filter((n) => parentOf(n, known) === parentId).sort((a, b) => a.sort_order - b.sort_order);
}

/** Todas as pastas abaixo de `id`, em qualquer nível (não inclui a própria). */
export function descendantIds(notebooks: Notebook[], id: string): Set<string> {
  const found = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of childrenOf(notebooks, current)) {
      if (found.has(child.id)) continue;
      found.add(child.id);
      queue.push(child.id);
    }
  }
  return found;
}

/** Caminho legível da pasta, ex.: "Trabalho / Reuniões". */
export function folderPath(notebooks: Notebook[], id: string): string {
  const byId = new Map(notebooks.map((n) => [n.id, n]));
  const names: string[] = [];
  const seen = new Set<string>();
  for (let node = byId.get(id); node && !seen.has(node.id); node = node.parent_id ? byId.get(node.parent_id) : undefined) {
    seen.add(node.id);
    names.unshift(node.name);
  }
  return names.join(" / ");
}

/** Árvore achatada em ordem de exibição (pai antes dos filhos), com a profundidade de cada pasta. */
export function flattenFolders(notebooks: Notebook[]): { notebook: Notebook; depth: number }[] {
  const out: { notebook: Notebook; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const notebook of childrenOf(notebooks, parentId)) {
      out.push({ notebook, depth });
      walk(notebook.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
