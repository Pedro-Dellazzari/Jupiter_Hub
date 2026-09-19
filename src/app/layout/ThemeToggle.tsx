import { Moon, Sun } from "lucide-react";
import { useResolvedTheme, useThemeStore } from "../store/useThemeStore";
import { cn } from "../../shared/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useResolvedTheme();
  const toggle = useThemeStore((s) => s.toggle);
  const label = theme === "dark" ? "Mudar para o modo claro" : "Mudar para o modo escuro";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-lg text-(--color-ink-muted) transition-colors hover:bg-(--color-fill) hover:text-(--color-ink)",
        className,
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </button>
  );
}
