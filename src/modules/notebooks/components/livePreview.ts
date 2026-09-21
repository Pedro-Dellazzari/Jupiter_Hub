import { syntaxTree } from "@codemirror/language";
import { type Extension, type Range } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";

/**
 * "Live Preview" estilo Obsidian: o Markdown é renderizado enquanto se escreve e a sintaxe
 * (`#`, `**`, `[[ ]]`…) só aparece no elemento onde o cursor está.
 */

const TAG_RE = /(?<![\p{L}\p{N}&/])#[\p{L}_][\p{L}\p{N}_/-]*/gu;
const WIKILINK_RE = /\[\[([^\]|\n]+?)(?:\|([^\]\n]+?))?\]\]/g;

const HIDE = Decoration.replace({});

class CheckboxWidget extends WidgetType {
  /** `markerOffset`: distância entre o início do trecho substituído (`- `) e o `[` do checkbox. */
  constructor(
    readonly checked: boolean,
    readonly markerOffset: number,
  ) {
    super();
  }

  eq(other: CheckboxWidget) {
    return other.checked === this.checked && other.markerOffset === this.markerOffset;
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement("span");
    wrap.className = "cm-task-wrap";
    const box = document.createElement("span");
    box.className = "cm-task-box" + (this.checked ? " cm-task-box-checked" : "");
    box.setAttribute("role", "checkbox");
    box.setAttribute("aria-checked", String(this.checked));
    wrap.append(box);
    wrap.onmousedown = (e) => {
      e.preventDefault();
      const marker = view.posAtDOM(wrap) + this.markerOffset;
      view.dispatch({ changes: { from: marker + 1, to: marker + 2, insert: this.checked ? " " : "x" } });
    };
    return wrap;
  }

  coordsAt(dom: HTMLElement, pos: number) {
    return widgetCoordsAt(dom, pos);
  }

  ignoreEvent() {
    return true;
  }
}

class BulletWidget extends WidgetType {
  eq() {
    return true;
  }

  toDOM() {
    const bullet = document.createElement("span");
    bullet.className = "cm-bullet";
    bullet.textContent = "•";
    return bullet;
  }

  coordsAt(dom: HTMLElement, pos: number) {
    return widgetCoordsAt(dom, pos);
  }
}

class RuleWidget extends WidgetType {
  eq() {
    return true;
  }

  toDOM() {
    const rule = document.createElement("span");
    rule.className = "cm-rule";
    return rule;
  }
}

/** Sem isto o CodeMirror desenha o cursor no lado esquerdo do widget, mesmo quando ele está logo depois dele (fim da linha). */
function widgetCoordsAt(dom: HTMLElement, pos: number) {
  const rect = dom.getBoundingClientRect();
  const x = pos > 0 ? rect.right : rect.left;
  return { left: x, right: x, top: rect.top, bottom: rect.bottom };
}

const lineDeco = (cls: string) => Decoration.line({ class: cls });
const markDeco = (cls: string, attrs?: Record<string, string>) => Decoration.mark({ class: cls, attributes: attrs });

export type LivePreviewOptions = {
  noteExists: (title: string) => boolean;
};

type Built = { decorations: DecorationSet; atomic: DecorationSet };

