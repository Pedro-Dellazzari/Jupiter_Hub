import { Construction } from "lucide-react";
import { motion } from "motion/react";
import { springs } from "../motion/springs";
import { ModuleHeader } from "./ModuleHeader";

/** Tela padrão para um módulo ainda não implementado: ícone + "404" + título + descrição, centralizado. */
export function ModulePlaceholder({
  title,
  description = "Esse módulo ainda está sendo desenhado. Volte em breve.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.standard}
      className="flex h-full flex-col px-10 py-8"
    >
      <ModuleHeader title={title} />
      <div className="flex flex-1 flex-col items-center justify-center gap-3.5">
        <div className="flex size-[88px] items-center justify-center rounded-[24px] bg-(--color-fill)">
          <Construction className="size-9 text-(--color-ink-muted)" strokeWidth={1.75} />
        </div>
        <span className="text-[11px] font-semibold tracking-[0.6px] text-(--color-ink-muted)/70">404</span>
        <p className="text-[17px] font-semibold text-(--color-ink)">Em construção</p>
        <p className="w-[320px] text-center text-[13px] text-(--color-ink-muted)">{description}</p>
      </div>
    </motion.div>
  );
}
