import { Fragment, useMemo, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { DropdownMenu } from "radix-ui";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  NotebookText,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "../../../shared/utils/cn";
import { springs } from "../../../shared/motion/springs";
import { ConfirmDialog } from "../../../shared/ui/ConfirmDialog";
import type { Notebook } from "../../../db/repositories/notebooksRepo";
import type { Note } from "../../../db/repositories/notesRepo";
import { reorderList } from "../utils/dragOrder";
import { childrenOf, descendantIds } from "../utils/folders";

type ExplorerProps = {
  notebooks: Notebook[];
  notes: Note[];
  selectedNoteId: string | null;
  renamingNotebookId: string | null;
  onSelectNote: (id: string) => void;
  /** `parentId` = pasta onde criar a subpasta; `null` cria na raiz. */
  onCreateNotebook: (parentId: string | null) => void;
  onCreateNote: (notebookId: string) => void;
  onStartRenameNotebook: (id: string) => void;
  onRenameNotebook: (id: string, name: string) => void;
  /** Move a pasta para `parentId` (ou só reordena) — `orderedIds` é a ordem final das pastas irmãs. */
  onMoveNotebook: (id: string, parentId: string | null, orderedIds: string[]) => void;
  onMoveNote: (noteId: string, toNotebookId: string, orderedIdsInTarget: string[]) => void;
  onDeleteNotebook: (id: string) => void;
};

type Dragging = { kind: "notebook"; id: string } | { kind: "note"; id: string } | null;

type DropIndicator =
  /** Linha entre pastas irmãs (dentro de `parentId`, `null` = raiz). */
  | { kind: "folder-slot"; parentId: string | null; index: number }
  | { kind: "note"; notebookId: string; index: number }
  /** Soltar "dentro" da pasta. */
  | { kind: "folder-target"; notebookId: string }
  | null;

const INDENT = 14;

function DropLine({ depth }: { depth: number }) {
  return (
    <div
      className="my-0.5 h-0.5 shrink-0 rounded-full bg-(--color-accent)"
      style={{ marginLeft: depth * INDENT + 8, marginRight: 8 }}
    />
  );
}

export function Explorer({
  notebooks,
  notes,
  selectedNoteId,
  renamingNotebookId,
  onSelectNote,
  onCreateNotebook,
  onCreateNote,
  onStartRenameNotebook,
  onRenameNotebook,
  onMoveNotebook,
  onMoveNote,
  onDeleteNotebook,
}: ExplorerProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragging, setDragging] = useState<Dragging>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [hoveredNewNoteFor, setHoveredNewNoteFor] = useState<string | null>(null);
  const [hoveredNewNotebook, setHoveredNewNotebook] = useState(false);
  const [hoveredHeaderId, setHoveredHeaderId] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [deletingNotebookId, setDeletingNotebookId] = useState<string | null>(null);

  const notesByNotebook = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const note of notes) map.set(note.notebook_id, [...(map.get(note.notebook_id) ?? []), note]);
    return map;
  }, [notes]);

  function endDrag() {
    setDragging(null);
    setDropIndicator(null);
  }

  function folderIds(parentId: string | null): string[] {
    return childrenOf(notebooks, parentId).map((n) => n.id);
  }

  function noteIds(notebookId: string): string[] {
    return (notesByNotebook.get(notebookId) ?? []).map((n) => n.id);
  }

  /** Uma pasta arrastada não pode virar filha dela mesma nem de uma de suas subpastas. */
  function isBlockedParent(parentId: string | null): boolean {
    if (dragging?.kind !== "notebook" || parentId === null) return false;
    return parentId === dragging.id || descendantIds(notebooks, dragging.id).has(parentId);
  }

  function moveDraggedNoteInto(notebookId: string, index?: number) {
    if (dragging?.kind !== "note") return;
    const ids = noteIds(notebookId);
    const withDragged = ids.includes(dragging.id) ? ids : [...ids, dragging.id];
    onMoveNote(dragging.id, notebookId, reorderList(withDragged, dragging.id, index ?? withDragged.length));
  }

  function nestDraggedFolderInto(parentId: string) {
    if (dragging?.kind !== "notebook" || isBlockedParent(parentId)) return;
    const ids = folderIds(parentId).filter((id) => id !== dragging.id);
    onMoveNotebook(dragging.id, parentId, [...ids, dragging.id]);
  }

  function dropDraggedFolderAt(parentId: string | null, index: number) {
    if (dragging?.kind !== "notebook" || isBlockedParent(parentId)) return;
    const ids = folderIds(parentId);
    const withDragged = ids.includes(dragging.id) ? ids : [...ids, dragging.id];
    onMoveNotebook(dragging.id, parentId, reorderList(withDragged, dragging.id, index));
  }

  function handleHeaderDragOver(
    e: React.DragEvent,
    notebook: Notebook,
    parentId: string | null,
    index: number,
    hasContent: boolean,
  ) {
    if (!dragging) return;
    e.stopPropagation();

    if (dragging.kind === "note") {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropIndicator({ kind: "folder-target", notebookId: notebook.id });
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    // Pasta aberta com conteúdo: só a faixa de cima é "antes dela"; o resto entra na pasta.
    const beforeLimit = hasContent ? 0.3 : 0.25;
    const afterLimit = hasContent ? 2 : 0.75;

    let next: DropIndicator = null;
    if (ratio < beforeLimit && !isBlockedParent(parentId)) {
      next = { kind: "folder-slot", parentId, index };
    } else if (ratio > afterLimit && !isBlockedParent(parentId)) {
      next = { kind: "folder-slot", parentId, index: index + 1 };
    } else if (!isBlockedParent(notebook.id)) {
      next = { kind: "folder-target", notebookId: notebook.id };
    }
    if (!next) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIndicator(next);
  }

  function handleHeaderDrop(e: React.DragEvent, notebook: Notebook) {
    if (!dragging) return;
    e.preventDefault();
    e.stopPropagation();
    if (dragging.kind === "note") {
      moveDraggedNoteInto(notebook.id);
    } else if (dropIndicator?.kind === "folder-slot") {
      dropDraggedFolderAt(dropIndicator.parentId, dropIndicator.index);
    } else if (dropIndicator?.kind === "folder-target") {
      nestDraggedFolderInto(dropIndicator.notebookId);
    }
    endDrag();
  }

  function handleNoteRowDragOver(e: React.DragEvent, notebook: Notebook, index: number) {
    if (dragging?.kind !== "note") return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    setDropIndicator({ kind: "note", notebookId: notebook.id, index: before ? index : index + 1 });
  }

  function handleNoteRowDrop(e: React.DragEvent, notebook: Notebook) {
    if (dragging?.kind !== "note" || dropIndicator?.kind !== "note") return;
    e.preventDefault();
    e.stopPropagation();
    moveDraggedNoteInto(notebook.id, dropIndicator.index);
    endDrag();
  }

  function handleBodyDragOver(e: React.DragEvent, notebook: Notebook) {
    if (!dragging || (dragging.kind === "notebook" && isBlockedParent(notebook.id))) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDropIndicator({ kind: "folder-target", notebookId: notebook.id });
  }

  function handleBodyDrop(e: React.DragEvent, notebook: Notebook) {
    if (!dragging) return;
    e.preventDefault();
    e.stopPropagation();
    if (dragging.kind === "note") moveDraggedNoteInto(notebook.id);
    else nestDraggedFolderInto(notebook.id);
    endDrag();
  }

  function expandAndCreateFolder(parentId: string | null) {
    if (parentId) setCollapsed((c) => ({ ...c, [parentId]: false }));
    onCreateNotebook(parentId);
  }

  function slotLine(parentId: string | null, index: number, depth: number): ReactNode {
    return dropIndicator?.kind === "folder-slot" &&
      dropIndicator.parentId === parentId &&
      dropIndicator.index === index ? (
      <DropLine depth={depth} />
    ) : null;
  }

  function renderFolders(parentId: string | null, depth: number): ReactNode {
    const folders = childrenOf(notebooks, parentId);
    return (
      <>
        {folders.map((folder, index) => (
          <Fragment key={folder.id}>
            {slotLine(parentId, index, depth)}
            {renderFolder(folder, parentId, depth, index)}
          </Fragment>
        ))}
        {slotLine(parentId, folders.length, depth)}
      </>
    );
  }

  function renderFolder(notebook: Notebook, parentId: string | null, depth: number, index: number): ReactNode {
    const isOpen = !collapsed[notebook.id];
    const isRenaming = notebook.id === renamingNotebookId;
    const isDraggingThis = dragging?.kind === "notebook" && dragging.id === notebook.id;
    const isFolderTarget = dropIndicator?.kind === "folder-target" && dropIndicator.notebookId === notebook.id;
    const folderNotes = notesByNotebook.get(notebook.id) ?? [];
    const hasContent = folderNotes.length > 0 || childrenOf(notebooks, notebook.id).length > 0;
    const FolderIcon = isOpen ? FolderOpen : Folder;

    return (
      <div className="flex flex-col">
        <div
          draggable={!isRenaming}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", notebook.id);
            setDragging({ kind: "notebook", id: notebook.id });
          }}
          onDragEnd={endDrag}
          tabIndex={isRenaming ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === "F2" && e.target === e.currentTarget) {
              e.preventDefault();
              onStartRenameNotebook(notebook.id);
            }
          }}
          onDragOver={(e) => handleHeaderDragOver(e, notebook, parentId, index, isOpen && hasContent)}
          onDrop={(e) => handleHeaderDrop(e, notebook)}
          onMouseEnter={() => setHoveredHeaderId(notebook.id)}
          onMouseLeave={() => setHoveredHeaderId((current) => (current === notebook.id ? null : current))}
          style={{ paddingLeft: depth * INDENT }}
          className={cn(
            "flex items-center gap-1.5 rounded-md py-2 text-left text-(--color-ink-muted) outline-none focus-visible:ring-1 focus-visible:ring-(--color-accent)/50",
            isDraggingThis && "cursor-grabbing opacity-40",
            isFolderTarget && "bg-(--color-accent)/10 ring-1 ring-(--color-accent)/40",
          )}
        >
          <button
            onClick={() => setCollapsed((c) => ({ ...c, [notebook.id]: isOpen }))}
            className="flex shrink-0 items-center"
          >
            {isOpen ? (
              <ChevronDown className="size-2.5 shrink-0" strokeWidth={2.5} />
            ) : (
              <ChevronRight className="size-2.5 shrink-0" strokeWidth={2.5} />
            )}
          </button>
          <FolderIcon className="size-3.5 shrink-0" strokeWidth={2} />
          {isRenaming ? (
            <input
              autoFocus
              defaultValue={notebook.name}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => onRenameNotebook(notebook.id, e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  e.currentTarget.value = notebook.name;
                  e.currentTarget.blur();
                }
              }}
              className="min-w-0 flex-1 rounded-[5px] bg-(--color-surface-elevated) px-1.5 py-0.5 text-[13px] font-semibold text-(--color-ink) outline-[1.5px] outline-(--color-accent)"
            />
          ) : (
            <button
              onClick={() => setCollapsed((c) => ({ ...c, [notebook.id]: isOpen }))}
              onDoubleClick={() => onStartRenameNotebook(notebook.id)}
              title="Duplo clique para renomear"
              className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold"
            >
              {notebook.name}
            </button>
          )}
          <motion.button
            layout
            onClick={(e) => {
              e.stopPropagation();
              onCreateNote(notebook.id);
            }}
            onMouseEnter={() => setHoveredNewNoteFor(notebook.id)}
            onMouseLeave={() => setHoveredNewNoteFor((current) => (current === notebook.id ? null : current))}
            whileHover={{ scale: 1.15, transition: springs.snappy }}
            whileTap={{ scale: 0.85, transition: springs.snappy }}
            transition={springs.gentle}
            className={cn(
              "flex size-4.5 shrink-0 items-center justify-center rounded-full text-(--color-ink-muted)",
              hoveredNewNoteFor === notebook.id && "bg-(--color-fill) text-(--color-ink)",
            )}
            title="Nova nota"
          >
            <Plus className="size-3 shrink-0" strokeWidth={2} />
          </motion.button>
          {!isRenaming && (hoveredHeaderId === notebook.id || menuOpenFor === notebook.id) && (
            <DropdownMenu.Root
              open={menuOpenFor === notebook.id}
              onOpenChange={(open) => setMenuOpenFor(open ? notebook.id : null)}
            >
              <DropdownMenu.Trigger asChild>
                <motion.button
                  layout
                  onClick={(e) => e.stopPropagation()}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, transition: springs.gentle }}
                  whileHover={{ scale: 1.15, transition: springs.snappy }}
                  whileTap={{ scale: 0.85, transition: springs.snappy }}
                  className={cn(
                    "flex size-4.5 shrink-0 items-center justify-center rounded-full text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)",
                    menuOpenFor === notebook.id && "bg-(--color-fill) text-(--color-ink)",
                  )}
                  title="Mais opções da pasta"
                >
                  <MoreHorizontal className="size-3 shrink-0" strokeWidth={2} />
                </motion.button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={6}
                  // Sem isso o Radix devolve o foco ao botão "⋯" ao fechar e tira o foco do campo de renomear.
                  onCloseAutoFocus={(e) => e.preventDefault()}
                  className="z-50 w-[212px] rounded-xl bg-(--color-surface-elevated) p-1.5 shadow-[0px_8px_24px_-2px_rgba(0,0,0,0.16)]"
                >
                  <DropdownMenu.Item
                    onSelect={() => onStartRenameNotebook(notebook.id)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-ink) outline-none data-[highlighted]:bg-(--color-fill)"
                  >
                    <Pencil className="size-3.5" strokeWidth={2} />
                    Renomear pasta
                    <span className="ml-auto text-[11px] font-normal text-(--color-ink-muted)">F2</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => onCreateNote(notebook.id)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-ink) outline-none data-[highlighted]:bg-(--color-fill)"
                  >
                    <Plus className="size-3.5" strokeWidth={2} />
                    Nova nota nesta pasta
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => expandAndCreateFolder(notebook.id)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-ink) outline-none data-[highlighted]:bg-(--color-fill)"
                  >
                    <FolderPlus className="size-3.5" strokeWidth={2} />
                    Nova subpasta
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1.5 h-px bg-(--color-divider)" />
                  <DropdownMenu.Item
                    onSelect={() => setDeletingNotebookId(notebook.id)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-danger) outline-none data-[highlighted]:bg-(--color-danger)/10"
                  >
                    <Trash2 className="size-3.5" strokeWidth={2} />
                    Excluir pasta
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
        {isRenaming && (
          <p className="-mt-1 mb-1 text-[11px] text-(--color-ink-muted)/70" style={{ paddingLeft: depth * INDENT + 16 }}>
            ↵ Salvar · Esc Cancelar
          </p>
        )}

        {isOpen && (
          <div
            onDragOver={(e) => handleBodyDragOver(e, notebook)}
            onDrop={(e) => handleBodyDrop(e, notebook)}
            className="flex flex-col"
          >
            {renderFolders(notebook.id, depth + 1)}
            {folderNotes.map((note, noteIndex) => {
              const isActive = note.id === selectedNoteId;
              const isDraggingThisNote = dragging?.kind === "note" && dragging.id === note.id;
              return (
                <Fragment key={note.id}>
                  {dropIndicator?.kind === "note" &&
                    dropIndicator.notebookId === notebook.id &&
                    dropIndicator.index === noteIndex && <DropLine depth={depth + 1} />}
                  <button
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", note.id);
                      setDragging({ kind: "note", id: note.id });
                    }}
                    onDragEnd={endDrag}
                    onDragOver={(e) => handleNoteRowDragOver(e, notebook, noteIndex)}
                    onDrop={(e) => handleNoteRowDrop(e, notebook)}
                    onClick={() => onSelectNote(note.id)}
                    onMouseEnter={() => setHoveredNoteId(note.id)}
                    onMouseLeave={() => setHoveredNoteId((current) => (current === note.id ? null : current))}
                    // Sem ícone: o texto da nota alinha com o ícone da pasta, um nível abaixo dela.
                    style={{ paddingLeft: (depth + 1) * INDENT + 4 }}
                    className={cn(
                      "rounded-md py-1.5 pr-2 text-left text-[13px]",
                      isDraggingThisNote && "cursor-grabbing opacity-40",
                      isActive
                        ? "bg-(--color-accent)/12 font-semibold text-(--color-accent-text)"
                        : cn("text-(--color-ink)", hoveredNoteId === note.id && "bg-(--color-fill)"),
                    )}
                  >
                    <span className="block truncate">{note.title}</span>
                  </button>
                </Fragment>
              );
            })}
            {dropIndicator?.kind === "note" &&
              dropIndicator.notebookId === notebook.id &&
              dropIndicator.index === folderNotes.length && <DropLine depth={depth + 1} />}
          </div>
        )}
      </div>
    );
  }

  const rootFolders = childrenOf(notebooks, null);

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-(--color-divider) bg-(--color-surface-elevated) px-4 pt-6 pb-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[15px] font-semibold text-(--color-ink)">Cadernos</span>
        <div className="flex-1" />
        <motion.button
          onClick={() => onCreateNotebook(null)}
          onMouseEnter={() => setHoveredNewNotebook(true)}
          onMouseLeave={() => setHoveredNewNotebook(false)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.88 }}
          transition={springs.snappy}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full text-(--color-ink-muted)",
            hoveredNewNotebook && "bg-(--color-fill) text-(--color-ink)",
          )}
          title="Nova pasta"
        >
          <Plus className="size-3.5" strokeWidth={2} />
        </motion.button>
      </div>

      {notebooks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 pt-10 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-(--color-fill)">
            <NotebookText className="size-4.5 text-(--color-ink-muted)" strokeWidth={1.75} />
          </div>
          <p className="text-[13px] font-semibold text-(--color-ink)">Nenhum caderno ainda</p>
          <p className="w-[180px] text-[12px] text-(--color-ink-muted)">Crie sua primeira nota ou pasta.</p>
          <motion.button
            onClick={() => onCreateNotebook(null)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={springs.snappy}
            className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-[12px] font-semibold text-(--color-accent-ink) hover:brightness-110"
          >
            + Nova pasta
          </motion.button>
        </div>
      ) : (
        <>
          {renderFolders(null, 0)}
          {/* Área livre no fim da lista: soltar aqui leva a pasta de volta para a raiz. */}
          <div
            onDragOver={(e) => {
              if (dragging?.kind !== "notebook") return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDropIndicator({ kind: "folder-slot", parentId: null, index: rootFolders.length });
            }}
            onDrop={(e) => {
              if (dragging?.kind !== "notebook") return;
              e.preventDefault();
              dropDraggedFolderAt(null, rootFolders.length);
              endDrag();
            }}
            className="min-h-10 flex-1"
          />
        </>
      )}
      {(() => {
        const notebook = notebooks.find((n) => n.id === deletingNotebookId);
        if (!notebook) return null;
        const affected = new Set([notebook.id, ...descendantIds(notebooks, notebook.id)]);
        const noteCount = notes.filter((n) => affected.has(n.notebook_id)).length;
        const subfolderCount = affected.size - 1;
        const parts = [
          noteCount > 0 ? `${noteCount} nota${noteCount === 1 ? "" : "s"}` : null,
          subfolderCount > 0 ? `${subfolderCount} subpasta${subfolderCount === 1 ? "" : "s"}` : null,
        ].filter(Boolean);
        return (
          <ConfirmDialog
            open
            onOpenChange={(open) => !open && setDeletingNotebookId(null)}
            title={`Excluir "${notebook.name}"?`}
            description={
              parts.length > 0
                ? `Isso também vai excluir ${parts.join(" e ")} dentro dessa pasta.`
                : "Essa pasta está vazia."
            }
            confirmLabel="Excluir"
            onConfirm={() => onDeleteNotebook(notebook.id)}
          />
        );
      })()}
    </div>
  );
}
