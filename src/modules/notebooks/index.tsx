import { useState } from "react";
import { notebooksRepo } from "../../db/repositories/notebooksRepo";
import { notesRepo } from "../../db/repositories/notesRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { QuickCreateDialog } from "../../shared/ui/QuickCreateDialog";
import { Explorer } from "./components/Explorer";
import { NoteEditor } from "./components/NoteEditor";
import { Backlinks } from "./components/Backlinks";

type DialogState = { kind: "notebook" } | { kind: "note"; notebookId: string } | null;

export default function Notebooks() {
  const notebooksState = useRepoList(notebooksRepo.list);
  const notesState = useRepoList(notesRepo.list);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

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

  function openCreateNote() {
    setDialog({ kind: "note", notebookId: notebooks[0]?.id ?? "" });
  }

  return (
    <div className="flex h-full">
      <Explorer
        notebooks={notebooks}
        notes={notes}
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
        onCreateNotebook={() => setDialog({ kind: "notebook" })}
        onCreateNote={(notebookId) => setDialog({ kind: "note", notebookId })}
      />
      <NoteEditor
        note={selectedNote}
        onCreateNote={openCreateNote}
        onSaveTitle={(title) => selectedNote && notesRepo.update(selectedNote.id, { title }).then(notesState.reload)}
        onSaveContent={(content) =>
          selectedNote && notesRepo.update(selectedNote.id, { content }).then(notesState.reload)
        }
      />
      <Backlinks hasNote={!!selectedNote} />

      <QuickCreateDialog
        open={dialog?.kind === "notebook"}
        onOpenChange={(open) => setDialog(open ? { kind: "notebook" } : null)}
        title="Novo caderno"
        placeholder="Nome do caderno"
        submitLabel="Criar caderno"
        onSubmit={async (name) => {
          await notebooksRepo.create({ name });
          reload();
        }}
      />

      <QuickCreateDialog
        open={dialog?.kind === "note"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Nova nota"
        placeholder="Título da nota"
        submitLabel="Criar nota"
        onSubmit={async (title) => {
          if (dialog?.kind !== "note") return;
          let notebookId = dialog.notebookId;
          if (notebooks.length === 0) {
            const notebook = await notebooksRepo.create({ name: "Minhas notas" });
            notebookId = notebook.id;
          }
          const note = await notesRepo.create({ notebook_id: notebookId, title });
          reload();
          setSelectedNoteId(note.id);
        }}
      />
    </div>
  );
}
