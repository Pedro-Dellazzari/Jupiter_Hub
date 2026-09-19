import { Fragment, type ReactNode } from "react";
import { Check } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { cn } from "../../../shared/utils/cn";
import { parseInline, parseMarkdown, type Block, type InlineToken, type ListItem } from "../utils/markdown";

type MarkdownViewProps = {
  content: string;
  /** Diz se `[[Título]]` aponta para uma nota existente (links quebrados ficam mais discretos). */
  noteExists: (title: string) => boolean;
  onFollowLink: (title: string) => void;
  /** Chamado ao clicar num checkbox de checklist, com a linha do item no conteúdo original. */
  onToggleTask: (line: number) => void;
};

function openExternal(href: string) {
  openUrl(href).catch(() => window.open(href, "_blank", "noopener"));
}

function Inline({
  tokens,
  noteExists,
  onFollowLink,
}: { tokens: InlineToken[] } & Pick<MarkdownViewProps, "noteExists" | "onFollowLink">) {
  return (
    <>
      {tokens.map((token, i) => {
        switch (token.type) {
          case "text":
            return <Fragment key={i}>{renderTextWithBreaks(token.text)}</Fragment>;
          case "code":
            return (
              <code key={i} className="rounded bg-(--color-fill) px-1 py-0.5 font-mono text-[12.5px]">
                {token.text}
              </code>
            );
          case "wikilink":
            return (
              <button
                key={i}
                type="button"
                onClick={() => onFollowLink(token.title)}
                title={noteExists(token.title) ? token.title : `Criar nota "${token.title}"`}
                className={cn(
                  "rounded-[4px] bg-(--color-accent)/12 px-1.5 py-0.5 text-[13px] font-medium text-(--color-accent) hover:bg-(--color-accent)/20",
                  !noteExists(token.title) && "opacity-60 [text-decoration:underline_dotted]",
                )}
              >
                {`[[${token.label}]]`}
              </button>
            );
          case "link":
            return (
              <a
                key={i}
                href={token.href}
                onClick={(e) => {
                  e.preventDefault();
                  openExternal(token.href);
                }}
                className="text-(--color-accent) underline decoration-(--color-accent)/40 underline-offset-2 hover:decoration-(--color-accent)"
              >
                {token.text}
              </a>
            );
          case "bold":
            return (
              <strong key={i} className="font-semibold">
                <Inline tokens={token.children} noteExists={noteExists} onFollowLink={onFollowLink} />
              </strong>
            );
          case "italic":
            return (
              <em key={i}>
                <Inline tokens={token.children} noteExists={noteExists} onFollowLink={onFollowLink} />
              </em>
            );
          case "strike":
            return (
              <del key={i} className="text-(--color-ink-muted)">
                <Inline tokens={token.children} noteExists={noteExists} onFollowLink={onFollowLink} />
              </del>
            );
          case "tag":
            return (
              <span key={i} className="font-medium text-(--color-accent)">
                {token.text}
              </span>
            );
        }
      })}
    </>
  );
}

/** Quebras de linha simples dentro de um parágrafo viram <br> (comportamento padrão do Obsidian). */
function renderTextWithBreaks(text: string): ReactNode {
  const parts = text.split("\n");
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {part}
    </Fragment>
  ));
}

const HEADING_CLASSES: Record<number, string> = {
  1: "mt-6 text-[22px] font-bold tracking-[-0.4px]",
  2: "mt-5 text-[17px] font-semibold",
  3: "mt-4 text-[15px] font-semibold",
  4: "mt-3 text-[14px] font-semibold",
  5: "mt-3 text-[14px] font-semibold text-(--color-ink-muted)",
  6: "mt-3 text-[13px] font-semibold text-(--color-ink-muted)",
};

function ListBlock({
  items,
  onToggleTask,
  ...inline
}: { items: ListItem[] } & Pick<MarkdownViewProps, "noteExists" | "onFollowLink" | "onToggleTask">) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item) => (
        <div key={item.line} className="flex items-start gap-2" style={{ paddingLeft: item.depth * 20 }}>
          {item.checked !== null ? (
            <button
              type="button"
              onClick={() => onToggleTask(item.line)}
              title={item.checked ? "Marcar como a fazer" : "Marcar como concluída"}
              className={cn(
                "mt-[3px] flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px]",
                item.checked
                  ? "border-(--color-accent) bg-(--color-accent) text-white"
                  : "border-(--color-ink-muted)/60 text-transparent hover:border-(--color-accent)",
              )}
            >
              <Check className="size-2.5" strokeWidth={3.5} />
            </button>
          ) : (
            <span className="min-w-4 shrink-0 text-right text-(--color-ink-muted)">{item.marker ?? "•"}</span>
          )}
          <span className={cn("min-w-0", item.checked && "text-(--color-ink-muted) line-through")}>
            <Inline tokens={parseInline(item.text)} {...inline} />
          </span>
        </div>
      ))}
    </div>
  );
}

function BlockView({
  block,
  ...rest
}: { block: Block } & Pick<MarkdownViewProps, "noteExists" | "onFollowLink" | "onToggleTask">) {
  const { noteExists, onFollowLink, onToggleTask } = rest;
  const inline = { noteExists, onFollowLink };

  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level}` as "h1";
      return (
        <Tag className={cn("text-(--color-ink)", HEADING_CLASSES[block.level])}>
          <Inline tokens={parseInline(block.text)} {...inline} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p>
          <Inline tokens={parseInline(block.text)} {...inline} />
        </p>
      );
    case "quote":
      return (
        <blockquote className="border-l-[3px] border-(--color-accent) pl-3 text-(--color-ink-muted) italic">
          <Inline tokens={parseInline(block.lines.join("\n"))} {...inline} />
        </blockquote>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-lg bg-(--color-fill) px-4 py-3.5 font-mono text-[12px] leading-[1.6]">
          <code>{block.code}</code>
        </pre>
      );
    case "list":
      return <ListBlock items={block.items} onToggleTask={onToggleTask} {...inline} />;
    case "hr":
      return <hr className="my-2 border-t border-(--color-divider)" />;
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  <th
                    key={i}
                    className="border-b border-(--color-divider) px-3 py-2 text-left font-semibold text-(--color-ink)"
                  >
                    <Inline tokens={parseInline(cell)} {...inline} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border-b border-(--color-track) px-3 py-2">
                      <Inline tokens={parseInline(cell)} {...inline} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** Visualização "Ler" de uma nota: Markdown renderizado (estilo Obsidian), com links internos e checklists clicáveis. */
export function MarkdownView({ content, noteExists, onFollowLink, onToggleTask }: MarkdownViewProps) {
  const blocks = parseMarkdown(content);
  return (
    <div className="flex flex-col gap-3.5 text-[14px] leading-[1.6] text-(--color-ink)">
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} noteExists={noteExists} onFollowLink={onFollowLink} onToggleTask={onToggleTask} />
      ))}
    </div>
  );
}
