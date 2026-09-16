import { useState } from "react";
import { ChevronLeft, ChevronRight, Hash, List } from "lucide-react";
import type { Note } from "../../../db/repositories/notesRepo";
import { countTags, findBacklinks } from "../utils/links";

type BacklinksProps = {
  note: Note | null;
  notes: Note[];
  onSelectNote: (id: string) => void;
};

export function Backlinks({ note, notes, onSelectNote }: BacklinksProps) {
  const [expanded, setExpanded] = useState(false);

  const backlinks = note ? findBacklinks(note, notes) : [];
  const tagsCount = note ? countTags(note.content) : 0;

  if (!expanded) {
    return (
      <div className="flex h-full w-14 shrink-0 flex-col items-center gap-3 border-l border-(--color-divider) bg-(--color-surface-elevated) px-2 pt-6 pb-5">
        <button
          onClick={() => setExpanded(true)}
          className="flex size-8 items-center justify-center rounded-[9px] bg-(--color-accent)/12 text-(--color-accent)"
          title="Expandir painel"
        >
          <ChevronLeft className="size-3.5" strokeWidth={2.5} />
        </button>

        <div className="h-px w-8 bg-(--color-divider)" />

        <div className="relative">
          <div className="flex size-8 items-center justify-center rounded-[9px] bg-(--color-fill) text-(--color-ink-muted)">
            <List className="size-3.5" strokeWidth={2} />
          </div>
          {backlinks.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-(--color-accent) px-0.5 text-[8px] font-semibold text-white">
              {backlinks.length}
            </span>
          )}
        </div>

        <div className="relative">
          <div className="flex size-8 items-center justify-center rounded-[9px] bg-(--color-fill) text-(--color-ink-muted)">
            <Hash className="size-3.5" strokeWidth={2} />
          </div>
          {tagsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-(--color-accent) px-0.5 text-[8px] font-semibold text-white">
              {tagsCount}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-(--color-divider) bg-(--color-surface-elevated) px-5 pt-6 pb-5">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[13px] font-semibold text-(--color-ink)">Mencionado em</p>
        <button
          onClick={() => setExpanded(false)}
          className="flex size-6 items-center justify-center rounded-md text-(--color-ink-muted) hover:text-(--color-ink)"
          title="Recolher painel"
        >
          <ChevronRight className="size-3.5" strokeWidth={2.5} />
        </button>
      </div>
      {!note ? (
        <p className="text-[12px] text-(--color-ink-muted)">Selecione uma nota.</p>
      ) : backlinks.length === 0 ? (
        <p className="text-[12px] text-(--color-ink-muted)">Nenhuma menção ainda.</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {backlinks.map((n) => (
            <button
              key={n.id}
              onClick={() => onSelectNote(n.id)}
              className="truncate rounded-md px-2 py-1.5 text-left text-[13px] text-(--color-ink) hover:bg-(--color-fill)"
            >
              {n.title}
            </button>
          ))}
        </div>
      )}

      <div className="h-px w-full bg-(--color-divider)" />

      <p className="text-[13px] font-semibold text-(--color-ink)">Tags</p>
      <p className="text-[12px] text-(--color-ink-muted)">
        {!note ? "Selecione uma nota." : tagsCount === 0 ? "Sem tags." : `${tagsCount} tag(s) nesta nota.`}
      </p>
    </div>
  );
}
