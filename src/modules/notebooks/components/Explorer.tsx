import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, NotebookText, Plus } from "lucide-react";
import { cn } from "../../../shared/utils/cn";
import type { Notebook } from "../../../db/repositories/notebooksRepo";
import type { Note } from "../../../db/repositories/notesRepo";

type ExplorerProps = {
  notebooks: Notebook[];
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNotebook: () => void;
  onCreateNote: (notebookId: string) => void;
};

export function Explorer({
  notebooks,
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNotebook,
  onCreateNote,
}: ExplorerProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-(--color-divider) bg-(--color-surface-elevated) px-4 pt-6 pb-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[15px] font-semibold text-(--color-ink)">Cadernos</span>
        <div className="flex-1" />
        <button
          onClick={onCreateNotebook}
          className="text-(--color-ink-muted) hover:text-(--color-ink)"
          title="Novo caderno"
        >
          <Plus className="size-3.5" strokeWidth={2} />
        </button>
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
          <button
            onClick={onCreateNotebook}
            className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            + Nova pasta
          </button>
        </div>
      ) : (
        notebooks.map((notebook) => {
          const isOpen = !collapsed[notebook.id];
          const notebookNotes = notes.filter((n) => n.notebook_id === notebook.id);
          return (
            <div key={notebook.id} className="flex flex-col">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [notebook.id]: isOpen }))}
                className="flex items-center gap-1.5 py-2 text-left text-(--color-ink-muted)"
              >
                {isOpen ? (
                  <ChevronDown className="size-2.5 shrink-0" strokeWidth={2.5} />
                ) : (
                  <ChevronRight className="size-2.5 shrink-0" strokeWidth={2.5} />
                )}
                <span className="text-[13px] font-semibold">{notebook.name}</span>
                <div className="flex-1" />
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateNote(notebook.id);
                  }}
                  title="Nova nota"
                >
                  <Plus className="size-3 shrink-0" strokeWidth={2} />
                </span>
              </button>

              {isOpen &&
                notebookNotes.map((note) => {
                  const isActive = note.id === selectedNoteId;
                  return (
                    <button
                      key={note.id}
                      onClick={() => onSelectNote(note.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-md py-1.5 pr-2 pl-[18px] text-left text-[13px]",
                        isActive
                          ? "bg-(--color-accent)/12 font-semibold text-(--color-accent)"
                          : "text-(--color-ink) hover:bg-(--color-fill)",
                      )}
                    >
                      <FileText className="size-3 shrink-0 opacity-70" strokeWidth={2} />
                      <span className="truncate">{note.title}</span>
                    </button>
                  );
                })}
            </div>
          );
        })
      )}
    </div>
  );
}
