import { useEffect, useRef, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxTree } from "@codemirror/language";
import { EditorState, Prec } from "@codemirror/state";
import { drawSelection, EditorView, keymap, placeholder } from "@codemirror/view";
import type { Note } from "../../../db/repositories/notesRepo";
import { findWikilinkTrigger, linkAtPosition, resolveNoteByTitle } from "../utils/links";
import { deleteHiddenMarker, insertLink as insertMarkdownLink, moveToLineTextStart, skipClosingMarks, toggleWrap } from "../utils/formatting";
import { FormatToolbar } from "./FormatToolbar";
import { livePreview, livePreviewTheme } from "./livePreview";

type LiveEditorProps = {
  initialContent: string;
  notes: Note[];
  currentNoteId: string;
  onChange: (content: string) => void;
  onBlur: () => void;
  onFollowLink: (title: string) => void;
};

type Suggestion = {
  triggerStart: number;
  query: string;
  top: number;
  left: number;
  activeIndex: number;
};

function openExternal(href: string) {
  openUrl(href).catch(() => window.open(href, "_blank", "noopener"));
}

/** Editor único estilo Obsidian: escreve-se em Markdown e ele já aparece renderizado, sem alternar entre "Ler" e "Editar". */
export function LiveEditor({ initialContent, notes, currentNoteId, onChange, onBlur, onFollowLink }: LiveEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const matches = suggestion
    ? notes
        .filter((n) => n.id !== currentNoteId && n.title.toLowerCase().includes(suggestion.query.toLowerCase()))
        .slice(0, 6)
    : [];

  // O editor é criado uma vez; tudo que ele precisa ler depois passa por esta ref para não ficar velho.
  const latest = useRef({ notes, suggestion, matches, onChange, onBlur, onFollowLink, currentNoteId });
  latest.current = { notes, suggestion, matches, onChange, onBlur, onFollowLink, currentNoteId };

  function insertLink(chosenTitle: string) {
    const view = viewRef.current;
    const current = latest.current.suggestion;
    if (!view || !current) return;
    const head = view.state.selection.main.head;
    const insert = `[[${chosenTitle}]]`;
    view.dispatch({
      changes: { from: current.triggerStart, to: head, insert },
      selection: { anchor: current.triggerStart + insert.length },
    });
    setSuggestion(null);
    view.focus();
  }

  useEffect(() => {
    if (!hostRef.current) return;

    const suggestionKeys = keymap.of([
      {
        key: "ArrowDown",
        run: () => {
          const { suggestion: s, matches: m } = latest.current;
          if (!s || m.length === 0) return false;
          setSuggestion({ ...s, activeIndex: (s.activeIndex + 1) % m.length });
          return true;
        },
      },
      {
        key: "ArrowUp",
        run: () => {
          const { suggestion: s, matches: m } = latest.current;
          if (!s || m.length === 0) return false;
          setSuggestion({ ...s, activeIndex: (s.activeIndex - 1 + m.length) % m.length });
          return true;
        },
      },
      {
        key: "Enter",
        run: () => {
          const { suggestion: s, matches: m } = latest.current;
          if (!s || m.length === 0) return false;
          insertLink(m[s.activeIndex].title);
          return true;
        },
      },
      {
        key: "Tab",
        run: () => {
          const { suggestion: s, matches: m } = latest.current;
          if (!s || m.length === 0) return false;
          insertLink(m[s.activeIndex].title);
          return true;
        },
      },
      {
        key: "Escape",
        run: () => {
          if (!latest.current.suggestion) return false;
          setSuggestion(null);
          return true;
        },
      },
    ]);

    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialContent,
        extensions: [
          history(),
          // Cursor desenhado pelo CodeMirror: o nativo do navegador fica no lado errado de widgets (caixinha, bullet).
          drawSelection(),
          markdown({ base: markdownLanguage }),
          EditorView.lineWrapping,
          placeholder("Escreva em Markdown… use [[ pra linkar outra nota (ctrl/cmd+clique para abrir)"),
          livePreview({ noteExists: (title) => resolveNoteByTitle(latest.current.notes, title) !== undefined }),
          livePreviewTheme,
          Prec.highest(suggestionKeys),
          // Precisam vir antes do keymap do lang-markdown, que troca o marcador por espaços no Backspace.
          Prec.highest(
            keymap.of([
              { key: "Home", run: (v) => moveToLineTextStart(v, false), shift: (v) => moveToLineTextStart(v, true) },
              { key: "Backspace", run: deleteHiddenMarker },
              { key: "Enter", run: skipClosingMarks },
            ]),
          ),
          keymap.of([
            { key: "Mod-b", run: (v) => (toggleWrap(v, "**"), true) },
            { key: "Mod-i", run: (v) => (toggleWrap(v, "*"), true) },
            { key: "Mod-k", run: (v) => (insertMarkdownLink(v), true) },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) latest.current.onChange(update.state.doc.toString());
            if (update.docChanged || update.selectionSet) {
              const head = update.state.selection.main.head;
              const line = update.state.doc.lineAt(head);
              const trigger = update.view.hasFocus ? findWikilinkTrigger(line.text, head - line.from) : null;
              const coords = trigger ? update.view.coordsAtPos(head) : null;
              setSuggestion(
                trigger && coords
                  ? { triggerStart: line.from + trigger.start, query: trigger.query, top: coords.bottom + 4, left: coords.left, activeIndex: 0 }
                  : null,
              );
            }
          }),
          EditorView.domEventHandlers({
            mousedown(event, view) {
              if (!(event.ctrlKey || event.metaKey)) return false;
              const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
              if (pos === null) return false;
              const line = view.state.doc.lineAt(pos);
              const wikilink = linkAtPosition(line.text, pos - line.from);
              if (wikilink) {
                event.preventDefault();
                latest.current.onFollowLink(wikilink.title);
                return true;
              }
              for (let node = syntaxTree(view.state).resolveInner(pos, 1); node.parent; node = node.parent) {
                if (node.name !== "Link") continue;
                const href = node.getChild("URL");
                if (href) {
                  event.preventDefault();
                  openExternal(view.state.sliceDoc(href.from, href.to));
                  return true;
                }
              }
              return false;
            },
            blur() {
              latest.current.onBlur();
              setSuggestion(null);
              return false;
            },
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // O componente é remontado por nota (key), então só o conteúdo inicial importa aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <FormatToolbar getView={() => viewRef.current} />
      <div ref={hostRef} className="min-h-[320px] w-full flex-1" onClick={(e) => e.target === e.currentTarget && viewRef.current?.focus()} />
      {suggestion && matches.length > 0 && (
        <div
          className="fixed z-50 w-[220px] overflow-hidden rounded-xl bg-(--color-surface-elevated) p-1.5 shadow-[0px_8px_24px_-2px_rgba(0,0,0,0.16)]"
          style={{ top: suggestion.top, left: suggestion.left }}
        >
          {matches.map((n, i) => (
            <button
              key={n.id}
              onMouseDown={(e) => {
                e.preventDefault();
                insertLink(n.title);
              }}
              className={
                "block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium " +
                (i === suggestion.activeIndex
                  ? "bg-(--color-accent)/12 text-(--color-accent-text)"
                  : "text-(--color-ink) hover:bg-(--color-fill)")
              }
            >
              {n.title}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
