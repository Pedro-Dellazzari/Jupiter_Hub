/**
 * Dados de exemplo para a Home — os módulos de Tarefas, Hábitos, Time Tracker,
 * Projetos, Espaços e Calendário ainda não têm repositórios implementados.
 * Substituir por leituras reais assim que cada módulo existir.
 */

export const tasksToday = {
  completed: 1,
  total: 4,
  overdue: 1,
};

export const habitStreak = {
  days: 12,
};

export const timeTracker = {
  elapsed: "01:42:07",
  projectName: "Projeto Hub",
  active: true,
};

export const nextEvent = {
  time: "09:00",
  title: "Daily standup — Compliance",
  source: "google" as const,
};

export type ProjectSummary = {
  id: string;
  name: string;
  color: string;
  spaceLabel: string;
  progress: number;
  tasksCount: number;
  overdueCount: number;
  nextTask: string;
};

export const projects: ProjectSummary[] = [
  {
    id: "compliance-pipelines",
    name: "Compliance Pipelines",
    color: "#007aff",
    spaceLabel: "Trabalho",
    progress: 58,
    tasksCount: 2,
    overdueCount: 1,
    nextTask: "Revisar pipeline LOTBA — validar DMS",
  },
  {
    id: "hub-onboarding",
    name: "Hub App — Onboarding",
    color: "#8c59f2",
    spaceLabel: "Projetos Pessoais",
    progress: 68,
    tasksCount: 2,
    overdueCount: 0,
    nextTask: "Finalizar mockup do módulo Cadernos",
  },
  {
    id: "linha-zero",
    name: "Linha Zero (jogo)",
    color: "#33a673",
    spaceLabel: "Projetos Pessoais",
    progress: 45,
    tasksCount: 1,
    overdueCount: 0,
    nextTask: "Gravar cena — jogo Linha Zero",
  },
  {
    id: "historias-tiradentes",
    name: "Histórias — Tiradentes",
    color: "#f28c26",
    spaceLabel: "Projetos Pessoais",
    progress: 20,
    tasksCount: 1,
    overdueCount: 0,
    nextTask: "Revisar roteiro — vídeo Tiradentes",
  },
];

export type SpaceSummary = {
  id: string;
  name: string;
  color: string;
  meta: string;
};

export const spaces: SpaceSummary[] = [
  { id: "trabalho", name: "Trabalho", color: "#007aff", meta: "2 tarefas · 1 projeto" },
  { id: "pessoal", name: "Projetos Pessoais", color: "#8c59f2", meta: "3 tarefas · 3 projetos" },
  { id: "estudos", name: "Estudos", color: "#33a673", meta: "2 tarefas · 2 notas" },
];

export const studyRoadmap = {
  nextStep: "Modelagem de dados com dbt",
  progress: 42,
};
