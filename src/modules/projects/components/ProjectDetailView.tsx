import { useCallback, useMemo, useState } from "react";
import { DropdownMenu } from "radix-ui";
import { ArrowLeft, Circle, MoreHorizontal, Plus } from "lucide-react";
import { motion } from "motion/react";
import { milestonesRepo, type Milestone } from "../../../db/repositories/milestonesRepo";
import { projectsRepo } from "../../../db/repositories/projectsRepo";
import { tasksRepo, type Task } from "../../../db/repositories/tasksRepo";
import { timeEntriesRepo } from "../../../db/repositories/timeEntriesRepo";
import type { Space } from "../../../db/repositories/spacesRepo";
import { useRepoList } from "../../../shared/hooks/useRepoList";
import { Badge } from "../../../shared/ui/Badge";
import { Card } from "../../../shared/ui/Card";
import { ConfirmDialog } from "../../../shared/ui/ConfirmDialog";
import { ProgressBar } from "../../../shared/ui/ProgressBar";
import { springs } from "../../../shared/motion/springs";
import { parseIsoDate, startOfDay } from "../../../shared/utils/date";
import { cn } from "../../../shared/utils/cn";
import type { ProjectWithStats } from "../../../shared/queries/projectStats";
import { CreateTaskDialog } from "../../tasks/components/CreateTaskDialog";
import { spacesRepo } from "../../../db/repositories/spacesRepo";
import { EditProjectDialog } from "./EditProjectDialog";
import { MilestonesCard } from "./MilestonesCard";
import { ProjectTaskRow } from "./ProjectTaskRow";
import { projectStatusInfo } from "../utils/projectStatus";

const TABS = [
  { value: "open", label: "Abertas" },
  { value: "done", label: "Concluídas" },
  { value: "all", label: "Todas" },
] as const;
type Tab = (typeof TABS)[number]["value"];

function formatDueWithCountdown(dueIso: string, today: Date): string {
  const due = parseIsoDate(dueIso);
  const diffDays = Math.round((due.getTime() - startOfDay(today).getTime()) / 86_400_000);
  const label = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(due);
  if (diffDays > 0) return `Prazo ${label} · faltam ${diffDays} dia${diffDays === 1 ? "" : "s"}`;
  if (diffDays === 0) return `Prazo ${label} · hoje`;
  return `Prazo ${label} · atrasado ${Math.abs(diffDays)}d`;
}

function formatCreatedChip(iso: string): string {
  return `Criado em ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(iso))}`;
}

