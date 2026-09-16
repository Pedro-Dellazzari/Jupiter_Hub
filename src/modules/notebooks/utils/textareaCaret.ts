const MIRRORED_PROPERTIES = [
  "boxSizing",
  "width",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontSize",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "letterSpacing",
  "wordSpacing",
  "whiteSpace",
  "wordWrap",
] as const;

/** Posição (relativa ao viewport) do caractere `position` dentro de um textarea, via técnica do "div espelho". */
export function getCaretCoordinates(el: HTMLTextAreaElement, position: number) {
  const div = document.createElement("div");
  const style = getComputedStyle(el);

  for (const prop of MIRRORED_PROPERTIES) {
    div.style[prop] = style[prop];
  }
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.top = "0";
  div.style.left = "-9999px";

  document.body.appendChild(div);
  div.textContent = el.value.substring(0, position);
  const span = document.createElement("span");
  span.textContent = el.value.substring(position) || ".";
  div.appendChild(span);

  const rect = el.getBoundingClientRect();
  const top = rect.top + span.offsetTop - el.scrollTop;
  const left = rect.left + span.offsetLeft - el.scrollLeft;
  const lineHeight = parseInt(style.lineHeight || "16", 10) || 16;

  document.body.removeChild(div);
  return { top, left, lineHeight };
}
