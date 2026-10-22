import { cn } from "../../../shared/utils/cn";

export type TaskStatusFilter = "all" | "open" | "done";

const OPTIONS: { value: TaskStatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "open", label: "Abertas" },
  { value: "done", label: "Concluídas" },
];

/** Chips Todas / Abertas / Concluídas da barra de filtros (tela de Tarefas e aba Tarefas do Espaço). */
export function StatusFilterChips({
  value,
  onChange,
}: {
  value: TaskStatusFilter;
  onChange: (value: TaskStatusFilter) => void;
}) {
  return (
    <>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[12px]",
            value === option.value
              ? "bg-(--color-accent)/12 font-semibold text-(--color-accent-text)"
              : "font-medium text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)",
          )}
        >
          {option.label}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-(--color-divider)" />
    </>
  );
}
