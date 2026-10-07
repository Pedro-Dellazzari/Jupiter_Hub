import { habitLogsRepo } from "../../../db/repositories/habitLogsRepo";
import { habitsRepo } from "../../../db/repositories/habitsRepo";
import { notebooksRepo } from "../../../db/repositories/notebooksRepo";
import { notesRepo } from "../../../db/repositories/notesRepo";
import { projectsRepo } from "../../../db/repositories/projectsRepo";
import { spacesRepo } from "../../../db/repositories/spacesRepo";
import { tasksRepo, type TaskWithRelations } from "../../../db/repositories/tasksRepo";
import { timeEntriesRepo } from "../../../db/repositories/timeEntriesRepo";
import { formatIsoDate, startOfDay } from "../../../shared/utils/date";
import { computeCurrentStreak, computeWeekDots } from "../../habits/utils/habitStats";
import { folderPath } from "../../notebooks/utils/folders";

/**
 * Ferramentas que o modelo pode chamar para consultar os dados locais do Hub.
 * São só de leitura: o chat enxerga tarefas, projetos, cadernos e hábitos, mas não altera nada.
 * O formato (name / description / JSON Schema) é neutro; cada provedor adapta para a sua API.
 */
export type AiTool = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: false;
  };
};

export const AI_TOOLS: AiTool[] = [
  {
    name: "list_tasks",
    description:
      "Lista as tarefas do usuário com projeto, Espaço, prioridade, prazo, subtarefas e tempo cronometrado. " +
      "Use sempre que a pergunta envolver tarefas, pendências, prazos ou o que fazer. Todos os filtros são opcionais e combináveis.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["open", "todo", "in_progress", "done", "all"],
          description: "open = a fazer + em andamento (padrão). done = concluídas.",
        },
        due: {
          type: "string",
          enum: ["overdue", "today", "next_7_days", "no_date"],
          description: "Filtra pelo prazo. overdue = atrasadas e ainda não concluídas.",
        },
        project: { type: "string", description: "Trecho do nome do projeto." },
        space: { type: "string", description: "Trecho do nome do Espaço." },
        search: { type: "string", description: "Trecho do título da tarefa." },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "list_projects",
    description:
      "Lista os projetos do usuário com status, prazo, Espaço, progresso (tarefas concluídas/total), tarefas atrasadas e tempo cronometrado. " +
      "Use para visão geral dos projetos ou para descobrir o nome exato de um projeto.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "get_project",
    description:
      "Detalhes de um projeto: descrição, status, prazo, progresso e todas as suas tarefas (abertas e concluídas).",
    parameters: {
      type: "object",
      properties: {
        project: { type: "string", description: "Nome (ou trecho do nome) do projeto, ou o id." },
      },
      required: ["project"],
      additionalProperties: false,
    },
  },
  {
    name: "list_notes",
    description:
      "Lista as notas dos Cadernos do usuário: id, título, pasta (caminho), data da última edição e um trecho inicial. " +
      "Use para descobrir o que existe ou procurar por assunto; `search` procura no título e no conteúdo. Para ler uma nota inteira, use read_note.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Texto a procurar no título ou no conteúdo das notas." },
        notebook: { type: "string", description: "Trecho do nome da pasta (caderno); inclui as subpastas." },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "read_note",
    description:
      "Devolve o conteúdo completo (Markdown) de uma nota dos Cadernos. Use depois de list_notes, quando precisar do texto para responder, resumir ou citar.",
    parameters: {
      type: "object",
      properties: {
        note: { type: "string", description: "O id da nota (preferível, vem de list_notes) ou o título." },
      },
      required: ["note"],
      additionalProperties: false,
    },
  },
  {
    name: "list_habits",
    description:
      "Lista os hábitos do usuário com frequência (diário/semanal), meta, se já foi feito hoje, sequência atual de dias, " +
      "check-ins desta semana (segunda a domingo) e dos últimos 30 dias. Use para perguntas sobre hábitos, rotina e consistência.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
];

const MAX_TASKS = 80;
const MAX_NOTES = 60;
const EXCERPT_CHARS = 240;
/** Teto do texto de uma nota devolvido ao modelo; acima disso o resultado avisa que foi cortado. */
const MAX_NOTE_CHARS = 30_000;
const DAY_MS = 24 * 60 * 60 * 1000;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;
}

function minutes(seconds: number | undefined): number {
  return Math.round((seconds ?? 0) / 60);
}