function buildDecorations(view: EditorView, options: LivePreviewOptions): Built {
  const { state } = view;
  const { doc } = state;
  const focused = view.hasFocus;
  const decos: Range<Decoration>[] = [];
  const atomic: Range<Decoration>[] = [];
  const codeRanges: [number, number][] = [];

  const touches = (from: number, to: number) =>
    focused && state.selection.ranges.some((r) => r.from <= to && r.to >= from);
  const lineActive = (pos: number) => {
    const line = doc.lineAt(pos);
    return touches(line.from, line.to);
  };
  /** Tudo que é substituído também é "atômico": o cursor pula o trecho inteiro em vez de parar no meio dele. */
  const replace = (from: number, to: number, deco: Decoration) => {
    if (to <= from) return;
    decos.push(deco.range(from, to));
    atomic.push(deco.range(from, to));
  };
  const hide = (from: number, to: number) => replace(from, to, HIDE);
  const lineEnd = (pos: number) => doc.lineAt(pos).to;
  const eachLine = (from: number, to: number, fn: (lineFrom: number, index: number, count: number) => void) => {
    const first = doc.lineAt(from).number;
    const last = doc.lineAt(to).number;
    for (let n = first; n <= last; n++) fn(doc.line(n).from, n - first, last - first + 1);
  };

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter(node) {
        const name = node.name;
        const heading = /^ATXHeading(\d)$/.exec(name);
        if (heading) {
          decos.push(lineDeco(`cm-h cm-h${heading[1]}`).range(doc.lineAt(node.from).from));
          return;
        }
        switch (name) {
          case "HeaderMark": {
            if (node.node.parent?.name.startsWith("ATX")) hide(node.from, Math.min(node.to + 1, lineEnd(node.from)));
            return;
          }
          case "StrongEmphasis":
            decos.push(markDeco("cm-strong").range(node.from, node.to));
            return;
          case "Emphasis":
            decos.push(markDeco("cm-em").range(node.from, node.to));
            return;
          case "Strikethrough":
            decos.push(markDeco("cm-strike").range(node.from, node.to));
            return;
          case "InlineCode":
            codeRanges.push([node.from, node.to]);
            decos.push(markDeco("cm-inline-code").range(node.from, node.to));
            return;
          case "EmphasisMark":
          case "StrikethroughMark": {
            const parent = node.node.parent;
            if (parent && !touches(parent.from, parent.to)) hide(node.from, node.to);
            return;
          }
          case "CodeMark": {
            const parent = node.node.parent;
            if (parent?.name === "InlineCode" && !touches(parent.from, parent.to)) hide(node.from, node.to);
            return;
          }
          case "Link": {
            decos.push(markDeco("cm-link").range(node.from, node.to));
            return;
          }
          case "LinkMark":
          case "URL":
          case "LinkTitle": {
            const parent = node.node.parent;
            if (parent?.name === "Link" && !touches(parent.from, parent.to)) hide(node.from, node.to);
            return;
          }
          case "Blockquote":
            eachLine(node.from, node.to, (lineFrom) => decos.push(lineDeco("cm-quote").range(lineFrom)));
            return;
          case "QuoteMark":
            hide(node.from, Math.min(node.to + 1, lineEnd(node.from)));
            return;
          case "FencedCode":
            codeRanges.push([node.from, node.to]);
            eachLine(node.from, node.to, (lineFrom, i, count) => {
              const edge = i === 0 ? " cm-code-first cm-fence" : i === count - 1 ? " cm-code-last cm-fence" : "";
              decos.push(lineDeco("cm-code-line" + edge).range(lineFrom));
            });
            return;
          case "HorizontalRule":
            if (!lineActive(node.from)) replace(node.from, node.to, Decoration.replace({ widget: new RuleWidget() }));
            return;
          case "ListMark": {
            const item = node.node.parent;
            const listType = item?.parent?.name;
            if (listType === "BulletList") {
              // Item de checklist: o marcador vira a caixinha (tratada em TaskMarker).
              if (item?.getChild("Task")) return;
              replace(node.from, Math.min(node.to + 1, lineEnd(node.from)), Decoration.replace({ widget: new BulletWidget() }));
            } else if (listType === "OrderedList") {
              decos.push(markDeco("cm-list-num").range(node.from, node.to));
            }
            return;
          }
          case "TaskMarker": {
            const checked = /[xX]/.test(doc.sliceString(node.from, node.to));
            const task = node.node.parent;
            const listMark = task?.parent?.getChild("ListMark");
            if (checked && task) decos.push(markDeco("cm-task-done").range(node.to, Math.max(task.to, node.to)));
            // "- [ ] " inteiro vira uma caixinha só, então Backspace remove o marcador de uma vez.
            const start = listMark ? listMark.from : node.from;
            replace(start, Math.min(node.to + 1, lineEnd(node.from)), Decoration.replace({ widget: new CheckboxWidget(checked, node.from - start) }));
            return;
          }
        }
      },
    });
  }

  const inCode = (pos: number) => codeRanges.some(([a, b]) => pos >= a && pos < b);
  const seenLines = new Set<number>();

  for (const { from, to } of view.visibleRanges) {
    eachLine(from, to, (lineFrom) => {
      if (seenLines.has(lineFrom)) return;
      seenLines.add(lineFrom);
      const line = doc.lineAt(lineFrom);

      for (const m of line.text.matchAll(WIKILINK_RE)) {
        const start = line.from + (m.index ?? 0);
        const end = start + m[0].length;
        if (inCode(start)) continue;
        const title = m[1].trim();
        const cls = "cm-wikilink" + (options.noteExists(title) ? "" : " cm-wikilink-missing");
        decos.push(markDeco(cls).range(start, end));
        if (!touches(start, end)) {
          hide(start, start + 2);
          if (m[2] !== undefined) hide(start + 2, start + 2 + m[1].length + 1);
          hide(end - 2, end);
        }
      }

      for (const m of line.text.matchAll(TAG_RE)) {
        const start = line.from + (m.index ?? 0);
        if (inCode(start)) continue;
        decos.push(markDeco("cm-tag").range(start, start + m[0].length));
      }
    });
  }

  return { decorations: Decoration.set(decos, true), atomic: Decoration.set(atomic, true) };
}

