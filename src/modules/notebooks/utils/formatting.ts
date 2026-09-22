import { syntaxTree } from "@codemirror/language";
import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

/** Ações da barra de formatação: cada uma edita o texto Markdown da seleção atual. */

const BLOCK_PREFIX_RE = /^(#{1,6} |[-*+] \[[ xX]\] |[-*+] |\d+[.)] |> )/;

/** Envolve a seleção com `mark` (ex.: `**`); se já estiver envolvida, remove. Sem seleção, deixa o cursor entre as marcas. */
export function toggleWrap(view: EditorView, mark: string) {
  const { state } = view;
  view.dispatch(
    state.changeByRange((range) => {
      const len = mark.length;
      const before = state.sliceDoc(Math.max(0, range.from - len), range.from);
      const after = state.sliceDoc(range.to, range.to + len);
      if (before === mark && after === mark) {
        return {
          changes: [
            { from: range.from - len, to: range.from },
            { from: range.to, to: range.to + len },
          ],
          range: EditorSelection.range(range.from - len, range.to - len),
        };
      }
      // Cursor logo antes da marca de fechamento (`**texto|**`): sair da formatação, em vez de abrir outra.
      const nextChar = state.sliceDoc(range.to + len, range.to + len + 1);
      if (range.empty && after === mark && !(len === 1 && nextChar === mark)) {
        return { range: EditorSelection.cursor(range.from + len) };
      }
      const selected = state.sliceDoc(range.from, range.to);
      if (selected.length >= len * 2 && selected.startsWith(mark) && selected.endsWith(mark)) {
        return {
          changes: { from: range.from, to: range.to, insert: selected.slice(len, -len) },
          range: EditorSelection.range(range.from, range.to - len * 2),
        };
      }
      return {
        changes: [
          { from: range.from, insert: mark },
          { from: range.to, insert: mark },
        ],
        range: range.empty
          ? EditorSelection.cursor(range.from + len)
          : EditorSelection.range(range.from + len, range.to + len),
      };
    }),
  );
  view.focus();
}

type BlockKind = "h1" | "h2" | "h3" | "bullet" | "number" | "task" | "quote";

function prefixFor(kind: BlockKind, index: number): string {
  switch (kind) {
    case "h1":
      return "# ";
    case "h2":
      return "## ";
    case "h3":
      return "### ";
    case "bullet":
      return "- ";
    case "number":
      return `${index + 1}. `;
    case "task":
      return "- [ ] ";
    case "quote":
      return "> ";
  }
}

/** Aplica (ou remove, se todas as linhas já o têm) um prefixo de bloco nas linhas da seleção. */
export function toggleBlock(view: EditorView, kind: BlockKind) {
  const { state } = view;
  const lines: { from: number; text: string }[] = [];
  const seen = new Set<number>();
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number;
    const last = state.doc.lineAt(range.to).number;
    for (let n = first; n <= last; n++) {
      if (seen.has(n)) continue;
      seen.add(n);
      const line = state.doc.line(n);
      lines.push({ from: line.from, text: line.text });
    }
  }

  const current = (text: string) => BLOCK_PREFIX_RE.exec(text)?.[0] ?? "";
  const alreadyApplied = lines.every(({ text }, i) => {
    const existing = current(text);
    const wanted = prefixFor(kind, i);
    return kind === "number" ? /^\d+[.)] $/.test(existing) : existing === wanted;
  });

  const changes = state.changes(
    lines.map(({ from, text }, i) => {
      const existing = current(text);
      return { from, to: from + existing.length, insert: alreadyApplied ? "" : prefixFor(kind, i) };
    }),
  );
  // assoc 1: o cursor fica depois do marcador inserido (que fica escondido), e não antes dele.
  view.dispatch({
    changes,
    selection: EditorSelection.create(
      state.selection.ranges.map((r) => EditorSelection.range(changes.mapPos(r.anchor, 1), changes.mapPos(r.head, 1))),
      state.selection.mainIndex,
    ),
  });
  view.focus();
}

export type { BlockKind };

export function insertLink(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const label = view.state.sliceDoc(from, to) || "texto";
  const insert = `[${label}](url)`;
  const urlStart = from + label.length + 3;
  view.dispatch({ changes: { from, to, insert }, selection: { anchor: urlStart, head: urlStart + 3 } });
  view.focus();
}

