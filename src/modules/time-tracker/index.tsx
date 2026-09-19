import { useEffect, useState } from "react";
import { Play, Square, Timer } from "lucide-react";
import { timeEntriesRepo } from "../../db/repositories/timeEntriesRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ListCard, ListRow } from "../../shared/ui/ListCard";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";

function formatElapsed(startedAt: string, nowMs: number) {
  const totalSeconds = Math.max(0, Math.floor((nowMs - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export default function TimeTracker() {
  const { state, reload } = useRepoList(timeEntriesRepo.list);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const activeEntry = state.status === "ready" ? state.items.find((e) => e.ended_at === null) : undefined;

  useEffect(() => {
    if (!activeEntry) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <h1 className="mb-6 text-[24px] font-bold tracking-[-0.5px] text-(--color-ink)">Time Tracker</h1>

      {state.status === "loading" && null}
      {state.status === "error" && <ModuleErrorState />}

      {state.status === "ready" && activeEntry && (
        <Card className="mb-6 flex items-center gap-4 p-5">
          <div className="flex size-10 items-center justify-center rounded-full bg-(--color-accent)/12">
            <Timer className="size-4 text-(--color-accent-text)" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] text-(--color-ink-muted)">Cronômetro em andamento</p>
            <p className="text-[22px] font-bold tracking-[-0.4px] text-(--color-accent-text)">
              {formatElapsed(activeEntry.started_at, nowMs)}
            </p>
          </div>
          <button
            onClick={() => timeEntriesRepo.stop(activeEntry.id, activeEntry.started_at).then(reload)}
            className="flex items-center gap-1.5 rounded-[10px] bg-(--color-fill) px-4 py-2 text-[13px] font-semibold text-(--color-ink)"
          >
            <Square className="size-3" strokeWidth={2} fill="currentColor" />
            Parar
          </button>
        </Card>
      )}

      {state.status === "ready" && state.items.length === 0 && (
        <EmptyState
          icon={Timer}
          title="Nenhum registro ainda"
          description="Inicie o cronômetro num projeto pra começar a acompanhar seu tempo."
          ctaLabel="▶ Iniciar cronômetro"
          onAction={() => timeEntriesRepo.start().then(reload)}
        />
      )}

      {state.status === "ready" && state.items.length > 0 && !activeEntry && (
        <div className="mb-4">
          <button
            onClick={() => timeEntriesRepo.start().then(reload)}
            className="flex items-center gap-1.5 rounded-[10px] bg-(--color-accent) px-4 py-2 text-[13px] font-semibold text-(--color-accent-ink)"
          >
            <Play className="size-3" strokeWidth={2} fill="currentColor" />
            Iniciar cronômetro
          </button>
        </div>
      )}

      {state.status === "ready" && state.items.filter((e) => e.ended_at !== null).length > 0 && (
        <ListCard>
          {state.items
            .filter((e) => e.ended_at !== null)
            .map((entry) => (
              <ListRow
                key={entry.id}
                leading={<Timer className="size-4 shrink-0 text-(--color-ink-muted)" strokeWidth={1.75} />}
                title={entry.description ?? "Sem descrição"}
                trailing={
                  <span className="text-[12px] text-(--color-ink-muted)">
                    {formatDuration(entry.duration_seconds)}
                  </span>
                }
              />
            ))}
        </ListCard>
      )}
    </div>
  );
}