function taskView(task: TaskWithRelations, totals: Record<string, number>, today: string) {
  return {
    title: task.title,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
    overdue: task.status !== "done" && task.due_date !== null && task.due_date.slice(0, 10) < today,
    project: task.project_name,
    space: task.space_name,
    subtasks: task.subtask_total > 0 ? `${task.subtask_done}/${task.subtask_total}` : null,
    tracked_minutes: minutes(totals[task.id]),
    notes: task.notes ? task.notes.slice(0, 300) : null,
  };
}

async function listTasks(input: Record<string, unknown>) {
  const [tasks, totals] = await Promise.all([tasksRepo.listWithRelations(), timeEntriesRepo.totalsByTask()]);
  const now = new Date();
  const today = formatIsoDate(now);
  const weekEnd = formatIsoDate(new Date(startOfDay(now).getTime() + 7 * DAY_MS));
  const status = text(input.status) ?? "open";
  const due = text(input.due);
  const project = text(input.project);
  const space = text(input.space);
  const search = text(input.search);

  const matches = tasks.filter((task) => {
    const day = task.due_date?.slice(0, 10) ?? null;
    if (status === "open" && task.status === "done") return false;
    if (status !== "open" && status !== "all" && task.status !== status) return false;
    if (due === "overdue" && !(task.status !== "done" && day !== null && day < today)) return false;
    if (due === "today" && day !== today) return false;
    if (due === "next_7_days" && !(day !== null && day >= today && day <= weekEnd)) return false;
    if (due === "no_date" && day !== null) return false;
    if (project && !task.project_name?.toLowerCase().includes(project)) return false;
    if (space && !task.space_name?.toLowerCase().includes(space)) return false;
    if (search && !task.title.toLowerCase().includes(search)) return false;
    return true;
  });

  return {
    today,
    total: matches.length,
    returned: Math.min(matches.length, MAX_TASKS),
    // Quando `returned` < `total`, o modelo deve avisar que a lista está parcial e sugerir um filtro.
    tasks: matches.slice(0, MAX_TASKS).map((task) => taskView(task, totals, today)),
  };
}

async function loadProjects() {
  const [projects, spaces, tasks, totals] = await Promise.all([
    projectsRepo.list(),
    spacesRepo.list(),
    tasksRepo.listWithRelations(),
    timeEntriesRepo.totalsByTask(),
  ]);
  const today = formatIsoDate(new Date());
  const views = projects.map((project) => {
    const own = tasks.filter((task) => task.project_id === project.id);
    const done = own.filter((task) => task.status === "done").length;
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      due_date: project.due_date,
      space: spaces.find((space) => space.id === project.space_id)?.name ?? null,
      tasks_total: own.length,
      tasks_done: done,
      tasks_overdue: own.filter(
        (task) => task.status !== "done" && task.due_date !== null && task.due_date.slice(0, 10) < today,
      ).length,
      progress_percent: own.length > 0 ? Math.round((done / own.length) * 100) : 0,
      tracked_minutes: minutes(own.reduce((sum, task) => sum + (totals[task.id] ?? 0), 0)),
    };
  });
  return { today, tasks, totals, views };
}

async function listProjects() {
  const { today, views } = await loadProjects();
  return { today, total: views.length, projects: views.map(({ id: _id, ...view }) => view) };
}

async function getProject(input: Record<string, unknown>) {
  const query = text(input.project);
  if (!query) return { error: "Informe o nome do projeto no parâmetro `project`." };
  const { today, tasks, totals, views } = await loadProjects();
  const found =
    views.find((view) => view.id === query || view.name.toLowerCase() === query) ??
    views.find((view) => view.name.toLowerCase().includes(query));
  if (!found) {
    return { error: `Nenhum projeto encontrado para "${query}".`, available_projects: views.map((view) => view.name) };
  }
  const { id, ...project } = found;
  return {
    today,
    project,
    tasks: tasks.filter((task) => task.project_id === id).map((task) => taskView(task, totals, today)),
  };
}

