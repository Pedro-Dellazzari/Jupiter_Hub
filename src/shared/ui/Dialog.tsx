import type { ReactNode, RefObject } from "react";
import { Dialog as RadixDialog } from "radix-ui";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { springs } from "../motion/springs";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Elemento a focar quando o diálogo abre (ex: o input principal do form). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  initialFocusRef,
  children,
}: DialogProps) {
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
              <motion.div
                className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm rounded-2xl bg-(--color-surface-elevated) p-6 shadow-xl"
                initial={{ opacity: 0, scale: 0.96, x: "-50%", y: "-50%" }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.96, x: "-50%", y: "-50%" }}
                transition={springs.standard}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <RadixDialog.Title className="text-[16px] font-semibold text-(--color-ink)">
                      {title}
                    </RadixDialog.Title>
                    {description && (
                      <RadixDialog.Description className="mt-1 text-[13px] text-(--color-ink-muted)">
                        {description}
                      </RadixDialog.Description>
                    )}
                  </div>
                  <RadixDialog.Close className="shrink-0 text-(--color-ink-muted) hover:text-(--color-ink)">
                    <X className="size-4" strokeWidth={2} />
                  </RadixDialog.Close>
                </div>
                {children}
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        )}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}
