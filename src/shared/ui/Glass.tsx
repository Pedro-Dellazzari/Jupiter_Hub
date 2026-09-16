import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../utils/cn";

type GlassProps = ComponentPropsWithoutRef<"div"> & {
  /** "regular" para painéis de conteúdo, "thick" para chrome (sidebar, title bar). */
  material?: "regular" | "thick";
};

export function Glass({ material = "regular", className, ...props }: GlassProps) {
  return (
    <div
      className={cn(
        "backdrop-blur-xl",
        material === "regular"
          ? "rounded-(--radius-glass) border border-white/10 bg-(--color-surface-elevated)/70"
          : "bg-(--color-surface-elevated)/72 shadow-[3px_0px_24px_0px_rgba(0,0,0,0.06)]",
        className,
      )}
      {...props}
    />
  );
}