async function listNotes(input: Record<string, unknown>) {
  const [notes, notebooks] = await Promise.all([notesRepo.list(), notebooksRepo.list()]);
  const search = text(input.search);
  const notebook = text(input.notebook);
  const paths = new Map(notebooks.map((n) => [n.id, folderPath(notebooks, n.id)]));

  const matches = notes
    .filter((note) => {
      const path = paths.get(note.notebook_id)?.toLowerCase() ?? "";
      if (notebook && !path.includes(notebook)) return false;
      if (search && !note.title.toLowerCase().includes(search) && !note.content.toLowerCase().includes(search)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));

  return {
    total: matches.length,
    returned: Math.min(matches.length, MAX_NOTES),
    notebooks: [...new Set(paths.values())].sort(),
    notes: matches.slice(0, MAX_NOTES).map((note) => ({
      id: note.id,
      title: note.title || "Sem título",
      notebook: paths.get(note.notebook_id) ?? null,
      updated_at: note.updated_at.slice(0, 10),
      characters: note.content.length,
      excerpt: note.content.slice(0, EXCERPT_CHARS),
    })),
  };
}

async function readNote(input: Record<string, unknown>) {
  const query = text(input.note);
  if (!query) return { error: "Informe o id ou o título da nota no parâmetro `note`." };
  const [notes, notebooks] = await Promise.all([notesRepo.list(), notebooksRepo.list()]);
  const byId = notes.filter((note) => note.id.toLowerCase() === query);
  const byTitle = notes.filter((note) => note.title.toLowerCase() === query);
  const candidates =
    byId.length > 0
      ? byId
      : byTitle.length > 0
        ? byTitle
        : notes.filter((note) => note.title.toLowerCase().includes(query));
  if (candidates.length === 0) {
    return { error: `Nenhuma nota encontrada para "${query}". Use list_notes para procurar.` };
  }
  if (candidates.length > 1) {
    return {
      error: "Mais de uma nota corresponde. Chame read_note de novo com o id.",
      matches: candidates.slice(0, 10).map((note) => ({
        id: note.id,
        title: note.title,
        notebook: folderPath(notebooks, note.notebook_id),
      })),
    };
  }
  const note = candidates[0];
  return {
    title: note.title || "Sem título",
    notebook: folderPath(notebooks, note.notebook_id),
    updated_at: note.updated_at.slice(0, 10),
    truncated: note.content.length > MAX_NOTE_CHARS,
    total_characters: note.content.length,
    content: note.content.slice(0, MAX_NOTE_CHARS),
  };
}

async function listHabits() {
  const [habits, logs, spaces] = await Promise.all([habitsRepo.list(), habitLogsRepo.list(), spacesRepo.list()]);
  const now = new Date();
  const today = formatIsoDate(now);
  const monthAgo = formatIsoDate(new Date(startOfDay(now).getTime() - 29 * DAY_MS));
  return {
    today,
    total: habits.length,
    habits: habits.map((habit) => {
      const own = logs.filter((log) => log.habit_id === habit.id);
      const week = computeWeekDots(habit.id, logs, now);
      return {
        name: habit.name,
        frequency: habit.frequency_type === "weekly" ? "semanal" : "diário",
        // Meta de check-ins por dia (hábito diário) ou por semana (semanal).
        target_count: habit.target_count,
        space: spaces.find((space) => space.id === habit.space_id)?.name ?? null,
        started_on: habit.start_date,
        done_today: own.some((log) => log.date === today),
        current_streak_days: computeCurrentStreak(habit.id, logs, now),
        this_week: {
          done_days: week.filter((day) => day.done).map((day) => day.date),
          done_count: week.filter((day) => day.done).length,
        },
        check_ins_last_30_days: own.filter((log) => log.date >= monthAgo && log.date <= today).length,
        last_check_in: own.length > 0 ? own[own.length - 1].date : null,
      };
    }),
  };
}

/** Executa a ferramenta e devolve o resultado em JSON (texto), que é o que os provedores esperam. */
export async function executeAiTool(name: string, input: unknown): Promise<string> {
  // A entrada vem do modelo: tratada como não confiável, só campos de texto conhecidos são lidos.
  const args = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  try {
    switch (name) {
      case "list_tasks":
        return JSON.stringify(await listTasks(args));
      case "list_projects":
        return JSON.stringify(await listProjects());
      case "get_project":
        return JSON.stringify(await getProject(args));
      case "list_notes":
        return JSON.stringify(await listNotes(args));
      case "read_note":
        return JSON.stringify(await readNote(args));
      case "list_habits":
        return JSON.stringify(await listHabits());
      default:
        return JSON.stringify({ error: `Ferramenta desconhecida: ${name}` });
    }
  } catch (err) {
    console.error(`Falha ao executar a ferramenta ${name}:`, err);
    return JSON.stringify({ error: "Não foi possível ler os dados locais." });
  }
}

/** Rótulo curto mostrado no chat enquanto a ferramenta roda. */
export const AI_TOOL_LABELS: Record<string, string> = {
  list_tasks: "Consultando suas tarefas…",
  list_projects: "Consultando seus projetos…",
  get_project: "Abrindo o projeto…",
  list_notes: "Procurando nos seus cadernos…",
  read_note: "Lendo a nota…",
  list_habits: "Consultando seus hábitos…",
};