export function livePreview(options: LivePreviewOptions): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      atomic: DecorationSet;

      constructor(view: EditorView) {
        ({ decorations: this.decorations, atomic: this.atomic } = buildDecorations(view, options));
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged) {
          ({ decorations: this.decorations, atomic: this.atomic } = buildDecorations(update.view, options));
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
  return [plugin, EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomic ?? Decoration.none)];
}

export const livePreviewTheme = EditorView.theme({
  "&": { fontSize: "14px", color: "var(--color-ink)", backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "inherit", lineHeight: "1.7", overflow: "visible" },
  ".cm-content": { padding: "0 0 40px", caretColor: "var(--color-ink)" },
  ".cm-line": { padding: "0" },
  ".cm-cursor": { borderLeftColor: "var(--color-ink)" },
  ".cm-placeholder": { color: "color-mix(in srgb, var(--color-ink-muted) 60%, transparent)" },
  ".cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    background: "color-mix(in srgb, var(--color-accent) 25%, transparent)",
  },

  ".cm-h": { fontWeight: "600", paddingTop: "0.6em" },
  ".cm-h1": { fontSize: "22px", fontWeight: "700", letterSpacing: "-0.4px", paddingTop: "0.8em" },
  ".cm-h2": { fontSize: "17px" },
  ".cm-h3": { fontSize: "15px" },
  ".cm-h4": { fontSize: "14px" },
  ".cm-h5": { fontSize: "14px", color: "var(--color-ink-muted)" },
  ".cm-h6": { fontSize: "13px", color: "var(--color-ink-muted)" },

  ".cm-strong": { fontWeight: "600" },
  ".cm-em": { fontStyle: "italic" },
  ".cm-strike": { textDecoration: "line-through", color: "var(--color-ink-muted)" },
  ".cm-inline-code": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "12.5px",
    background: "var(--color-fill)",
    borderRadius: "4px",
    padding: "1px 3px",
  },
  ".cm-link": {
    color: "var(--color-accent-text)",
    textDecoration: "underline",
    textDecorationColor: "color-mix(in srgb, var(--color-accent) 40%, transparent)",
    textUnderlineOffset: "2px",
  },
  ".cm-wikilink": {
    color: "var(--color-accent-text)",
    background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
    borderRadius: "4px",
    padding: "1px 3px",
    fontWeight: "500",
    cursor: "text",
  },
  ".cm-wikilink-missing": { opacity: "0.6", textDecoration: "underline dotted" },
  ".cm-tag": { color: "var(--color-accent-text)", fontWeight: "500" },

  ".cm-quote": {
    borderLeft: "3px solid var(--color-accent)",
    paddingLeft: "12px !important",
    color: "var(--color-ink-muted)",
    fontStyle: "italic",
  },
  ".cm-code-line": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "12px",
    background: "var(--color-fill)",
    padding: "0 16px !important",
  },
  ".cm-code-first": { borderRadius: "8px 8px 0 0", paddingTop: "8px !important" },
  ".cm-code-last": { borderRadius: "0 0 8px 8px", paddingBottom: "8px !important" },
  ".cm-fence": { color: "color-mix(in srgb, var(--color-ink-muted) 70%, transparent)" },

  ".cm-bullet": { display: "inline-block", width: "1.4em", color: "var(--color-ink-muted)" },
  ".cm-list-num": { color: "var(--color-ink-muted)" },
  ".cm-rule": {
    display: "inline-block",
    width: "100%",
    borderTop: "1px solid var(--color-divider)",
    verticalAlign: "middle",
  },
  ".cm-task-wrap": { display: "inline-block", paddingRight: "8px" },
  ".cm-task-box": {
    display: "inline-block",
    width: "14px",
    height: "14px",
    verticalAlign: "-2px",
    borderRadius: "4px",
    border: "1.5px solid color-mix(in srgb, var(--color-ink-muted) 60%, transparent)",
    cursor: "pointer",
    boxSizing: "border-box",
    textAlign: "center",
    lineHeight: "11px",
    fontSize: "10px",
    fontWeight: "700",
  },
  ".cm-task-box-checked": {
    background: "var(--color-accent)",
    borderColor: "var(--color-accent)",
    color: "var(--color-accent-ink)",
  },
  ".cm-task-box-checked::after": { content: '"✓"' },
  ".cm-task-done": { color: "var(--color-ink-muted)", textDecoration: "line-through" },
});
