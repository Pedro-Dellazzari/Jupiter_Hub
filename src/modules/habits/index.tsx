import { useMemo, useState } from "react";
import { Plus, Repeat } from "lucide-react";
import { motion } from "motion/react";
import { habitLogsRepo } from "../../db/repositories/habitLogsRepo";
import { habitsRepo } from "../../db/repositories/habitsRepo";
import { spacesRepo } from "../../db/repositories/spacesRepo";
import { useRepoList } from "../../shared/hooks/useRepoList";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ModuleErrorState } from "../../shared/ui/ModuleErrorState";
import { ModuleHeader } from "../../shared/ui/ModuleHeader";
import { springs } from "../../shared/motion/springs";
import { cn } from "../../shared/utils/cn";
import { CreateHabitDialog } from "./components/CreateHabitDialog";
import { HabitCard } from "./components/HabitCard";
import { computeCurrentStreak, computeWeekDots } from "./utils/habitStats";

const WEEKDAY_LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"];

const FREQUENCY_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "daily", label: "Diários" },
  { value: "weekly", label: "Semanais" },
] as const;

type FrequencyFilter = (typeof FREQUENCY_FILTERS)[number]["value"];

export default function Habits() {
  const habitsState = useRepoList(habitsRepo.list);
  const logsState = useRepoList(habitLogsRepo.list);
  const spacesState = useRepoList(spacesRepo.list);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>("all");

  const today = useMemo(() => new Date(), []);
  const spaces = spacesState.state.status === "ready" ? spacesState.state.items : [];
  const logs = logsState.state.status === "ready" ? logsState.state.items : [];
  const habits = habitsState.state.status === "ready" ? habitsState.state.items : [];
  const filteredHabits =
    frequencyFilter === "all" ? habits : habits.filter((h) => h.frequency_type === frequencyFilter);

  const hasError = habitsState.state.status === "error" || logsState.state.status === "error";

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <ModuleHeader
        title="Hábitos"
        action={
          <motion.button
            onClick={() => setDialogOpen(true)}
            whileHover={{ scale: 1.03, transition: springs.snappy }}
            whileTap={{ scale: 0.97, transition: springs.snappy }}
            className="flex items-center gap-1.5 rounded-lg bg-(--color-accent) py-2 pr-3.5 pl-3 text-[12px] font-semibold text-(--color-accent-ink) hover:brightness-110"
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            Novo hábito
          </motion.button>
        }
      />

      {habitsState.state.status === "ready" && habits.length > 0 && (
        <div className="mb-4 flex items-center gap-1.5">
          {FREQUENCY_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFrequencyFilter(filter.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px]",
                frequencyFilter === filter.value
                  ? "bg-(--color-accent)/12 font-semibold text-(--color-accent-text)"
                  : "font-medium text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {habitsState.state.status === "loading" && null}
      {hasError && <ModuleErrorState />}
      {habitsState.state.status === "ready" && habits.length === 0 && (
        <EmptyState
          icon={Repeat}
          title="Nenhum hábito ainda"
          description="Comece a acompanhar algo que você quer manter todo dia ou toda semana."
          ctaLabel="+ Novo hábito"
          onAction={() => setDialogOpen(true)}
        />
      )}
      {habitsState.state.status === "ready" && habits.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3.5 px-[18px]">
            <div className="flex-1" />
            <div className="flex shrink-0 items-center gap-2.5">
              {WEEKDAY_LETTERS.map((letter, i) => (
                <span
                  key={i}
                  className="flex w-[22px] justify-center text-[11px] font-medium text-[#aeaeb2]"
                >
                  {letter}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {filteredHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                streak={computeCurrentStreak(habit.id, logs, today)}
                week={computeWeekDots(habit.id, logs, today)}
                onToggleDay={(date) => habitLogsRepo.toggle(habit.id, date).then(logsState.reload)}
              />
            ))}
          </div>
        </div>
      )}

      <CreateHabitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        spaces={spaces}
        onCreate={async ({ name, spaceId, frequencyType, color, targetCount }) => {
          await habitsRepo.create({
            name,
            space_id: spaceId,
            frequency_type: frequencyType,
            color,
            target_count: targetCount,
          });
          habitsState.reload();
        }}
      />
    </div>
  );
}
