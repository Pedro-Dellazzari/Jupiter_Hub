import { Fragment, useState } from "react";
import { motion } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { ChevronDown, ChevronRight, FileText, MoreHorizontal, NotebookText, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "../../../shared/utils/cn";
import { springs } from "../../../shared/motion/springs";
import { ConfirmDialog } from "../../../shared/ui/ConfirmDialog";
import type { Notebook } from "../../../db/repositories/notebooksRepo";
import type { Note } from "../../../db/repositories/notesRepo";
import { reorderList } from "../utils/dragOrder";

type ExplorerProps = {
  notebooks: Notebook[];
  notes: Note[];
  selectedNoteId: string | null;
  renamingNotebookId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNotebook: () => void;
  onCreateNote: (notebookId: string) => void;
  onStartRenameNotebook: (id: string) => void;
  onRenameNotebook: (id: string, name: string) => void;
  onReorderNotebooks: (orderedIds: string[]) => void;
  onMoveNote: (noteId: string, toNotebookId: string, orderedIdsInTarget: string[]) => void;
  onDeleteNotebook: (id: string) => void;
};

type Dragging = { kind: "notebook"; id: string } | { kind: "note"; id: string } | null;

type DropIndicator =
  | { kind: "notebook"; index: number }
  | { kind: "note"; notebookId: string; index: number }
  | { kind: "folder-target"; notebookId: string }
  | null;

function DropLine() {
  return <div className="mx-2 my-0.5 h-0.5 shrink-0 rounded-full bg-(--color-accent)" />;
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
  onReorderNotebooks,
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

  function endDrag() {
    setDragging(null);
    setDropIndicator(null);
  }

  function notesIn(notebookId: string): string[] {
    return notes.filter((n) => n.notebook_id === notebookId).map((n) => n.id);
  }

  function handleNotebookHeaderDragOver(e: React.DragEvent, notebook: Notebook, index: number) {
    if (!dragging) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragging.kind === "notebook") {
      const rect = e.currentTarget.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      setDropIndicator({ kind: "notebook", index: before ? index : index + 1 });
    } else {
      setDropIndicator({ kind: "folder-target", notebookId: notebook.id });
    }
  }

  function handleNotebookHeaderDrop(e: React.DragEvent, notebook: Notebook) {
    if (!dragging) return;
    e.preventDefault();
    e.stopPropagation();
    if (dragging.kind === "notebook" && dropIndicator?.kind === "notebook") {
      onReorderNotebooks(reorderList(notebooks.map((n) => n.id), dragging.id, dropIndicator.index));
    } else if (dragging.kind === "note") {
      const ids = notesIn(notebook.id);
      const withDragged = ids.includes(dragging.id) ? ids : [...ids, dragging.id];
      onMoveNote(dragging.id, notebook.id, reorderList(withDragged, dragging.id, withDragged.length));
    }
    endDrag();
  }

  function handleNoteRowDragOver(e: React.DragEvent, notebook: Notebook, index: number) {
    if (!dragging || dragging.kind === "notebook") return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    setDropIndicator({ kind: "note", notebookId: notebook.id, index: before ? index : index + 1 });
  }

  function handleNoteRowDrop(e: React.DragEvent, notebook: Notebook) {
    if (!dragging || dragging.kind === "notebook" || dropIndicator?.kind !== "note") return;
    e.preventDefault();
    e.stopPropagation();
    const ids = notesIn(notebook.id);
    const withDragged = ids.includes(dragging.id) ? ids : [...ids, dragging.id];
    onMoveNote(dragging.id, notebook.id, reorderList(withDragged, dragging.id, dropIndicator.index));
    endDrag();
  }

  function handleFolderBodyDragOver(e: React.DragEvent, notebook: Notebook) {
    if (!dragging || dragging.kind === "notebook") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIndicator({ kind: "folder-target", notebookId: notebook.id });
  }

  function handleFolderBodyDrop(e: React.DragEvent, notebook: Notebook) {
    if (!dragging || dragging.kind === "notebook") return;
    e.preventDefault();
    const ids = notesIn(notebook.id);
    const withDragged = ids.includes(dragging.id) ? ids : [...ids, dragging.id];
    onMoveNote(dragging.id, notebook.id, reorderList(withDragged, dragging.id, withDragged.length));
    endDrag();
  }

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-(--color-divider) bg-(--color-surface-elevated) px-4 pt-6 pb-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[15px] font-semibold text-(--color-ink)">Cadernos</span>
        <div className="flex-1" />
        <motion.button
          onClick={onCreateNotebook}
          onMouseEnter={() => setHoveredNewNotebook(true)}
          onMouseLeave={() => setHoveredNewNotebook(false)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.88 }}
          transition={springs.snappy}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full text-(--color-ink-muted)",
            hoveredNewNotebook && "bg-(--color-fill) text-(--color-ink)",
          )}
          title="Novo caderno"
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
          <p className="w-[180px] text-[12px] text-(--color-ink-muted)">
            Crie sua primeira nota ou pasta.
          </p>
          <motion.button
            onClick={onCreateNotebook}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={springs.snappy}
            className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-[12px] font-semibold text-(--color-accent-ink) hover:brightness-110"
          >
            + Nova pasta
          </motion.button>
        </div>
      ) : (
        notebooks.map((notebook, notebookIndex) => {
          const isOpen = !collapsed[notebook.id];
          const isRenaming = notebook.id === renamingNotebookId;
          const isDraggingThis = dragging?.kind === "notebook" && dragging.id === notebook.id;
          const isFolderTarget = dropIndicator?.kind === "folder-target" && dropIndicator.notebookId === notebook.id;
          const notebookNotes = notes.filter((n) => n.notebook_id === notebook.id);
          return (
            <Fragment key={notebook.id}>
              {dropIndicator?.kind === "notebook" && dropIndicator.index === notebookIndex && <DropLine />}
              <div className="flex flex-col">
                <div
                  draggable={!isRenaming}
                  onDragStart={(e) => {
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
                  onDragOver={(e) => handleNotebookHeaderDragOver(e, notebook, notebookIndex)}
                  onDrop={(e) => handleNotebookHeaderDrop(e, notebook)}
                  onMouseEnter={() => setHoveredHeaderId(notebook.id)}
                  onMouseLeave={() =>
                    setHoveredHeaderId((current) => (current === notebook.id ? null : current))
                  }
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
                      className="flex-1 text-left text-[13px] font-semibold"
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
                    onMouseLeave={() =>
                      setHoveredNewNoteFor((current) => (current === notebook.id ? null : current))
                    }
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
                  <p className="-mt-1 mb-1 pl-4 text-[11px] text-(--color-ink-muted)/70">↵ Salvar · Esc Cancelar</p>
                )}

                {isOpen && (
                  <div
                    onDragOver={(e) => handleFolderBodyDragOver(e, notebook)}
                    onDrop={(e) => handleFolderBodyDrop(e, notebook)}
                    className="flex flex-col"
                  >
                    {notebookNotes.map((note, noteIndex) => {
                      const isActive = note.id === selectedNoteId;
                      const isDraggingThisNote = dragging?.kind === "note" && dragging.id === note.id;
                      return (
                        <Fragment key={note.id}>
                          {dropIndicator?.kind === "note" &&
                            dropIndicator.notebookId === notebook.id &&
                            dropIndicator.index === noteIndex && <DropLine />}
                          <button
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", note.id);
                              setDragging({ kind: "note", id: note.id });
                            }}
                            onDragEnd={endDrag}
                            onDragOver={(e) => handleNoteRowDragOver(e, notebook, noteIndex)}
                            onDrop={(e) => handleNoteRowDrop(e, notebook)}
                            onClick={() => onSelectNote(note.id)}
                            onMouseEnter={() => setHoveredNoteId(note.id)}
                            onMouseLeave={() =>
                              setHoveredNoteId((current) => (current === note.id ? null : current))
                            }
                            className={cn(
                              "flex items-center gap-2 rounded-md py-1.5 pr-2 pl-[18px] text-left text-[13px]",
                              isDraggingThisNote && "cursor-grabbing opacity-40",
                              isActive
                                ? "bg-(--color-accent)/12 font-semibold text-(--color-accent-text)"
                                : cn("text-(--color-ink)", hoveredNoteId === note.id && "bg-(--color-fill)"),
                            )}
                          >
                            <FileText className="size-3 shrink-0 opacity-70" strokeWidth={2} />
                            <span className="truncate">{note.title}</span>
                          </button>
                        </Fragment>
                      );
                    })}
                    {dropIndicator?.kind === "note" &&
                      dropIndicator.notebookId === notebook.id &&
                      dropIndicator.index === notebookNotes.length && <DropLine />}
                  </div>
                )}
              </div>
            </Fragment>
          );
        })
      )}
      {dropIndicator?.kind === "notebook" && dropIndicator.index === notebooks.length && <DropLine />}
      {(() => {
        const notebook = notebooks.find((n) => n.id === deletingNotebookId);
        if (!notebook) return null;
        const noteCount = notes.filter((n) => n.notebook_id === notebook.id).length;
        return (
          <ConfirmDialog
            open
            onOpenChange={(open) => !open && setDeletingNotebookId(null)}
            title={`Excluir "${notebook.name}"?`}
            description={
              noteCount > 0
                ? `Isso também vai excluir ${noteCount} nota${noteCount === 1 ? "" : "s"} dentro dessa pasta.`
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
