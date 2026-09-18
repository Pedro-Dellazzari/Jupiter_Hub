import { projectsRepo, type Project } from "../../db/repositories/projectsRepo";
import { spacesRepo } from "../../db/repositories/spacesRepo";
import { tasksRepo, type Task } from "../../db/repositories/tasksRepo";
import { parseIsoDate, startOfDay } from "../utils/date";

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

export type ProjectWithStats = Project & ProjectStats & { spaceName: string | null };

/** Carrega projetos + tarefas + espaços e junta cada projeto com suas estatísticas derivadas — usado pela tela de Projetos e pelos cards da Home. */
export async function loadProjectsWithStats(): Promise<ProjectWithStats[]> {
  const [projects, tasks, spaces] = await Promise.all([projectsRepo.list(), tasksRepo.list(), spacesRepo.list()]);
  const today = new Date();
  const spaceNameById = new Map(spaces.map((space) => [space.id, space.name]));
  return projects.map((project) => ({
    ...project,
    ...computeProjectStats(project.id, tasks, today),
    spaceName: project.space_id ? (spaceNameById.get(project.space_id) ?? null) : null,
  }));
}
