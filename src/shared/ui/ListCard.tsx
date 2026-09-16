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
  trailing,
}: {
  leading?: ReactNode;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      {leading}
      <span className="flex-1 truncate text-[14px] text-(--color-ink)">{title}</span>
      {trailing}
    </div>
  );
}
