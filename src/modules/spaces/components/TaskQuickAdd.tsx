import { useRef, useState } from "react";
import { DropdownMenu } from "radix-ui";
import { CalendarDays, CornerDownLeft, Flag, Plus, Square, X } from "lucide-react";
import type { Project } from "../../../db/repositories/projectsRepo";
import { formatDueLabel } from "../../tasks/utils/dateGroups";
import { PRIORITY_OPTIONS, priorityStyle } from "../../tasks/utils/priority";
import { cn } from "../../../shared/utils/cn";

export type QuickAddInput = {
  title: string;
  projectId: string | null;
  priority: string;
  dueDate: string | null;
};

const CHIP_CLASS =
  "flex items-center gap-1 rounded-md bg-(--color-fill) px-1.5 py-0.5 text-[11px] font-medium text-(--color-ink-muted) outline-none hover:text-(--color-ink) data-[state=open]:text-(--color-ink)";
const MENU_CONTENT_CLASS =
  "z-50 w-[190px] rounded-xl bg-(--color-surface-elevated) p-1.5 shadow-[0px_8px_24px_-2px_rgba(0,0,0,0.16)]";
const MENU_ITEM_CLASS =
  "flex cursor-pointer items-center gap-2 truncate rounded-lg px-2.5 py-2 text-[13px] font-medium text-(--color-ink) outline-none data-[highlighted]:bg-(--color-fill)";

/**
 * Linha "Adicionar tarefa em <Espaço>…" no topo da aba Tarefas do Espaço: digita e Enter cria.
 * Projeto, data e prioridade são opcionais, escolhidos pelos chips à direita.
 */
export function TaskQuickAdd({
  spaceName,
  projects,
  today,
  onCreate,
}: {
  spaceName: string;
  /** Projetos do Espaço — os únicos que fazem sentido para uma tarefa criada aqui. */
  projects: Project[];
  today: Date;
  onCreate: (input: QuickAddInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [priority, setPriority] = useState("none");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const project = projects.find((p) => p.id === projectId) ?? null;
  const due = formatDueLabel(dueDate || null, today);
  const priorityInfo = priorityStyle(priority);

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ title: trimmed, projectId, priority, dueDate: dueDate || null });
      // Mantém projeto/data/prioridade: facilita criar várias tarefas parecidas em sequência.
      setTitle("");
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 rounded-xl border border-(--color-divider) bg-(--color-surface-elevated) px-3 py-2.5 transition-shadow focus-within:border-(--color-accent) focus-within:ring-3 focus-within:ring-(--color-accent)/12">
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-dashed border-(--color-ink-muted)/50 text-(--color-ink-muted)">
          <Plus className="size-2.5" strokeWidth={2.5} />
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") setTitle("");
          }}
          disabled={submitting}
          placeholder={`Adicionar tarefa em ${spaceName}…`}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)/70"
        />

        <div className="flex shrink-0 items-center gap-1.5">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className={CHIP_CLASS}
                style={
                  project
                    ? {
                        backgroundColor: `color-mix(in srgb, ${project.color ?? "#007AFF"} 12%, transparent)`,
                        color: project.color ?? "#007AFF",
                      }
                    : undefined
                }
              >
                <Square className="size-2 fill-current" strokeWidth={0} />
                <span className="max-w-[140px] truncate">{project?.name ?? "Projeto"}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={6} className={MENU_CONTENT_CLASS}>
                <DropdownMenu.Item onSelect={() => setProjectId(null)} className={MENU_ITEM_CLASS}>
                  Sem projeto
                </DropdownMenu.Item>
                {projects.length === 0 && (
                  <p className="px-2.5 py-2 text-[12px] text-(--color-ink-muted)">Nenhum projeto neste Espaço.</p>
                )}
                {projects.map((p) => (
                  <DropdownMenu.Item key={p.id} onSelect={() => setProjectId(p.id)} className={MENU_ITEM_CLASS}>
                    <Square className="size-2.5 shrink-0 fill-current" strokeWidth={0} style={{ color: p.color ?? "#007AFF" }} />
                    <span className="truncate">{p.name}</span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <span className="relative flex items-center">
            <button
              type="button"
              onClick={() => dateInputRef.current?.showPicker?.()}
              className={cn(CHIP_CLASS, due?.overdue && "text-(--color-danger) hover:text-(--color-danger)")}
            >
              <CalendarDays className="size-2.5" strokeWidth={2.5} />
              {due?.text ?? "Data"}
            </button>
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate("")}
                title="Remover data"
                className="ml-0.5 text-(--color-ink-muted) hover:text-(--color-ink)"
              >
                <X className="size-2.5" strokeWidth={2.5} />
              </button>
            )}
            <input
              ref={dateInputRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="pointer-events-none absolute inset-0 opacity-0"
            />
          </span>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className={CHIP_CLASS}
                style={priority !== "none" ? { color: priorityInfo.ink } : undefined}
              >
                <Flag className="size-2 fill-current" strokeWidth={2.5} />
                {priority === "none" ? "Prioridade" : priorityInfo.label}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={6} className={MENU_CONTENT_CLASS}>
                {[...PRIORITY_OPTIONS].reverse().map((option) => (
                  <DropdownMenu.Item key={option.value} onSelect={() => setPriority(option.value)} className={MENU_ITEM_CLASS}>
                    <Flag
                      className="size-3 shrink-0 fill-current"
                      strokeWidth={2}
                      style={{ color: priorityStyle(option.value).color }}
                    />
                    {option.label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <span className="ml-1 flex items-center gap-1 text-[11px] text-(--color-ink-muted)/70">
            <CornerDownLeft className="size-3" strokeWidth={2} />
            Enter
          </span>
        </div>
      </div>
      {error && <p className="mt-1.5 px-1 text-[12px] text-(--color-danger)">{error}</p>}
    </div>
  );
}
