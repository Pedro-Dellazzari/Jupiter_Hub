import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, CheckSquare, LayoutGrid, Repeat } from "lucide-react";
import { tasksRepo } from "../../db/repositories/tasksRepo";
import { habitsRepo } from "../../db/repositories/habitsRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { springs } from "../../shared/motion/springs";
import { cn } from "../../shared/utils/cn";
import { formatIsoDate, startOfDay } from "../../shared/utils/date";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { ListCard, ListRow } from "../../shared/ui/ListCard";
import { DayStrip } from "./components/DayStrip";
import { Panel, MiniEmpty } from "./components/Panel";

/** Deslize horizontal no sentido da navegação: dias futuros entram pela direita, passados pela esquerda. */
const slide = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -24 }),
};

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function fullDateLabel(date: Date) {
  return capitalize(
    new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(date),
  );
}

/** Como o dia escolhido é chamado: "hoje", "amanhã", "ontem" ou o dia da semana ("segunda-feira"). */
function dayWord(selected: Date, today: Date): string {
  const diff = Math.round((startOfDay(selected).getTime() - startOfDay(today).getTime()) / 86_400_000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff === -1) return "ontem";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(selected);
}

export default function Today() {
  const today = startOfDay(new Date());
  const [selected, setSelected] = useState<Date>(today);
  const [direction, setDirection] = useState(1);
  const selectedIso = formatIsoDate(selected);
  const isToday = selectedIso === formatIsoDate(today);
  const word = dayWord(selected, today);

  function selectDay(date: Date) {
    if (formatIsoDate(date) === selectedIso) return;
    setDirection(date > selected ? 1 : -1);
    setSelected(date);
  }

  const tasksState = useRepoList(tasksRepo.list);
  const habitsState = useRepoList(habitsRepo.list);

  const allTasks = tasksState.state.status === "ready" ? tasksState.state.items : [];
  const tasksToday = allTasks.filter((t) => t.due_date === selectedIso);
  const doneCount = tasksToday.filter((t) => t.status === "done").length;
  const habitsToday = habitsState.state.status === "ready" ? habitsState.state.items : [];
  const datesWithTasks = useMemo(
    () => new Set(allTasks.map((t) => t.due_date).filter((d): d is string => d !== null)),
    [allTasks],
  );

  const hasError = tasksState.state.status === "error" || habitsState.state.status === "error";

  return (
    <div className="h-full overflow-x-hidden overflow-y-auto px-10 py-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="relative min-w-0 flex-1">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.div
                key={selectedIso}
                custom={direction}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={springs.standard}
              >
                <h1 className="text-[24px] font-bold tracking-[-0.5px] text-(--color-ink)">{capitalize(word)}</h1>
                <p className="text-[14px] text-(--color-ink-muted)">{fullDateLabel(selected)}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {!isToday && (
              <motion.button
                type="button"
                onClick={() => selectDay(today)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileTap={{ scale: 0.95 }}
                transition={springs.snappy}
                className="rounded-lg bg-(--color-fill) px-3 py-1.5 text-[12px] font-semibold text-(--color-ink) hover:bg-(--color-fill)/70"
              >
                Voltar para hoje
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <DayStrip today={today} selected={selected} markedDates={datesWithTasks} onSelect={selectDay} />

        {hasError ? (
          <ModuleErrorState />
        ) : (
          <div className="relative">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.div
                key={selectedIso}
                custom={direction}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={springs.standard}
                className="flex items-start gap-5"
              >
                <Panel title="Agenda" className="flex-1">
                  <MiniEmpty icon={LayoutGrid} label="Nada agendado — conecte seu calendário" />
                </Panel>

                <div className="flex flex-1 flex-col gap-4">
                  <Panel
                    title={`Tarefas de ${word}`}
                    trailing={tasksToday.length > 0 ? `${doneCount}/${tasksToday.length} concluídas` : undefined}
                  >
                    {tasksToday.length === 0 ? (
                      <MiniEmpty icon={CheckSquare} label={`Nenhuma tarefa para ${word}`} />
                    ) : (
                      <ListCard>
                        {tasksToday.map((task) => {
                          const isDone = task.status === "done";
                          return (
                            <ListRow
                              key={task.id}
                              leading={
                                <motion.button
                                  type="button"
                                  onClick={() => tasksRepo.toggleDone(task.id, !isDone).then(tasksState.reload)}
                                  whileHover={{ scale: 1.1, transition: springs.snappy }}
                                  whileTap={{ scale: 0.85, transition: springs.snappy }}
                                  className={cn(
                                    "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                                    isDone
                                      ? "border-(--color-accent) bg-(--color-accent) text-(--color-accent-ink)"
                                      : "border-(--color-ink-muted)/60 text-transparent hover:border-(--color-accent)",
                                  )}
                                  title={isDone ? "Marcar como a fazer" : "Marcar como concluída"}
                                >
                                  <Check className="size-2.5" strokeWidth={3} />
                                </motion.button>
                              }
                              title={
                                <span className={cn("transition-colors", isDone && "text-(--color-ink-muted) line-through")}>
                                  {task.title}
                                </span>
                              }
                            />
                          );
                        })}
                      </ListCard>
                    )}
                  </Panel>

                  <Panel title={`Hábitos de ${word}`}>
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
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
