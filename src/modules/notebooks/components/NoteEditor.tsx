import { useEffect, useRef, useState } from "react";
import { DropdownMenu } from "radix-ui";
import { Ban, ChevronRight, MoreHorizontal, NotebookText } from "lucide-react";
import type { Note } from "../../../db/repositories/notesRepo";
import type { Notebook } from "../../../db/repositories/notebooksRepo";
import { findWikilinkTrigger, linkAtPosition, resolveNoteByTitle } from "../utils/links";
import { toggleTaskAtLine } from "../utils/markdown";
import { getCaretCoordinates } from "../utils/textareaCaret";
import { cn } from "../../../shared/utils/cn";
import { MarkdownView } from "./MarkdownView";
import { highlightMarkdownSource } from "./SourceHighlight";

type NoteEditorProps = {
  note: Note | null;
  notebook: Notebook | null;
  notes: Note[];
  otherNotebooks: Notebook[];
  onCreateNote: () => void;
  onSaveTitle: (title: string) => void;
  onSaveContent: (content: string) => void;
  onDuplicateNote: () => void;
  onMoveNote: (notebookId: string) => void;
  onDeleteNote: () => void;
  onFollowLink: (title: string) => void;
};

type Suggestion = {
  triggerStart: number;
  query: string;
  top: number;
  left: number;
  activeIndex: number;
};

type Mode = "read" | "edit";

/** Notas com conteúdo abrem em "Ler"; uma nota vazia já abre em "Editar" para começar a escrever. */
function initialMode(note: Note | null): Mode {
  return note && note.content.trim() === "" ? "edit" : "read";
}

function describeLastEdit(updatedAt: string): string {
  const minutes = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60_000);
  if (minutes < 1) return "Editado agora";
  if (minutes < 60) return `Editado há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Editado há ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  return `Editado há ${days} ${days === 1 ? "dia" : "dias"}`;
}

const EDITOR_TEXT_CLASS = "font-mono text-[13px] leading-[1.7] break-words whitespace-pre-wrap";

export function NoteEditor({
  note,
  notebook,
  notes,
  otherNotebooks,
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
  const [mode, setMode] = useState<Mode>(initialMode(note));
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setMode(initialMode(note));
    setSuggestion(null);
    // Só reinicia ao trocar de nota: reagir a note.content sobrescreveria o que está sendo digitado.
  }, [note?.id]);

  useEffect(() => {
    if (mode === "edit") textareaRef.current?.focus();
  }, [mode]);

  const matches = suggestion
    ? notes
        .filter((n) => n.id !== note?.id && n.title.toLowerCase().includes(suggestion.query.toLowerCase()))
        .slice(0, 6)
    : [];

  function updateSuggestionFromCaret(text: string, caret: number) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const trigger = findWikilinkTrigger(text, caret);
    if (!trigger) {
      setSuggestion(null);
      return;
    }
    const { top, left, lineHeight } = getCaretCoordinates(textarea, caret);
    setSuggestion({ triggerStart: trigger.start, query: trigger.query, top: top + lineHeight, left, activeIndex: 0 });
  }

  function insertLink(chosenTitle: string) {
    const textarea = textareaRef.current;
    if (!textarea || !suggestion) return;
    const caret = textarea.selectionStart;
    const before = content.slice(0, suggestion.triggerStart);
    const after = content.slice(caret);
    const next = `${before}[[${chosenTitle}]]${after}`;
    setContent(next);
    setSuggestion(null);
    const cursorAt = before.length + chosenTitle.length + 4;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorAt, cursorAt);
    });
  }

  function handleContentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestion && matches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestion({ ...suggestion, activeIndex: (suggestion.activeIndex + 1) % matches.length });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestion({ ...suggestion, activeIndex: (suggestion.activeIndex - 1 + matches.length) % matches.length });
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertLink(matches[suggestion.activeIndex].title);
        return;
      }
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (suggestion) setSuggestion(null);
      else switchMode("read");
    }
  }

  function handleContentClick(e: React.MouseEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const textarea = e.currentTarget;
    const link = linkAtPosition(content, textarea.selectionStart);
    if (link) onFollowLink(link.title);
  }

  function saveContentIfChanged() {
    if (note && content !== note.content) onSaveContent(content);
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    if (mode === "edit") {
      saveContentIfChanged();
      setSuggestion(null);
    }
    setMode(next);
  }

  function handleToggleTask(line: number) {
    const next = toggleTaskAtLine(content, line);
    setContent(next);
    onSaveContent(next);
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
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") {
          e.preventDefault();
          switchMode(mode === "edit" ? "read" : "edit");
        }
      }}
    >
      <div className="mb-3.5 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[12px] text-(--color-ink-muted)">
          {notebook ? `${notebook.name} / ${note.title || "Sem título"}` : note.title}
        </p>
        <div className="flex items-center gap-0.5 rounded-lg bg-(--color-fill) p-0.5">
          {(
            [
              { value: "read", label: "Ler" },
              { value: "edit", label: "Editar" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              onClick={() => switchMode(option.value)}
              className={cn(
                "rounded-md px-3 py-1 text-[12px]",
                mode === option.value
                  ? "bg-(--color-surface-elevated) font-semibold text-(--color-ink) shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]"
                  : "font-medium text-(--color-ink-muted) hover:text-(--color-ink)",
              )}
              title={option.value === "edit" ? "Editar Markdown (Ctrl+E)" : "Ler nota renderizada (Ctrl+E)"}
            >
              {option.label}
            </button>
          ))}
        </div>
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
                        {nb.name}
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

      {mode === "read" ? (
        <div className="min-h-[200px] flex-1 pb-10 [&>div>*:first-child]:mt-0" onDoubleClick={() => switchMode("edit")}>
          {content.trim() === "" ? (
            <button
              onClick={() => switchMode("edit")}
              className="text-[14px] text-(--color-ink-muted)/70 hover:text-(--color-ink-muted)"
            >
              Nota vazia — clique para começar a escrever…
            </button>
          ) : (
            <MarkdownView
              content={content}
              noteExists={(linkTitle) => resolveNoteByTitle(notes, linkTitle) !== undefined}
              onFollowLink={onFollowLink}
              onToggleTask={handleToggleTask}
            />
          )}
        </div>
      ) : (
        <div className="relative min-h-[320px] w-full flex-1">
          <div
            ref={backdropRef}
            aria-hidden
            className={cn("pointer-events-none absolute inset-0 overflow-hidden text-(--color-ink)", EDITOR_TEXT_CLASS)}
          >
            {highlightMarkdownSource(content)}
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              updateSuggestionFromCaret(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={handleContentKeyDown}
            onClick={handleContentClick}
            onScroll={(e) => {
              if (backdropRef.current) {
                backdropRef.current.scrollTop = e.currentTarget.scrollTop;
                backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
            onBlur={() => {
              saveContentIfChanged();
              setSuggestion(null);
            }}
            spellCheck={false}
            placeholder="Escreva em Markdown… use [[ pra linkar outra nota (ctrl/cmd+clique para abrir)"
            className={cn(
              "absolute inset-0 h-full w-full resize-none text-transparent caret-(--color-ink) outline-none placeholder:text-(--color-ink-muted)/60",
              EDITOR_TEXT_CLASS,
            )}
          />
        </div>
      )}

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
    </div>
  );
}
