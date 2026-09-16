import { CheckSquare, LayoutGrid, Repeat } from "lucide-react";
import { tasksRepo } from "../../db/repositories/tasksRepo";
import { habitsRepo } from "../../db/repositories/habitsRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { ListCard, ListRow } from "../../shared/ui/ListCard";
import { DayStrip } from "./components/DayStrip";
import { Panel, MiniEmpty } from "./components/Panel";

function todayLabel(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function Today() {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const tasksState = useRepoList(tasksRepo.list);
  const habitsState = useRepoList(habitsRepo.list);

  const tasksToday =
    tasksState.state.status === "ready"
      ? tasksState.state.items.filter((t) => t.due_date === todayIso)
      : [];
  const habitsToday = habitsState.state.status === "ready" ? habitsState.state.items : [];

  const hasError = tasksState.state.status === "error" || habitsState.state.status === "error";

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-(--color-ink)">Hoje</h1>
          <p className="text-[14px] text-(--color-ink-muted)">{todayLabel(today)}</p>
        </div>

        <DayStrip today={today} />

        {hasError ? (
          <ModuleErrorState />
        ) : (
          <div className="flex items-start gap-5">
            <Panel title="Agenda" className="flex-1">
              <MiniEmpty icon={LayoutGrid} label="Nada agendado — conecte seu calendário" />
            </Panel>

            <div className="flex flex-1 flex-col gap-4">
              <Panel title="Tarefas de hoje">
                {tasksToday.length === 0 ? (
                  <MiniEmpty icon={CheckSquare} label="Nenhuma tarefa para hoje" />
                ) : (
                  <ListCard>
                    {tasksToday.map((task) => (
                      <ListRow
                        key={task.id}
                        leading={<CheckSquare className="size-4 shrink-0 text-(--color-ink-muted)" strokeWidth={1.75} />}
                        title={task.title}
                      />
                    ))}
                  </ListCard>
                )}
              </Panel>

              <Panel title="Hábitos de hoje">
                {habitsToday.length === 0 ? (
                  <MiniEmpty icon={Repeat} label="Nenhum hábito criado ainda" />
                ) : (
                  <ListCard>
                    {habitsToday.map((habit) => (
                      <ListRow
                        key={habit.id}
                        leading={<Repeat className="size-4 shrink-0 text-(--color-ink-muted)" strokeWidth={1.75} />}
                        title={habit.name}
                      />
                    ))}
                  </ListCard>
                )}
              </Panel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
