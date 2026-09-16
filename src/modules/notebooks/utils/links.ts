import type { Note } from "../../../db/repositories/notesRepo";

export type Wikilink = {
  start: number;
  end: number;
  title: string;
  alias: string | null;
  raw: string;
};

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

/** Extrai todos os links `[[Nota]]` / `[[Nota|Alias]]` de um conteúdo. */
export function parseWikilinks(content: string): Wikilink[] {
  return Array.from(content.matchAll(WIKILINK_RE)).map((m) => ({
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length,
    title: m[1].trim(),
    alias: m[2]?.trim() ?? null,
    raw: m[0],
  }));
}

/** Retorna o wikilink que contém a posição do cursor, se houver. */
export function linkAtPosition(content: string, pos: number): Wikilink | null {
  return parseWikilinks(content).find((link) => pos >= link.start && pos <= link.end) ?? null;
}

function sameTitle(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Localiza a nota cujo título bate (case-insensitive) com o texto de um link. */
export function resolveNoteByTitle(notes: Note[], title: string): Note | undefined {
  return notes.find((n) => sameTitle(n.title, title));
}

/** Notas cujo conteúdo linka para a nota informada — usado no painel de backlinks. */
export function findBacklinks(note: Note, allNotes: Note[]): Note[] {
  return allNotes.filter(
    (n) => n.id !== note.id && parseWikilinks(n.content).some((link) => sameTitle(link.title, note.title)),
  );
}

/** Atualiza todas as referências `[[Antigo]]` (preservando alias) para o novo título — same as Obsidian's auto-update on rename. */
export function renameWikilinks(content: string, oldTitle: string, newTitle: string): string {
  return content.replace(WIKILINK_RE, (raw, title: string, alias?: string) => {
    if (!sameTitle(title, oldTitle)) return raw;
    return alias !== undefined ? `[[${newTitle}|${alias}]]` : `[[${newTitle}]]`;
  });
}

/** Detecta um `[[` aberto (sem fechamento) antes do cursor, para disparar o autocomplete. */
export function findWikilinkTrigger(text: string, cursor: number): { start: number; query: string } | null {
  const upToCursor = text.slice(0, cursor);
  const openIdx = upToCursor.lastIndexOf("[[");
  if (openIdx === -1) return null;
  const between = upToCursor.slice(openIdx + 2);
  if (between.includes("]]") || between.includes("\n") || between.includes("[[")) return null;
  return { start: openIdx, query: between };
}

export function countTags(content: string): number {
  const matches = content.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  return new Set(matches).size;
}
