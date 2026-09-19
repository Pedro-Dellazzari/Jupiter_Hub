/**
 * Parser de Markdown mínimo (subset do GFM + extensões do Obsidian) usado na visualização "Ler" das notas.
 * O conteúdo continua sendo Markdown puro no banco; aqui só derivamos uma árvore para renderizar.
 */

export type ListItem = {
  text: string;
  /** Nível de indentação (2 espaços = 1 nível). */
  depth: number;
  /** `null` = item comum; boolean = item de checklist (`- [ ]` / `- [x]`). */
  checked: boolean | null;
  /** Índice da linha no conteúdo original — usado para alternar o checkbox de volta no texto. */
  line: number;
  /** Número exibido em listas ordenadas. */
  marker: string | null;
};

export type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; lines: string[] }
  | { type: "code"; lang: string; code: string }
  | { type: "list"; items: ListItem[] }
  | { type: "hr" }
  | { type: "table"; header: string[]; rows: string[][] };

const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const FENCE_RE = /^\s*```(.*)$/;
const HR_RE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(?:\[([ xX])\]\s+)?(.*)$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function startsNewBlock(line: string, next: string | undefined): boolean {
  return (
    HEADING_RE.test(line) ||
    FENCE_RE.test(line) ||
    HR_RE.test(line) ||
    LIST_RE.test(line) ||
    QUOTE_RE.test(line) ||
    (line.includes("|") && next !== undefined && TABLE_SEP_RE.test(next))
  );
}

export function parseMarkdown(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    const fence = FENCE_RE.exec(line);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++; // fecha o bloco (ou fim do texto, se o fence nunca fechar)
      blocks.push({ type: "code", lang: fence[1].trim(), code: code.join("\n") });
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (HR_RE.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        quoted.push(QUOTE_RE.exec(lines[i])![1]);
        i++;
      }
      blocks.push({ type: "quote", lines: quoted });
      continue;
    }

    if (line.includes("|") && TABLE_SEP_RE.test(lines[i + 1] ?? "")) {
      const header = splitTableRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    if (LIST_RE.test(line)) {
      const items: ListItem[] = [];
      while (i < lines.length) {
        const match = LIST_RE.exec(lines[i]);
        if (!match) break;
        const [, indent, marker, check, text] = match;
        items.push({
          text,
          depth: Math.floor(indent.replace(/\t/g, "  ").length / 2),
          checked: check === undefined ? null : check.toLowerCase() === "x",
          line: i,
          marker: /\d/.test(marker) ? marker : null,
        });
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const paragraph: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !startsNewBlock(lines[i], lines[i + 1])) {
      paragraph.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: paragraph.join("\n") });
  }

  return blocks;
}

/** Alterna `[ ]` ↔ `[x]` na linha indicada e devolve o novo conteúdo. */
export function toggleTaskAtLine(content: string, line: number): string {
  const lines = content.split("\n");
  if (line < 0 || line >= lines.length) return content;
  lines[line] = lines[line].replace(/\[([ xX])\]/, (_, mark: string) => (mark === " " ? "[x]" : "[ ]"));
  return lines.join("\n");
}

export type InlineToken =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "wikilink"; title: string; label: string }
  | { type: "link"; text: string; href: string }
  | { type: "bold"; children: InlineToken[] }
  | { type: "italic"; children: InlineToken[] }
  | { type: "strike"; children: InlineToken[] }
  | { type: "tag"; text: string };

const INLINE_RE = new RegExp(
  [
    "(`[^`\\n]+`)", // 1 código
    "(\\[\\[([^\\]|\\n]+?)(?:\\|([^\\]\\n]+?))?\\]\\])", // 2 wikilink (3 título, 4 alias)
    "(\\[([^\\]\\n]+)\\]\\(([^)\\s]+)\\))", // 5 link (6 texto, 7 url)
    "(\\*\\*(.+?)\\*\\*|__(.+?)__)", // 8 negrito (9, 10)
    "(~~(.+?)~~)", // 11 tachado (12)
    "(\\*(?!\\s)(.+?)\\*|(?<![\\p{L}\\p{N}])_(?!\\s)(.+?)_(?![\\p{L}\\p{N}]))", // 13 itálico (14, 15)
    "((?<![\\p{L}\\p{N}&/])#[\\p{L}_][\\p{L}\\p{N}_/-]*)", // 16 tag
  ].join("|"),
  "gu",
);

/** Quebra um trecho de texto em tokens inline (negrito, itálico, código, links, wikilinks, tags). */
export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  for (const m of text.matchAll(INLINE_RE)) {
    const start = m.index ?? 0;
    if (start > cursor) tokens.push({ type: "text", text: text.slice(cursor, start) });

    if (m[1]) tokens.push({ type: "code", text: m[1].slice(1, -1) });
    else if (m[2]) tokens.push({ type: "wikilink", title: m[3].trim(), label: (m[4] ?? m[3]).trim() });
    else if (m[5]) tokens.push({ type: "link", text: m[6], href: m[7] });
    else if (m[8]) tokens.push({ type: "bold", children: parseInline(m[9] ?? m[10]) });
    else if (m[11]) tokens.push({ type: "strike", children: parseInline(m[12]) });
    else if (m[13]) tokens.push({ type: "italic", children: parseInline(m[14] ?? m[15]) });
    else if (m[16]) tokens.push({ type: "tag", text: m[16] });

    cursor = start + m[0].length;
  }

  if (cursor < text.length) tokens.push({ type: "text", text: text.slice(cursor) });
  return tokens;
}
