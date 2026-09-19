import type { LucideIcon } from "lucide-react";
import { Hexagon, FolderKanban, Calendar } from "lucide-react";

function EmptyCard({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-(--color-divider) px-6 py-7 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl bg-(--color-fill)">
        <Icon className="size-4 text-(--color-ink-muted)" strokeWidth={2} />
      </div>
      <p className="text-[14px] font-semibold text-(--color-ink)">{title}</p>
      <p className="w-[220px] text-[12px] text-(--color-ink-muted)">{description}</p>
      <button
        onClick={onAction}
        className="rounded-[9px] bg-(--color-accent) px-4 py-2 text-[12px] font-semibold text-(--color-accent-ink)"
      >
        {ctaLabel}
      </button>
    </div>
  );
}

export function OnboardingEmptyRow({
  onCreateSpace,
  onCreateProject,
  onConnectCalendar,
}: {
  onCreateSpace: () => void;
  onCreateProject: () => void;
  onConnectCalendar: () => void;
}) {
  return (
    <div className="flex items-stretch gap-5">
      <EmptyCard
        icon={Hexagon}
        title="Nenhum Espaço ainda"
        description="Espaços organizam suas tarefas, projetos e notas por contexto."
        ctaLabel="Criar Espaço"
        onAction={onCreateSpace}
      />
      <EmptyCard
        icon={FolderKanban}
        title="Nenhum projeto ainda"
        description="Projetos vivem dentro de um Espaço e acompanham progresso."
        ctaLabel="Criar projeto"
        onAction={onCreateProject}
      />
      <EmptyCard
        icon={Calendar}
        title="Calendário não conectado"
        description="Sincronize com Gmail ou Outlook pra ver tudo num só lugar."
        ctaLabel="Conectar"
        onAction={onConnectCalendar}
      />
    </div>
  );
}
