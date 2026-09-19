import type { ReactNode } from "react";

const MUTED = "text-(--color-ink-muted)/60";
const PREFIX_RE = /^(\s*(?:#{1,6}\s|>\s?|[-*+]\s\[[ xX]\]\s|[-*+]\s|\d+[.)]\s))(.*)$/;
const INLINE_MARKS_RE = /(\[\[[^\]\n]+?\]\]|\*+|~~|__|`)/g;

function highlightInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE_MARKS_RE).map((part, i) => {
    if (!part) return null;
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("[[")) {
      return (
        <span key={key} className="text-(--color-accent)">
          {part}
        </span>
      );
    }
    if (/^(\*+|~~|__|`)$/.test(part)) {
      return (
        <span key={key} className={MUTED}>
          {part}
        </span>
      );
    }
    return part;
  });
}

/**
 * Colore a sintaxe Markdown do texto cru (marcadores discretos, wikilinks em destaque).
 * Só muda cor e peso: em fonte monoespaçada isso preserva a largura de cada caractere,
 * então a camada fica alinhada com o <textarea> transparente por cima dela.
 */
export function highlightMarkdownSource(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let inFence = false;

  text.split("\n").forEach((line, index) => {
    if (index > 0) nodes.push("\n");
    const key = `l${index}`;

    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      nodes.push(
        <span key={key} className={MUTED}>
          {line}
        </span>,
      );
      return;
    }
    if (inFence) {
      nodes.push(line);
      return;
    }

    const prefix = PREFIX_RE.exec(line);
    if (!prefix) {
      nodes.push(...highlightInline(line, key));
      return;
    }
    const isHeading = prefix[1].trimStart().startsWith("#");
    nodes.push(
      <span key={`${key}-m`} className={MUTED}>
        {prefix[1]}
      </span>,
      isHeading ? (
        <span key={`${key}-t`} className="font-semibold">
          {highlightInline(prefix[2], key)}
        </span>
      ) : (
        highlightInline(prefix[2], key)
      ),
    );
  });

  return nodes;
}