/** Insere `[[ ]]` (ou envolve a seleção) — o autocomplete de notas abre sozinho quando o cursor fica dentro. */
export function insertWikilink(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const label = view.state.sliceDoc(from, to);
  view.dispatch({
    changes: { from, to, insert: `[[${label}]]` },
    selection: { anchor: from + 2 + label.length },
  });
  view.focus();
}

export function insertCodeBlock(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  const atLineStart = view.state.doc.lineAt(from).from === from;
  const lead = atLineStart ? "" : "\n";
  const insert = `${lead}\`\`\`\n${selected}\n\`\`\`\n`;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + lead.length + 4, head: from + lead.length + 4 + selected.length },
  });
  view.focus();
}

export function insertRule(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const atLineStart = view.state.doc.lineAt(from).from === from;
  const insert = `${atLineStart ? "" : "\n"}---\n`;
  view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length } });
  view.focus();
}

/** Home: vai para o começo do texto da linha, depois de marcadores como `- [ ] `, `# ` ou `> ` (que ficam escondidos). */
export function moveToLineTextStart(view: EditorView, select: boolean): boolean {
  const { state } = view;
  view.dispatch({
    selection: EditorSelection.create(
      state.selection.ranges.map((range) => {
        const line = state.doc.lineAt(range.head);
        const indent = /^\s*/.exec(line.text)?.[0].length ?? 0;
        const marker = BLOCK_PREFIX_RE.exec(line.text.slice(indent))?.[0].length ?? 0;
        const target = line.from + indent + marker;
        // Já está no começo do texto? Então o próximo Home vai para o começo real da linha.
        const dest = range.head === target ? line.from : target;
        return select ? EditorSelection.range(range.anchor, dest) : EditorSelection.cursor(dest);
      }),
      state.selection.mainIndex,
    ),
    scrollIntoView: true,
  });
  return true;
}

const HIDDEN_PREFIX_RE = /^(#{1,6} |[-*+] \[[ xX]\] |[-*+] |> )/;

/** Backspace logo depois de um marcador escondido (`- `, `- [ ] `, `# `, `> `) apaga o marcador todo, junto com a indentação. */
export function deleteHiddenMarker(view: EditorView): boolean {
  const { state } = view;
  const { main } = state.selection;
  if (!main.empty || state.selection.ranges.length > 1) return false;
  const line = state.doc.lineAt(main.head);
  const indent = /^\s*/.exec(line.text)?.[0].length ?? 0;
  const marker = HIDDEN_PREFIX_RE.exec(line.text.slice(indent))?.[0].length ?? 0;
  if (marker === 0 || main.head !== line.from + indent + marker) return false;
  view.dispatch({ changes: { from: line.from, to: main.head }, selection: { anchor: line.from }, userEvent: "delete.backward" });
  return true;
}

type TreeNode = ReturnType<ReturnType<typeof syntaxTree>["resolveInner"]>;

const INLINE_MARKED = new Set(["StrongEmphasis", "Emphasis", "Strikethrough", "InlineCode"]);

/**
 * Enter com o cursor antes das marcas de fechamento (`**texto|**`): move o cursor para depois delas,
 * senão a quebra de linha deixaria o `**` na linha de baixo e a formatação ficaria quebrada.
 * Sempre devolve `false` para o Enter normal continuar a partir da nova posição.
 */
export function skipClosingMarks(view: EditorView): boolean {
  const { state } = view;
  const { main } = state.selection;
  if (!main.empty) return false;
  const tree = syntaxTree(state);
  let pos = main.head;
  for (;;) {
    let next = -1;
    for (let node: TreeNode | null = tree.resolveInner(pos, 1); node; node = node.parent) {
      if (!INLINE_MARKED.has(node.name) || node.to <= pos) continue;
      const closing = node.lastChild;
      if (closing && closing.name.endsWith("Mark") && closing.from === pos && closing.to === node.to) {
        next = node.to;
        break;
      }
    }
    if (next < 0) break;
    pos = next;
  }
  if (pos !== main.head) view.dispatch({ selection: { anchor: pos } });
  return false;
}
