import { useEffect, useRef, useState } from "react";
import { DropdownMenu } from "radix-ui";
import { Ban, ChevronRight, MoreHorizontal, NotebookText } from "lucide-react";
import type { Note } from "../../../db/repositories/notesRepo";
import type { Notebook } from "../../../db/repositories/notebooksRepo";
import { LiveEditor } from "./LiveEditor";

type NoteEditorProps = {
  note: Note | null;
  notebook: Notebook | null;
  notes: Note[];
  otherNotebooks: Notebook[];
  /** Caminho legível de uma pasta ("Trabalho / Reuniões"), já que pastas podem ficar dentro de pastas. */
  folderLabel: (notebookId: string) => string;
  onCreateNote: () => void;
  onSaveTitle: (title: string) => void;
  onSaveContent: (content: string) => void;
  onDuplicateNote: () => void;
  onMoveNote: (notebookId: string) => void;
  onDeleteNote: () => void;
  onFollowLink: (title: string) => void;
};

function describeLastEdit(updatedAt: string): string {
  const minutes = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60_000);
  if (minutes < 1) return "Editado agora";
  if (minutes < 60) return `Editado há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Editado há ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  return `Editado há ${days} ${days === 1 ? "dia" : "dias"}`;
}

export function NoteEditor({
  note,
  notebook,
  notes,
  otherNotebooks,
  folderLabel,
  onCreateNote,
  onSaveTitle,
  onSaveContent,
  onDuplicateNote,
  onMoveNote,
  onDeleteNote,
  onFollowLink,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const contentRef = useRef(content);
  contentRef.current = content;
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    // Só reinicia ao trocar de nota: reagir a note.content sobrescreveria o que está sendo digitado.
  }, [note?.id]);

  useEffect(() => () => clearTimeout(saveTimer.current), [note?.id]);

  function saveContent(next: string) {
    clearTimeout(saveTimer.current);
    if (note && next !== note.content) onSaveContent(next);
  }

  function handleContentChange(next: string) {
    setContent(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveContent(next), 1000);
  }

  if (!note) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 bg-(--color-surface-elevated) px-12 py-10 text-center">
        <div className="flex size-[72px] items-center justify-center rounded-[20px] bg-(--color-fill)">
          <NotebookText className="size-8 text-(--color-ink-muted)" strokeWidth={1.75} />
        </div>
        <p className="text-[18px] font-semibold text-(--color-ink)">Comece seu primeiro caderno</p>
        <p className="w-[320px] text-[13px] text-(--color-ink-muted)">
          Suas notas em Markdown, com links internos estilo Obsidian — organizadas do seu jeito.
        </p>
        <button
          onClick={onCreateNote}
          className="rounded-[10px] bg-(--color-accent) px-[18px] py-2.5 text-[13px] font-semibold text-(--color-accent-ink)"
        >
          + Nova nota
        </button>
      </div>
    );
  }

  const tags = Array.from(new Set(content.match(/(?<![\p{L}\p{N}&/])#[\p{L}_][\p{L}\p{N}_/-]*/gu) ?? []));

  return (
    <div
      className="relative flex h-full flex-1 flex-col overflow-y-auto bg-(--color-surface-elevated) px-12 py-10"
    >
      <div className="mb-3.5 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[12px] text-(--color-ink-muted)">
          {notebook ? `${folderLabel(notebook.id)} / ${note.title || "Sem título"}` : note.title}
        </p>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex size-[26px] shrink-0 items-center justify-center rounded-lg bg-(--color-fill) text-(--color-ink-muted) hover:text-(--color-ink)"
              title="Mais opções"
            >
              <MoreHorizontal className="size-3.5" strokeWidth={2} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 w-[190px] rounded-xl bg-(--color-surface-elevated) p-1.5 shadow-[0px_8px_24px_-2px_rgba(0,0,0,0.16)]"
            >
              <DropdownMenu.Item
                onSelect={onDuplicateNote}
                className="cursor-pointer rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-ink) outline-none data-[highlighted]:bg-(--color-fill)"
              >
                Duplicar nota
              </DropdownMenu.Item>

              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger
                  disabled={otherNotebooks.length === 0}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-ink) outline-none data-[disabled]:cursor-default data-[disabled]:opacity-40 data-[highlighted]:bg-(--color-fill)"
                >
                  Mover para pasta
                  <ChevronRight className="size-3 opacity-60" strokeWidth={2} />
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent
                    sideOffset={4}
                    className="z-50 w-[190px] rounded-xl bg-(--color-surface-elevated) p-1.5 shadow-[0px_8px_24px_-2px_rgba(0,0,0,0.16)]"
                  >
                    {otherNotebooks.map((nb) => (
                      <DropdownMenu.Item
                        key={nb.id}
                        onSelect={() => onMoveNote(nb.id)}
                        className="cursor-pointer truncate rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-ink) outline-none data-[highlighted]:bg-(--color-fill)"
                      >
                        {folderLabel(nb.id)}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>

              <DropdownMenu.Separator className="my-1.5 h-px bg-(--color-divider)" />

              <DropdownMenu.Item
                onSelect={onDeleteNote}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-danger) outline-none data-[highlighted]:bg-(--color-danger)/10"
              >
                <Ban className="size-3.5" strokeWidth={2} />
                Excluir nota
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title !== note.title && onSaveTitle(title)}
        className="w-full text-[26px] leading-[1.08] font-bold tracking-[-0.5px] text-(--color-ink) outline-none"
      />
      <p className="mt-2.5 text-[12px] text-(--color-ink-muted)">
        {describeLastEdit(note.updated_at)}
        {tags.length > 0 && ` · ${tags.join(" ")}`}
      </p>
      <div className="my-4 h-px w-full shrink-0 bg-(--color-divider)" />

      <LiveEditor
        key={note.id}
        initialContent={note.content}
        notes={notes}
        currentNoteId={note.id}
        onChange={handleContentChange}
        onBlur={() => saveContent(contentRef.current)}
        onFollowLink={onFollowLink}
      />
    </div>
  );
}
