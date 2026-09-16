import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../utils/cn";

/** Superfície opaca elevada (sombra suave, sem blur) — cards de conteúdo. */
export function Card({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-(--color-surface-elevated) shadow-[0px_2px_10px_0px_rgba(0,0,0,0.06)]",
        className,
      )}
      {...props}
    />
  );
}
