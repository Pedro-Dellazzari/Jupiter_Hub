import type { ReactNode } from "react";
import { Card } from "./Card";

/** Lista simples de itens dentro de um Card — usada nas views "com dados" dos módulos
 *  que ainda não têm uma visão populada desenhada no Figma. */
export function ListCard({ children }: { children: ReactNode }) {
  return <Card className="flex flex-col divide-y divide-(--color-track) p-1.5">{children}</Card>;
}

export function ListRow({
  leading,
  title,
  subtitle,
  progress,
  trailing,
}: {
  leading?: ReactNode;
  title: ReactNode;
  /** Linha de contexto opcional abaixo do título (ex: contagem de tarefas, próxima tarefa). */
  subtitle?: ReactNode;
  /** Conteúdo full-width opcional entre o título e o subtítulo (ex: ProgressBar). */
  progress?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md px-3 py-2.5 hover:bg-(--color-fill)">
      <div className="flex items-center gap-3">
        {leading}
        <span className="min-w-0 flex-1 truncate text-[14px] text-(--color-ink)">{title}</span>
        {trailing}
      </div>
      {progress}
      {subtitle}
    </div>
  );
}
