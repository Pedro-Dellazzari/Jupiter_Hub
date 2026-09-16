import { motion } from "motion/react";
import { springs } from "../motion/springs";
import { Glass } from "./Glass";

/** Tela provisória para módulos ainda não implementados. */
export function ModulePlaceholder({ title }: { title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.standard}
      className="flex h-full items-center justify-center px-10 py-8"
    >
      <Glass className="px-8 py-6 text-center">
        <h1 className="text-lg font-medium text-(--color-ink)">{title}</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          Módulo ainda não implementado.
        </p>
      </Glass>
    </motion.div>
  );
}
