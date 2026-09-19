export type Priority = "none" | "low" | "medium" | "high";

export const PRIORITY_OPTIONS = [
  { value: "none", label: "Nenhuma" },
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
] as const satisfies readonly { value: Priority; label: string }[];

type PriorityStyle = {
  label: string;
  /** Cor do anel do checkbox e do ícone da bandeira. */
  color: string;
  /** Cor do texto do chip (mais escura que `color` no tema claro, para contraste). */
  ink: string;
  /** Maior = mais urgente — usado para ordenar a lista. */
  rank: number;
};

const PRIORITY_STYLES: Record<Priority, PriorityStyle> = {
  none: { label: "Nenhuma", color: "var(--color-divider)", ink: "var(--color-ink-muted)", rank: 0 },
  low: { label: "Baixa", color: "var(--color-accent)", ink: "var(--color-ink-muted)", rank: 1 },
  medium: { label: "Média", color: "var(--color-warning)", ink: "var(--color-warning-ink)", rank: 2 },
  high: { label: "Alta", color: "var(--color-danger)", ink: "var(--color-danger)", rank: 3 },
};

export function priorityStyle(priority: string): PriorityStyle {
  return PRIORITY_STYLES[priority as Priority] ?? PRIORITY_STYLES.none;
}

/** Cor de fundo do chip: tinta suave da cor de urgência (baixa fica neutra, como as demais tags). */
export function priorityChipBackground(priority: string): string {
  if (priority === "high" || priority === "medium") {
    return `color-mix(in srgb, ${priorityStyle(priority).color} 12%, transparent)`;
  }
  return "var(--color-fill)";
}

/** Ordena mais urgente primeiro, preservando a ordem original entre prioridades iguais (sort estável). */
export function sortByPriority<T extends { priority: string }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => priorityStyle(b.priority).rank - priorityStyle(a.priority).rank);
}
