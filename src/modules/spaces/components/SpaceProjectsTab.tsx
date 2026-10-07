import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import { ChevronDown, CircleDot, Plus } from "lucide-react";
import { motion } from "motion/react";
import { projectsRepo } from "../../../db/repositories/projectsRepo";
import type { Space } from "../../../db/repositories/spacesRepo";
import type { ProjectWithStats } from "../../../shared/queries/projectStats";
import { ListCard } from "../../../shared/ui/ListCard";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";
import { CreateProjectDialog } from "../../projects/components/CreateProjectDialog";
import { ProjectCard } from "../../projects/components/ProjectCard";
import { ProjectListRow } from "../../projects/components/ProjectListRow";
import { projectStatusBucket, type ProjectStatusBucket } from "../../projects/utils/projectStatus";

const STATUS_OPTIONS: { value: ProjectStatusBucket; label: string }[] = [
  { value: "active", label: "Em andamento" },
  { value: "planning", label: "Planejado" },
  { value: "paused", label: "Pausado" },
];

const FILTER_TRIGGER_CLASS =
  "flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)";
const MENU_CONTENT_CLASS =
  "z-50 w-[190px] rounded-xl bg-(--color-surface-elevated) p-1.5 shadow-[0px_8px_24px_-2px_rgba(0,0,0,0.16)]";
const MENU_ITEM_CLASS =
  "flex cursor-pointer items-center justify-between truncate rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-ink) outline-none data-[highlighted]:bg-(--color-fill)";

/** Aba Projetos do Espaço: a grade/lista da tela de Projetos, só com os projetos deste Espaço. */
export function SpaceProjectsTab({
  space,
  projects,
  spaces,
  onOpenProject,
  onChanged,
}: {
  space: Space;
  projects: ProjectWithStats[];
  spaces: Space[];
  onOpenProject: (id: string) => void;
  onChanged: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<ProjectStatusBucket | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = statusFilter ? projects.filter((p) => projectStatusBucket(p.status) === statusFilter) : projects;
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? "Status";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter(null)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[12px]",
              statusFilter
                ? "font-medium text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)"
                : "bg-(--color-accent)/12 font-semibold text-(--color-accent-text)",
            )}
          >
            Todos · {projects.length}
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={cn(FILTER_TRIGGER_CLASS, statusFilter && "text-(--color-ink)")}>
                <CircleDot className="size-3" strokeWidth={2} />
                {statusLabel}
                <ChevronDown className="size-3" strokeWidth={2} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="start" sideOffset={6} className={MENU_CONTENT_CLASS}>
                <DropdownMenu.Item onSelect={() => setStatusFilter(null)} className={MENU_ITEM_CLASS}>
                  Todos os status
                </DropdownMenu.Item>
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenu.Item
                    key={option.value}
                    onSelect={() => setStatusFilter(option.value)}
                    className={MENU_ITEM_CLASS}
                  >
                    {option.label}
                    <span className="text-[12px] font-normal text-(--color-ink-muted)">
                      {projects.filter((p) => projectStatusBucket(p.status) === option.value).length}
                    </span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-(--color-fill) p-0.5">
            {(["grid", "list"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-semibold",
                  view === mode
                    ? "bg-(--color-surface-elevated) text-(--color-ink) shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]"
                    : "text-(--color-ink-muted) hover:text-(--color-ink)",
                )}
              >
                {mode === "grid" ? "Grade" : "Lista"}
              </button>
            ))}
          </div>
          <motion.button
            onClick={() => setDialogOpen(true)}
            whileHover={{ scale: 1.03, transition: springs.snappy }}
            whileTap={{ scale: 0.97, transition: springs.snappy }}
            className="flex items-center gap-1.5 rounded-lg bg-(--color-accent) py-2 pr-3.5 pl-3 text-[12px] font-semibold text-(--color-accent-ink) hover:brightness-110"
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            Novo projeto
          </motion.button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} onClick={() => onOpenProject(project.id)} hideSpace />
          ))}
          <button
            onClick={() => setDialogOpen(true)}
            className="flex min-h-[180px] flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-(--color-divider) text-center transition-colors hover:border-(--color-accent)/60 hover:bg-(--color-accent)/4"
          >
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-(--color-accent-text)">
              <Plus className="size-4" strokeWidth={2.5} />
              Novo projeto
            </span>
            <span className="text-[12px] text-(--color-ink-muted)/80">Já nasce dentro de {space.name}</span>
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-(--color-ink-muted)">
          {projects.length === 0 ? "Nenhum projeto neste Espaço ainda." : "Nenhum projeto com esse status."}
        </p>
      ) : (
        <ListCard>
          {filtered.map((project) => (
            <ProjectListRow key={project.id} project={project} onClick={() => onOpenProject(project.id)} />
          ))}
        </ListCard>
      )}

      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        spaces={spaces}
        defaultSpaceId={space.id}
        onCreate={async ({ name, spaceId, status, color, description, dueDate }) => {
          await projectsRepo.create({ name, space_id: spaceId, status, color, description, due_date: dueDate });
          onChanged();
        }}
      />
    </>
  );
}
