import { useEffect, useState } from "react";
import { notebooksRepo } from "../../db/repositories/notebooksRepo";
import { notesRepo } from "../../db/repositories/notesRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { Explorer } from "./components/Explorer";
import { NoteEditor } from "./components/NoteEditor";
import { Backlinks } from "./components/Backlinks";
import { childrenOf, descendantIds, flattenFolders, folderPath } from "./utils/folders";
import { parseWikilinks, renameWikilinks, resolveNoteByTitle } from "./utils/links";

function nextNotebookName(existingNames: string[]): string {
  const base = "Nova pasta";
  if (!existingNames.includes(base)) return base;
  let n = 2;
  while (existingNames.includes(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

export default function Notebooks() {
  const notebooksState = useRepoList(notebooksRepo.list);
  const notesState = useRepoList(notesRepo.list);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [renamingNotebookId, setRenamingNotebookId] = useState<string | null>(null);

  useEffect(() => {
    if (notesState.state.status !== "ready") return;
    const items = notesState.state.items;
    if (items.length === 0 || items.some((n) => n.id === selectedNoteId)) return;
    const mostRecent = [...items].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    setSelectedNoteId(mostRecent.id);
  }, [notesState.state, selectedNoteId]);

  if (notebooksState.state.status === "loading" || notesState.state.status === "loading") {
    return <div className="h-full" />;
  }
  if (notebooksState.state.status === "error" || notesState.state.status === "error") {
    return <ModuleErrorState />;
  }

  const notebooks = notebooksState.state.items;
  const notes = notesState.state.items;
  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null;

  function reload() {
    notebooksState.reload();
    notesState.reload();
  }

  async function handleCreateNotebook(parentId: string | null) {
    const siblings = childrenOf(notebooks, parentId);
    const parent = notebooks.find((n) => n.id === parentId);
    const notebook = await notebooksRepo.create({
      name: nextNotebookName(siblings.map((n) => n.name)),
      parent_id: parentId,
      space_id: parent?.space_id ?? null,
      sort_order: siblings.length,
    });
    reload();
    setRenamingNotebookId(notebook.id);
  }

  function handleRenameNotebook(id: string, name: string) {
    setRenamingNotebookId(null);
    const trimmed = name.trim();
    const current = notebooks.find((n) => n.id === id);
    if (!trimmed || trimmed === current?.name) return;
    notebooksRepo.update(id, { name: trimmed }).then(reload);
  }

  /** Move `id` para `parentId` (ou só reordena entre irmãs), já com a ordem final das pastas irmãs. */
  function handleMoveNotebook(id: string, parentId: string | null, orderedIds: string[]) {
    // Uma pasta nunca pode entrar nela mesma nem em uma de suas subpastas.
    if (parentId !== null && (parentId === id || descendantIds(notebooks, id).has(parentId))) return;
    notebooksRepo.reorderWithin(parentId, orderedIds).then(reload);
  }

  async function handleDeleteNotebook(id: string) {
    // Excluir uma pasta leva junto as subpastas e todas as notas dentro delas.
    const folderIds = new Set([id, ...descendantIds(notebooks, id)]);
    const notesToDelete = notes.filter((n) => folderIds.has(n.notebook_id));
    await Promise.all(notesToDelete.map((n) => notesRepo.remove(n.id)));
    await Promise.all([...folderIds].map((folderId) => notebooksRepo.remove(folderId)));
    if (selectedNote && notesToDelete.some((n) => n.id === selectedNote.id)) {
      setSelectedNoteId(null);
    }
    reload();
  }

  async function handleCreateNote(notebookId: string) {
    let targetNotebookId = notebookId;
    if (notebooks.length === 0) {
      const notebook = await notebooksRepo.create({ name: "Minhas notas" });
      targetNotebookId = notebook.id;
    }
    const note = await notesRepo.create({
      notebook_id: targetNotebookId,
      title: "Nova Nota",
      sort_order: notes.filter((n) => n.notebook_id === targetNotebookId).length,
    });
    reload();
    setSelectedNoteId(note.id);
  }

  async function handleDuplicateNote() {
    if (!selectedNote) return;
    const copy = await notesRepo.create({
      notebook_id: selectedNote.notebook_id,
      title: `${selectedNote.title} (cópia)`,
      content: selectedNote.content,
      sort_order: notes.filter((n) => n.notebook_id === selectedNote.notebook_id).length,
    });
    reload();
    setSelectedNoteId(copy.id);
  }

  function handleMoveSelectedNote(notebookId: string) {
    if (!selectedNote) return;
    const targetIds = notes.filter((n) => n.notebook_id === notebookId).map((n) => n.id);
    notesRepo.reorderWithin(notebookId, [...targetIds, selectedNote.id]).then(reload);
  }

  function handleReorderNotes(_noteId: string, toNotebookId: string, orderedIdsInTarget: string[]) {
    notesRepo.reorderWithin(toNotebookId, orderedIdsInTarget).then(reload);
  }

  function handleDeleteNote() {
    if (!selectedNote) return;
    notesRepo.remove(selectedNote.id).then(reload);
    setSelectedNoteId(null);
  }

  async function handleSaveTitle(newTitle: string) {
    if (!selectedNote) return;
    const oldTitle = selectedNote.title;
    await notesRepo.update(selectedNote.id, { title: newTitle });
    if (oldTitle.trim() && oldTitle.trim().toLowerCase() !== newTitle.trim().toLowerCase()) {
      const affected = notes.filter(
        (n) => n.id !== selectedNote.id && parseWikilinks(n.content).some((link) => link.title.toLowerCase() === oldTitle.trim().toLowerCase()),
      );
      await Promise.all(
        affected.map((n) => notesRepo.update(n.id, { content: renameWikilinks(n.content, oldTitle, newTitle) })),
      );
    }
    reload();
  }

  function handleFollowLink(title: string) {
    const existing = resolveNoteByTitle(notes, title);
    if (existing) {
      setSelectedNoteId(existing.id);
      return;
    }
    const notebookId = selectedNote?.notebook_id ?? notebooks[0]?.id;
    if (!notebookId) return;
    const sortOrder = notes.filter((n) => n.notebook_id === notebookId).length;
    notesRepo.create({ notebook_id: notebookId, title, sort_order: sortOrder }).then((note) => {
      reload();
      setSelectedNoteId(note.id);
    });
  }

  const selectedNotebook = selectedNote
    ? (notebooks.find((n) => n.id === selectedNote.notebook_id) ?? null)
    : null;
  const otherNotebooks = selectedNote
    ? flattenFolders(notebooks)
        .map((entry) => entry.notebook)
        .filter((n) => n.id !== selectedNote.notebook_id)
    : [];

  return (
    <div className="flex h-full">
      <Explorer
        notebooks={notebooks}
        notes={notes}
        selectedNoteId={selectedNoteId}
        renamingNotebookId={renamingNotebookId}
        onSelectNote={setSelectedNoteId}
        onCreateNotebook={handleCreateNotebook}
        onCreateNote={handleCreateNote}
        onStartRenameNotebook={setRenamingNotebookId}
        onRenameNotebook={handleRenameNotebook}
        onMoveNotebook={handleMoveNotebook}
        onMoveNote={handleReorderNotes}
        onDeleteNotebook={handleDeleteNotebook}
      />
      <NoteEditor
        note={selectedNote}
        notebook={selectedNotebook}
        notes={notes}
        otherNotebooks={otherNotebooks}
        folderLabel={(id) => folderPath(notebooks, id)}
        onCreateNote={() => handleCreateNote(notebooks[0]?.id ?? "")}
        onSaveTitle={handleSaveTitle}
        onSaveContent={(content) =>
          selectedNote && notesRepo.update(selectedNote.id, { content }).then(notesState.reload)
        }
        onDuplicateNote={handleDuplicateNote}
        onMoveNote={handleMoveSelectedNote}
        onDeleteNote={handleDeleteNote}
        onFollowLink={handleFollowLink}
      />
      <Backlinks note={selectedNote} notes={notes} onSelectNote={setSelectedNoteId} />
    </div>
  );
}
