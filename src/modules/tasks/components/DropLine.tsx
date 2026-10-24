import { cn } from "../../../shared/utils/cn";

/** Linha que marca onde o item arrastado (tarefa ou subtarefa) vai cair. */
export function DropLine({ edge }: { edge: "top" | "bottom" }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-2 z-10 h-0.5 rounded-full bg-(--color-accent)",
        edge === "top" ? "-top-px" : "-bottom-px",
      )}
    />
  );
}
