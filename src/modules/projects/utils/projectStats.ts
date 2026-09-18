import { projectsRepo, type Project } from "../../../db/repositories/projectsRepo";
import { tasksRepo, type Task } from "../../../db/repositories/tasksRepo";

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export type ProjectStats = {
  /** % de tarefas concluídas em relação ao total (0 quando o projeto não tem tarefas). */
  progress: number;
  /** Tarefas em aberto (status != "done"). */
  tasksCount: number;
  overdueCount: number;
  nextTask: string | null;
};

/** Deriva progresso/contagens/próxima tarefa de um projeto a partir da lista completa de tarefas já carregada. */
export function computeProjectStats(projectId: string, tasks: Task[], today: Date): ProjectStats {
  const todayStart = startOfDay(today);
  const projectTasks = tasks.filter((t) => t.project_id === projectId);
  const openTasks = projectTasks.filter((t) => t.status !== "done");
  const doneCount = projectTasks.length - openTasks.length;
  const overdueCount = openTasks.filter((t) => t.due_date && parseIsoDate(t.due_date) < todayStart).length;

  const nextTask = [...openTasks].sort((a, b) => {
    if (!a.due_date && !b.due_date) return a.sort_order - b.sort_order;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  })[0];

  return {
    progress: projectTasks.length === 0 ? 0 : Math.round((doneCount / projectTasks.length) * 100),
    tasksCount: openTasks.length,
    overdueCount,
    nextTask: nextTask?.title ?? null,
  };
}

/** Carrega projetos + tarefas e junta cada projeto com suas estatísticas derivadas. */
export async function loadProjectsWithStats(): Promise<(Project & ProjectStats)[]> {
  const [projects, tasks] = await Promise.all([projectsRepo.list(), tasksRepo.list()]);
  const today = new Date();
  return projects.map((project) => ({ ...project, ...computeProjectStats(project.id, tasks, today) }));
}
