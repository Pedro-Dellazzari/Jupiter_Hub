import { Check } from "lucide-react";
import { motion } from "motion/react";
import { tasksRepo, type TaskWithRelations } from "../../../db/repositories/tasksRepo";
import { useNavigationStore } from "../../../app/store/useNavigationStore";
import { useRepoList } from "../../../shared/hooks/useRepoList";
import { springs } from "../../../shared/motion/springs";
import { Card } from "../../../shared/ui/Card";
import { cn } from "../../../shared/utils/cn";
import { formatIsoDate } from "../../../shared/utils/date";

/** Tarefas que pedem atenção hoje: vencendo hoje, atrasadas e as concluídas hoje. */
function pickToday(tasks: TaskWithRelations[], todayIso: string) {
  return tasks
    .filter((t) =>
      t.status === "done"
        ? t.due_date === todayIso || t.completed_at?.slice(0, 10) === todayIso
        : t.due_date !== null && t.due_date <= todayIso,
    )
    .sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || (a.due_date ?? "").localeCompare(b.due_date ?? ""));
}

/** Lista "Hoje" da Home no celular (no desktop a Home mostra Projetos e Espaços nesse espaço). */
export function TodayTasksSection() {
  const { state, reload } = useRepoList(tasksRepo.listWithRelations);
  const setActiveModule = useNavigationStore((s) => s.setActiveModule);
  const todayIso = formatIsoDate(new Date());
  const tasks = state.status === "ready" ? pickToday(state.items, todayIso) : [];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-(--color-ink)">Hoje</h2>
        <button
          type="button"
          onClick={() => setActiveModule("today")}
          className="text-[14px] font-medium text-(--color-accent-text)"
        >
          Ver tudo
        </button>
      </div>
      {state.status === "ready" && tasks.length === 0 && (
        <Card className="px-4 py-5 text-center text-[14px] text-(--color-ink-muted)">Nada pendente para hoje.</Card>
      )}
      {tasks.length > 0 && (
        <Card className="flex flex-col divide-y divide-(--color-divider)">
          {tasks.map((task) => {
            const done = task.status === "done";
            const overdue = !done && task.due_date !== null && task.due_date < todayIso;
            const context = task.project_name ?? task.space_name;
            return (
              <div key={task.id} className="flex items-center gap-3.5 px-4 py-3">
                <motion.button
                  type="button"
                  onClick={() => tasksRepo.toggleDone(task.id, !done).then(reload)}
                  whileTap={{ scale: 0.85, transition: springs.snappy }}
                  className={cn(
                    "flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    done
                      ? "border-(--color-accent) bg-(--color-accent) text-(--color-accent-ink)"
                      : "border-(--color-ink-muted)/50 text-transparent",
                  )}
                  aria-label={done ? "Marcar como a fazer" : "Marcar como concluída"}
                >
                  <Check className="size-3" strokeWidth={3} />
                </motion.button>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-[15px] text-(--color-ink)", done && "text-(--color-ink-muted) line-through")}>
                    {task.title}
                  </p>
                  {(context || overdue) && (
                    <p className="flex items-center gap-1.5 truncate text-[12px] text-(--color-ink-muted)">
                      {context && (
                        <>
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: task.project_color ?? "var(--color-accent)" }}
                          />
                          <span className="truncate">{context}</span>
                        </>
                      )}
                      {overdue && <span className="shrink-0 text-(--color-danger)">· Atrasada</span>}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </section>
  );
}
