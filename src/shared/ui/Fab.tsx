import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { springs } from "../motion/springs";

/**
 * Botão flutuante de criar (canto inferior direito), só no layout compacto. No desktop e no
 * tablet a ação continua no botão do cabeçalho, que some no compacto (`compact:hidden`).
 */
export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.92, transition: springs.snappy }}
      className="absolute right-4 bottom-4 z-30 hidden size-14 items-center justify-center rounded-2xl bg-(--color-accent) text-(--color-accent-ink) shadow-[0px_6px_16px_0px_rgba(232,137,43,0.4)] compact:flex"
    >
      <Plus className="size-6" strokeWidth={2.25} />
    </motion.button>
  );
}
