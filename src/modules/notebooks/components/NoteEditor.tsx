import { useEffect, useState } from "react";
import { NotebookText } from "lucide-react";
import type { Note } from "../../../db/repositories/notesRepo";

type NoteEditorProps = {
  note: Note | null;
  onCreateNote: () => void;
  onSaveTitle: (title: string) => void;
  onSaveContent: (content: string) => void;
};

export function NoteEditor({ note, onCreateNote, onSaveTitle, onSaveContent }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");

  useEffect(() => {
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
  }, [note?.id]);

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
          className="rounded-[10px] bg-(--color-accent) px-[18px] py-2.5 text-[13px] font-semibold text-white"
        >
          + Nova nota
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex-1 overflow-y-auto bg-(--color-surface-elevated) px-12 py-10">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title !== note.title && onSaveTitle(title)}
        className="w-full text-[26px] leading-[1.08] font-bold tracking-[-0.5px] text-(--color-ink) outline-none"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={() => content !== note.content && onSaveContent(content)}
        placeholder="Escreva em Markdown…"
        className="mt-4 h-[calc(100%-60px)] w-full resize-none text-[14px] leading-[1.6] text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)/60"
      />
    </div>
  );
}
