import { cn } from "../utils/cn";

/** Grupo de chips de seleção única (ex: status, prioridade) — mesmo padrão visual do item ativo da sidebar. */
export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-3.5 py-2 text-[13px] transition-colors",
              selected
                ? "bg-(--color-accent)/12 font-semibold text-(--color-accent-text)"
                : "bg-(--color-fill) font-medium text-(--color-ink-muted) hover:text-(--color-ink)",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
