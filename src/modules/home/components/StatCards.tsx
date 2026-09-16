import type { ReactNode } from "react";
import { CheckSquare, Repeat, Timer, Calendar } from "lucide-react";
import { Card } from "../../../shared/ui/Card";
import { habitStreak, nextEvent, tasksToday, timeTracker } from "../mockData";

function StatCardShell({
  icon,
  label,
  value,
  valueClassName,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
  children?: ReactNode;
}) {
  return (
    <Card className="flex flex-1 flex-col gap-3 p-5">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-(--color-ink-muted)">
        {icon}
        <span>{label}</span>
      </div>
      <p
        className={`text-[28px] leading-[1.05] font-bold tracking-[-0.4px] text-(--color-ink) ${valueClassName ?? ""}`}
      >
        {value}
      </p>
      {children}
    </Card>
  );
}

export function StatCards() {
  return (
    <div className="flex items-start gap-5">
      <StatCardShell
        icon={<CheckSquare className="size-3.5" strokeWidth={2} />}
        label="Tarefas de hoje"
        value={`${tasksToday.completed} / ${tasksToday.total}`}
      >
        <p className="text-[13px] text-(--color-ink-muted)">concluídas</p>
        {tasksToday.overdue > 0 && (
          <p className="text-[12px] font-medium text-(--color-danger)">
            {tasksToday.overdue} atrasada{tasksToday.overdue > 1 ? "s" : ""}
          </p>
        )}
      </StatCardShell>

      <StatCardShell
        icon={<Repeat className="size-3.5" strokeWidth={2} />}
        label="Hábitos"
        value={`${habitStreak.days} dias`}
      >
        <p className="text-[13px] text-(--color-ink-muted)">sequência atual</p>
      </StatCardShell>

      <StatCardShell
        icon={<Timer className="size-3.5" strokeWidth={2} />}
        label="Time Tracker"
        value={timeTracker.elapsed}
        valueClassName="text-(--color-accent)"
      >
        <p className="text-[13px] text-(--color-ink-muted)">
          {timeTracker.projectName} · {timeTracker.active ? "em andamento" : "pausado"}
        </p>
      </StatCardShell>

      <Card className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-1.5">
          <div className="flex flex-1 items-center gap-1.5 text-[13px] font-semibold text-(--color-ink-muted)">
            <Calendar className="size-3.5" strokeWidth={2} />
            <span>Próximo evento</span>
          </div>
          {nextEvent.source === "google" && (
            <div className="flex size-[13px] items-center justify-center rounded-[4px] bg-[#ea4335] text-[7px] font-semibold text-white">
              G
            </div>
          )}
        </div>
        <p className="text-[28px] leading-[1.05] font-bold text-(--color-ink)">{nextEvent.time}</p>
        <p className="text-[13px] text-(--color-ink-muted)">{nextEvent.title}</p>
      </Card>
    </div>
  );
}
