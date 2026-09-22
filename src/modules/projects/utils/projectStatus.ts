export type ProjectStatusTone = "active" | "neutral";
export type ProjectStatusBucket = "active" | "planning" | "paused";

/** Mapeia o status livre gravado no banco (default "planning") para um rótulo + tom visual. */
export function projectStatusInfo(status: string): { label: string; tone: ProjectStatusTone } {
  switch (status) {
    case "active":
    case "in_progress":
      return { label: "Em andamento", tone: "active" };
    case "paused":
      return { label: "Pausado", tone: "neutral" };
    default:
      return { label: "Planejado", tone: "neutral" };
  }
}

/** Mesmo mapeamento de {@link projectStatusInfo}, como categoria — usado para filtrar/contar por status. */
export function projectStatusBucket(status: string): ProjectStatusBucket {
  switch (status) {
    case "active":
    case "in_progress":
      return "active";
    case "paused":
      return "paused";
    default:
      return "planning";
  }
}
