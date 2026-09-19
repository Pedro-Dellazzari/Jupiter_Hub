import { Flag } from "lucide-react";
import { cn } from "../../../shared/utils/cn";
import { PRIORITY_OPTIONS, priorityChipBackground, priorityStyle } from "../utils/priority";

/** Seleção única de prioridade — o chip ativo herda a cor de urgência (Alta vermelho, Média laranja). */
export function PriorityChips({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRIORITY_OPTIONS.map((option) => {
        const selected = option.value === value;
        const urgent = option.value === "high" || option.value === "medium";
        const style = priorityStyle(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={selected && urgent ? { backgroundColor: priorityChipBackground(option.value), color: style.ink } : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] transition-colors",
              selected
                ? cn("font-semibold", !urgent && "bg-(--color-accent)/12 text-(--color-accent-text)")
                : "bg-(--color-fill) font-medium text-(--color-ink-muted) hover:text-(--color-ink)",
            )}
          >
            {selected && urgent && <Flag className="size-3 fill-current" strokeWidth={2} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
