import { lazy, type LazyExoticComponent, type ComponentType } from "react";
import {
  Home,
  Sun,
  Sparkles,
  NotebookText,
  CheckSquare,
  FolderKanban,
  Hexagon,
  Repeat,
  Timer,
  Calendar,
  Compass,
  GanttChartSquare,
  type LucideIcon,
} from "lucide-react";

export type ModuleGroup = "general" | "module" | "view";

export type ModuleDefinition = {
  id: string;
  label: string;
  icon: LucideIcon;
  group: ModuleGroup;
  /** Componente de tela do módulo, carregado sob demanda. */
  Component: LazyExoticComponent<ComponentType>;
  /** Módulos podem ser desativados pelo usuário; visões (roadmap/gantt) não. */
  toggleable: boolean;
};

export const modules: ModuleDefinition[] = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    group: "general",
    Component: lazy(() => import("./home")),
    toggleable: false,
  },
  {
    id: "today",
    label: "Hoje",
    icon: Sun,
    group: "general",
    Component: lazy(() => import("./today")),
    toggleable: false,
  },
  {
    id: "chat",
    label: "Chat com IA",
    icon: Sparkles,
    group: "general",
    Component: lazy(() => import("./chat")),
    toggleable: true,
  },
  {
    id: "notebooks",
    label: "Cadernos",
    icon: NotebookText,
    group: "module",
    Component: lazy(() => import("./notebooks")),
    toggleable: true,
  },
  {
    id: "tasks",
    label: "Tarefas",
    icon: CheckSquare,
    group: "module",
    Component: lazy(() => import("./tasks")),
    toggleable: true,
  },
  {
    id: "projects",
    label: "Projetos",
    icon: FolderKanban,
    group: "module",
    Component: lazy(() => import("./projects")),
    toggleable: true,
  },
  {
    id: "spaces",
    label: "Espaços",
    icon: Hexagon,
    group: "module",
    Component: lazy(() => import("./spaces")),
    toggleable: true,
  },
  {
    id: "habits",
    label: "Hábitos",
    icon: Repeat,
    group: "module",
    Component: lazy(() => import("./habits")),
    toggleable: true,
  },
  {
    id: "time-tracker",
    label: "Time Tracker",
    icon: Timer,
    group: "module",
    Component: lazy(() => import("./time-tracker")),
    toggleable: true,
  },
  {
    id: "calendar",
    label: "Calendário",
    icon: Calendar,
    group: "module",
    Component: lazy(() => import("./calendar")),
    toggleable: true,
  },
  {
    id: "roadmap",
    label: "Roadmap",
    icon: Compass,
    group: "view",
    Component: lazy(() => import("./roadmap")),
    toggleable: true,
  },
  {
    id: "gantt",
    label: "Gantt",
    icon: GanttChartSquare,
    group: "view",
    Component: lazy(() => import("./gantt")),
    toggleable: true,
  },
];
