import { create } from "zustand";
import { timeEntriesRepo } from "../../db/repositories/timeEntriesRepo";

export type RunningTimer = {
  entryId: string;
  taskId: string;
  taskTitle: string;
  startedAt: string;
};

type TimerState = {
  /** Cronômetro em andamento. Só existe um por vez, sempre ligado a uma tarefa. */
  running: RunningTimer | null;
  /** Segundos já registrados por tarefa (sessões encerradas). */
  totals: Record<string, number>;
  /** Lê do banco o cronômetro em andamento e os totais por tarefa. */
  load: () => Promise<void>;
  /** Inicia o cronômetro na tarefa, encerrando antes o que estiver rodando. */
  start: (task: { id: string; title: string; project_id: string | null }) => Promise<void>;
  stop: () => Promise<void>;
};

export const useTimerStore = create<TimerState>((set, get) => ({
  running: null,
  totals: {},

  async load() {
    const [entry, totals] = await Promise.all([timeEntriesRepo.findRunning(), timeEntriesRepo.totalsByTask()]);
    set({
      running: entry && {
        entryId: entry.id,
        taskId: entry.task_id,
        taskTitle: entry.task_title,
        startedAt: entry.started_at,
      },
      totals,
    });
  },

  async start(task) {
    if (get().running?.taskId === task.id) return;
    await get().stop();
    const entry = await timeEntriesRepo.start({ task_id: task.id, project_id: task.project_id });
    set({ running: { entryId: entry.id, taskId: task.id, taskTitle: task.title, startedAt: entry.started_at } });
  },

  async stop() {
    const { running } = get();
    if (!running) return;
    const seconds = await timeEntriesRepo.stop(running.entryId, running.startedAt);
    set((state) => ({
      running: null,
      totals: { ...state.totals, [running.taskId]: (state.totals[running.taskId] ?? 0) + seconds },
    }));
  },
}));
