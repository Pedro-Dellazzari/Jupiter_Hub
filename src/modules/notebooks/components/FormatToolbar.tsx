import type { ComponentType } from "react";
import {
  Bold,
  Code,
  FileCode,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  StickyNote,
} from "lucide-react";
import type { EditorView } from "@codemirror/view";
import {
  insertCodeBlock,
  insertLink,
  insertRule,
  insertWikilink,
  toggleBlock,
  toggleWrap,
} from "../utils/formatting";

type Action = {
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  run: (view: EditorView) => void;
};

const GROUPS: Action[][] = [
  [
    { label: "Negrito (Ctrl+B)", icon: Bold, run: (v) => toggleWrap(v, "**") },
    { label: "Itálico (Ctrl+I)", icon: Italic, run: (v) => toggleWrap(v, "*") },
    { label: "Tachado", icon: Strikethrough, run: (v) => toggleWrap(v, "~~") },
    { label: "Código", icon: Code, run: (v) => toggleWrap(v, "`") },
  ],
  [
    { label: "Título 1", icon: Heading1, run: (v) => toggleBlock(v, "h1") },
    { label: "Título 2", icon: Heading2, run: (v) => toggleBlock(v, "h2") },
    { label: "Título 3", icon: Heading3, run: (v) => toggleBlock(v, "h3") },
  ],
  [
    { label: "Lista", icon: List, run: (v) => toggleBlock(v, "bullet") },
    { label: "Lista numerada", icon: ListOrdered, run: (v) => toggleBlock(v, "number") },
    { label: "Checklist", icon: ListChecks, run: (v) => toggleBlock(v, "task") },
  ],
  [
    { label: "Citação", icon: Quote, run: (v) => toggleBlock(v, "quote") },
    { label: "Bloco de código", icon: FileCode, run: insertCodeBlock },
    { label: "Linha horizontal", icon: Minus, run: insertRule },
  ],
  [
    { label: "Link (Ctrl+K)", icon: Link, run: insertLink },
    { label: "Link para nota [[ ]]", icon: StickyNote, run: insertWikilink },
  ],
];

export function FormatToolbar({ getView }: { getView: () => EditorView | null }) {
  return (
    <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-1 rounded-xl bg-(--color-fill) p-1">
      {GROUPS.map((group, g) => (
        <div key={g} className="flex items-center gap-0.5">
          {g > 0 && <span className="mx-1 h-4 w-px bg-(--color-divider)" />}
          {group.map(({ label, icon: Icon, run }) => (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={label}
              // mousedown + preventDefault mantém o foco (e a seleção) no editor.
              onMouseDown={(e) => {
                e.preventDefault();
                const view = getView();
                if (view) run(view);
              }}
              className="flex size-7 items-center justify-center rounded-lg text-(--color-ink-muted) hover:bg-(--color-surface-elevated) hover:text-(--color-ink)"
            >
              <Icon className="size-3.5" strokeWidth={2} />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
