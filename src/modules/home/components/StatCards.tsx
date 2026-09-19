import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckSquare, Repeat, Timer, Calendar } from "lucide-react";
import { Card } from "../../../shared/ui/Card";
import { useRepoList } from "../../../shared/hooks/useRepoList";
import { tasksRepo } from "../../../db/repositories/tasksRepo";
import { timeEntriesRepo } from "../../../db/repositories/timeEntriesRepo";
import { projectsRepo } from "../../../db/repositories/projectsRepo";
import { parseIsoDate, startOfDay } from "../../../shared/utils/date";
import { habitStreak, nextEvent } from "../mockData";

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

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function TasksTodayCard() {
  const { state } = useRepoList(tasksRepo.list);
  const today = useMemo(() => new Date(), []);
  const tasks = state.status === "ready" ? state.items : [];
  const todayStart = startOfDay(today);

  const todayTasks = tasks.filter((t) => t.due_date && parseIsoDate(t.due_date).getTime() === todayStart.getTime());
  const completed = todayTasks.filter((t) => t.status === "done").length;
  const overdue = tasks.filter((t) => t.status !== "done" && t.due_date && parseIsoDate(t.due_date) < todayStart).length;

  return (
    <StatCardShell
      icon={<CheckSquare className="size-3.5" strokeWidth={2} />}
      label="Tarefas de hoje"
      value={`${completed} / ${todayTasks.length}`}
    >
      <p className="text-[13px] text-(--color-ink-muted)">concluídas</p>
      {overdue > 0 && (
        <p className="text-[12px] font-medium text-(--color-danger)">
          {overdue} atrasada{overdue > 1 ? "s" : ""}
        </p>
      )}
    </StatCardShell>
  );
}

function TimeTrackerCard() {
  const { state } = useRepoList(timeEntriesRepo.list);
  const projectsState = useRepoList(projectsRepo.list);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const entries = state.status === "ready" ? state.items : [];
  const projects = projectsState.state.status === "ready" ? projectsState.state.items : [];
  const active = entries.find((e) => e.ended_at === null);
  const elapsedSeconds = active ? Math.max(0, Math.floor((now - new Date(active.started_at).getTime()) / 1000)) : 0;
  const projectName = active?.project_id ? (projects.find((p) => p.id === active.project_id)?.name ?? null) : null;

  return (
    <StatCardShell
      icon={<Timer className="size-3.5" strokeWidth={2} />}
      label="Time Tracker"
      value={active ? formatElapsed(elapsedSeconds) : "00:00:00"}
      valueClassName={active ? "text-(--color-accent-text)" : undefined}
    >
      <p className="text-[13px] text-(--color-ink-muted)">
        {active ? `${projectName ?? "Sem projeto"} · em andamento` : "Nenhum timer ativo"}
      </p>
    </StatCardShell>
  );
}

export function StatCards() {
  return (
    <div className="flex items-start gap-5">
      <TasksTodayCard />

      <StatCardShell
        icon={<Repeat className="size-3.5" strokeWidth={2} />}
        label="Hábitos"
        value={`${habitStreak.days} dias`}
      >
        <p className="text-[13px] text-(--color-ink-muted)">sequência atual</p>
      </StatCardShell>

      <TimeTrackerCard />

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
