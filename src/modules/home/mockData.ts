/**
 * Dados de exemplo para a Home — Hábitos (sequência) e Calendário ainda não têm
 * repositório/integração implementados (falta o check-in de hábitos e a sincronização
 * de agenda). Tarefas de hoje, Time Tracker, Projetos e Espaços já usam dados reais.
 * Substituir o restante assim que cada peça existir.
 */

export const habitStreak = {
  days: 12,
};

export const nextEvent = {
  time: "09:00",
  title: "Daily standup — Compliance",
  source: "google" as const,
};

export const studyRoadmap = {
  nextStep: "Modelagem de dados com dbt",
  progress: 42,
};