function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function formatRelativeTime(iso: string, today: Date): string {
  const diffMin = Math.round((today.getTime() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 60) return diffMin <= 1 ? "agora" : `${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return diffD === 1 ? "ontem" : `${diffD} d`;
}

type ActivityItem = { id: string; text: string; at: string };

function buildActivity(tasks: Task[], milestones: Milestone[]): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const t of tasks) {
    if (t.completed_at) items.push({ id: `${t.id}-done`, text: `Você concluiu ${t.title}`, at: t.completed_at });
    items.push({ id: `${t.id}-created`, text: `Tarefa criada: ${t.title}`, at: t.created_at });
  }
  for (const m of milestones) {
    if (m.completed_at) items.push({ id: `${m.id}-milestone`, text: `Marco concluído: ${m.title}`, at: m.completed_at });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
}

export function ProjectDetailView({
  project,
  spaces,
  onBack,
  onChanged,
}: {
  project: ProjectWithStats;
  spaces: Space[];
  onBack: () => void;
  /** Avisa a tela de Projetos para recarregar a lista (edição, exclusão, progresso). */
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>("open");
  const [editOpen, setEditOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const tasksState = useRepoList(tasksRepo.list);
  const timeState = useRepoList(timeEntriesRepo.list);
  const milestonesState = useRepoList(useCallback(() => milestonesRepo.listByProject(project.id), [project.id]));
  const today = useMemo(() => new Date(), []);

  const milestones = milestonesState.state.status === "ready" ? milestonesState.state.items : [];

  const allTasks = useMemo(
    () => (tasksState.state.status === "ready" ? tasksState.state.items.filter((t) => t.project_id === project.id) : []),
    [tasksState.state, project.id],
  );
  const timeEntries = useMemo(
    () => (timeState.state.status === "ready" ? timeState.state.items.filter((e) => e.project_id === project.id) : []),
    [timeState.state, project.id],
  );

  const openTasks = allTasks.filter((t) => t.status !== "done");
  const doneTasks = allTasks
    .filter((t) => t.status === "done")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const overdueTasks = openTasks
    .filter((t) => t.due_date && parseIsoDate(t.due_date) < startOfDay(today))
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  const visibleTasks =
    tab === "open"
      ? [...openTasks].sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
      : tab === "done"
        ? doneTasks
        : allTasks;

  const totalSeconds = timeEntries.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);
  const weekStart = startOfDay(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekSeconds = timeEntries
    .filter((e) => new Date(e.started_at) >= weekStart)
    .reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

  const activity = useMemo(() => buildActivity(allTasks, milestones), [allTasks, milestones]);
  const statusInfo = projectStatusInfo(project.status);

  function toggleTaskDone(id: string, done: boolean) {
    tasksRepo.toggleDone(id, done).then(() => {
      tasksState.reload();
      onChanged();
    });
  }

  function addMilestone(input: { title: string; due_date: string | null }) {
    milestonesRepo.create({ project_id: project.id, ...input, sort_order: milestones.length }).then(milestonesState.reload);
  }
  function toggleMilestone(id: string, done: boolean) {
    milestonesRepo.toggleDone(id, done).then(milestonesState.reload);
  }
  function renameMilestone(id: string, title: string) {
    milestonesRepo.update(id, { title }).then(milestonesState.reload);
  }
  function changeMilestoneDate(id: string, dueDate: string | null) {
    milestonesRepo.update(id, { due_date: dueDate }).then(milestonesState.reload);
  }
  function removeMilestone(id: string) {
    milestonesRepo.remove(id).then(milestonesState.reload);
  }

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-1 text-[12px] font-medium text-(--color-ink-muted) hover:text-(--color-ink)"
      >
        <ArrowLeft className="size-3" strokeWidth={2} />
        Projetos
        <span className="text-(--color-ink-muted)/60">/</span>
        <span className="text-(--color-ink)">{project.name}</span>
      </button>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="size-3.5 shrink-0 rounded-[4px]" style={{ backgroundColor: project.color ?? "#007aff" }} />
            <h1 className="truncate text-[28px] leading-[1.1] font-bold tracking-[-0.5px] text-(--color-ink)">
              {project.name}
            </h1>
            <Badge
              className={statusInfo.tone === "active" ? "shrink-0 bg-(--color-accent)/12 text-(--color-accent-text)" : "shrink-0"}
            >
              {statusInfo.label}
            </Badge>
          </div>
          {project.description && <p className="mt-2 text-[14px] text-(--color-ink-muted)">{project.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {project.spaceName && (
              <span className="flex items-center gap-1 rounded-md bg-(--color-fill) px-2.5 py-1.5 text-[12px] text-(--color-ink-muted)">
                <Circle className="size-2.5" strokeWidth={2.5} />
                {project.spaceName}
              </span>
            )}
            {project.due_date && (
              <span className="rounded-md bg-(--color-fill) px-2.5 py-1.5 text-[12px] text-(--color-ink-muted)">
                {formatDueWithCountdown(project.due_date, today)}
              </span>
            )}
            <span className="rounded-md bg-(--color-fill) px-2.5 py-1.5 text-[12px] text-(--color-ink-muted)">
              {formatCreatedChip(project.created_at)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex size-9 items-center justify-center rounded-lg bg-(--color-fill) text-(--color-ink-muted) hover:text-(--color-ink)">
                <MoreHorizontal className="size-4" strokeWidth={2} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 w-[180px] rounded-xl bg-(--color-surface-elevated) p-1.5 shadow-[0px_8px_24px_-2px_rgba(0,0,0,0.16)]"
              >
                <DropdownMenu.Item
                  onSelect={() => setConfirmingDelete(true)}
                  className="cursor-pointer truncate rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-danger) outline-none data-[highlighted]:bg-(--color-danger)/10"
                >
                  Excluir projeto
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          <button
            onClick={() => setEditOpen(true)}
            className="rounded-lg bg-(--color-fill) px-3.5 py-2 text-[12px] font-semibold text-(--color-ink) hover:bg-(--color-divider)"
          >
            Editar
          </button>
          <motion.button
            onClick={() => setTaskDialogOpen(true)}
            whileHover={{ scale: 1.03, transition: springs.snappy }}
            whileTap={{ scale: 0.97, transition: springs.snappy }}
            className="flex items-center gap-1.5 rounded-lg bg-(--color-accent) py-2 pr-3.5 pl-3 text-[12px] font-semibold text-(--color-accent-ink) hover:brightness-110"
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            Nova tarefa
          </motion.button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="flex flex-col gap-2 border border-(--color-divider) p-5">
          <span className="text-[12px] text-(--color-ink-muted)">Progresso</span>
          <span className="text-[28px] leading-none font-bold text-(--color-ink)">{project.progress}%</span>
          <ProgressBar value={project.progress} color={project.color ?? undefined} className="mt-2" />
        </Card>
        <Card className="flex flex-col gap-2 border border-(--color-divider) p-5">
          <span className="text-[12px] text-(--color-ink-muted)">Tarefas</span>
          <span className="text-[28px] leading-none font-bold text-(--color-ink)">
            {allTasks.length} <span className="text-[12px] font-normal text-(--color-ink-muted)">no total</span>
          </span>
          <span className="text-[12px] text-(--color-ink-muted)">
            {openTasks.length} abertas · {doneTasks.length} concluídas
          </span>
        </Card>
        <Card className="flex flex-col gap-2 border border-(--color-divider) p-5">
          <span className="text-[12px] text-(--color-ink-muted)">Atrasadas</span>
          <span className={cn("text-[28px] leading-none font-bold", overdueTasks.length > 0 ? "text-(--color-danger)" : "text-(--color-ink)")}>
            {overdueTasks.length}
          </span>
          <span className="truncate text-[12px] text-(--color-ink-muted)">{overdueTasks[0]?.title ?? "Nenhuma"}</span>
        </Card>
        <Card className="flex flex-col gap-2 border border-(--color-divider) p-5">
          <span className="text-[12px] text-(--color-ink-muted)">Tempo registrado</span>
          <span className="text-[28px] leading-none font-bold text-(--color-ink)">{formatDuration(totalSeconds)}</span>
          <span className="text-[12px] text-(--color-ink-muted)">Esta semana: {formatDuration(weekSeconds)}</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="flex flex-col gap-1 border border-(--color-divider) p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-(--color-ink)">Tarefas</h2>
            <div className="flex items-center gap-1.5">
              {TABS.map((t) => {
                const count = t.value === "open" ? openTasks.length : t.value === "done" ? doneTasks.length : allTasks.length;
                const active = tab === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setTab(t.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[12px] font-semibold",
                      active ? "bg-(--color-accent)/12 text-(--color-accent-text)" : "text-(--color-ink-muted) hover:bg-(--color-fill)",
                    )}
                  >
                    {t.label} · {count}
                  </button>
                );
              })}
            </div>
          </div>

          {visibleTasks.length === 0 ? (
            <p className="py-4 text-[13px] text-(--color-ink-muted)">Nenhuma tarefa aqui ainda.</p>
          ) : (
            <div className="flex flex-col divide-y divide-(--color-track)">
              {visibleTasks.map((task) => (
                <ProjectTaskRow key={task.id} task={task} today={today} onToggleDone={toggleTaskDone} />
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <MilestonesCard
            milestones={milestones}
            onToggle={toggleMilestone}
            onRename={renameMilestone}
            onDateChange={changeMilestoneDate}
            onRemove={removeMilestone}
            onAdd={addMilestone}
          />

          <Card className="flex flex-col gap-3 border border-(--color-divider) p-5">
            <h2 className="text-[16px] font-bold text-(--color-ink)">Atividade recente</h2>
            {activity.length === 0 ? (
              <p className="text-[13px] text-(--color-ink-muted)">Sem atividade ainda.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-(--color-accent)" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-(--color-ink)">{item.text}</span>
                    <span className="shrink-0 text-[12px] text-(--color-ink-muted)">{formatRelativeTime(item.at, today)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <EditProjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        spaces={spaces}
        onSave={async ({ name, spaceId, status, color, description, dueDate }) => {
          await projectsRepo.update(project.id, {
            name,
            space_id: spaceId,
            status,
            color,
            description,
            due_date: dueDate,
          });
          onChanged();
        }}
      />

      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        projects={[project]}
        spaces={spaces}
        defaultSpaceId={project.space_id}
        defaultProjectId={project.id}
        onCreateSpace={async (name) => spacesRepo.create({ name })}
        onCreate={async ({ title, projectId, spaceId, priority, dueDate }) => {
          await tasksRepo.create({ title, project_id: projectId, space_id: spaceId, priority, due_date: dueDate });
          tasksState.reload();
          onChanged();
        }}
      />

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Excluir "${project.name}"?`}
        description={allTasks.length > 0 ? `As ${allTasks.length} tarefas ligadas a ele continuam existindo, sem projeto.` : undefined}
        confirmLabel="Excluir"
        onConfirm={() => {
          projectsRepo.remove(project.id).then(() => {
            onChanged();
            onBack();
          });
        }}
      />
    </div>
  );
}
