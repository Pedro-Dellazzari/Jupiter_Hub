import type { ReactNode, RefObject } from "react";
import { Dialog as RadixDialog } from "radix-ui";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { springs } from "../motion/springs";
import { useBackHandler } from "../hooks/useBackHandler";
import { useIsCompact } from "../hooks/useIsCompact";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Elemento a focar quando o diálogo abre (ex: o input principal do form). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
};

/** Centralizado no desktop/tablet; no celular vira bottom sheet (como nos mockups do Fold fechado). */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  initialFocusRef,
  children,
}: DialogProps) {
  const compact = useIsCompact();
  useBackHandler(open, () => onOpenChange(false));

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={springs.snappy}
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content
              asChild
              forceMount
              onOpenAutoFocus={(e) => {
                if (initialFocusRef?.current) {
                  e.preventDefault();
                  initialFocusRef.current.focus();
                }
              }}
            >
              {compact ? (
                <motion.div
                  className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[24px] bg-(--color-surface-elevated) px-5 pt-2.5 pb-[calc(var(--safe-bottom)+24px)] shadow-xl"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={springs.standard}
                >
                  <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-(--color-ink-muted)/30" />
                  <DialogHeader title={title} description={description} large />
                  {children}
                </motion.div>
              ) : (
                <motion.div
                  className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm rounded-2xl bg-(--color-surface-elevated) p-6 shadow-xl"
                  initial={{ opacity: 0, scale: 0.96, x: "-50%", y: "-50%" }}
                  animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                  exit={{ opacity: 0, scale: 0.96, x: "-50%", y: "-50%" }}
                  transition={springs.standard}
                >
                  <DialogHeader title={title} description={description} />
                  {children}
                </motion.div>
              )}
            </RadixDialog.Content>
          </RadixDialog.Portal>
        )}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}

function DialogHeader({ title, description, large }: { title: string; description?: string; large?: boolean }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <RadixDialog.Title
          className={large ? "text-[20px] font-bold text-(--color-ink)" : "text-[16px] font-semibold text-(--color-ink)"}
        >
          {title}
        </RadixDialog.Title>
        {description && (
          <RadixDialog.Description className="mt-1 text-[13px] text-(--color-ink-muted)">
            {description}
          </RadixDialog.Description>
        )}
      </div>
      <RadixDialog.Close className="shrink-0 p-1 text-(--color-ink-muted) hover:text-(--color-ink)">
        <X className={large ? "size-5" : "size-4"} strokeWidth={2} />
      </RadixDialog.Close>
    </div>
  );
}
