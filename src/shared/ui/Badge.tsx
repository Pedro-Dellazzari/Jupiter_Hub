import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../utils/cn";

export function Badge({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "rounded-md bg-(--color-fill) px-2 py-[3px] text-[11px] font-medium text-(--color-ink-muted)",
        className,
      )}
      {...props}
    />
  );
}
