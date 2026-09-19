import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Check, Circle, Plus, Square, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { tasksRepo, type Task, type TaskPatch, type TaskWithRelations } from "../../../db/repositories/tasksRepo";
import type { Project } from "../../../db/repositories/projectsRepo";
import type { Space } from "../../../db/repositories/spacesRepo";
import { springs } from "../../../shared/motion/springs";
import { ConfirmDialog } from "../../../shared/ui/ConfirmDialog";
import { ProgressBar } from "../../../shared/ui/ProgressBar";
import { SelectMenu } from "../../../shared/ui/SelectMenu";
import { cn } from "../../../shared/utils/cn";
import { PriorityChips } from "./PriorityChips";

const LABEL_CLASS = "text-[13px] font-medium text-(--color-ink-muted)";
const FIELD_CLASS =
  "rounded-lg border border-(--color-divider) bg-(--color-surface) px-3 py-2 text-[13px] text-(--color-ink) outline-none focus:border-(--color-accent)";

function SubtaskRow({
  subtask,
  onToggle,
  onRename,
  onRemove,
}: {
  subtask: Task;
  onToggle: (done: boolean) => void;
  onRename: (title: string) => void;
  onRemove: () => void;
}) {
  const isDone = subtask.status === "done";
  const [title, setTitle] = useState(subtask.title);

  useEffect(() => setTitle(subtask.title), [subtask.title]);

  function commit() {
    const trimmed = title.trim();
    if (!trimmed) setTitle(subtask.title);
    else if (trimmed !== subtask.title) onRename(trimmed);
  }

  return (
    <div className="group flex items-center gap-2.5 rounded-md px-1 py-1.5 hover:bg-(--color-fill)">
      <motion.button
        type="button"
        onClick={() => onToggle(!isDone)}
        whileHover={{ scale: 1.1, transition: springs.snappy }}
        whileTap={{ scale: 0.85, transition: springs.snappy }}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border",
          isDone
            ? "border-(--color-accent) bg-(--color-accent) text-(--color-accent-ink)"
            : "border-(--color-divider) text-transparent",
        )}
        title={isDone ? "Marcar como a fazer" : "Marcar como concluída"}
      >
        <Check className="size-2.5" strokeWidth={3} />
      </motion.button>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-[13px] outline-none",
          isDone ? "text-(--color-ink-muted) line-through" : "text-(--color-ink)",
        )}
      />
      <button
        type="button"
        onClick={onRemove}
        className="flex size-5 shrink-0 items-center justify-center rounded-full text-(--color-ink-muted) opacity-0 group-hover:opacity-100 hover:bg-(--color-danger)/12 hover:text-(--color-danger)"
        title="Excluir subtarefa"
      >
        <Trash2 className="size-3" strokeWidth={2} />
      </button>
    </div>
  );
}

/** Painel lateral de uma tarefa aberta: edita os parâmetros e gerencia as subtarefas. */
export function TaskDetailPanel({
  task,
  projects,
  spaces,
  onClose,
  onChanged,
}: {
  task: TaskWithRelations;
  projects: Project[];
  spaces: Space[];
  onClose: () => void;
  /** Avisa a tela de Tarefas para recarregar a lista (contagem de subtarefas, chips, agrupamento). */
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const loadSubtasks = useCallback(() => {
    tasksRepo.listSubtasks(task.id).then(setSubtasks);
  }, [task.id]);

  useEffect(loadSubtasks, [loadSubtasks]);
  useEffect(() => setTitle(task.title), [task.title]);

  const visibleProjects = useMemo(
    () => (task.space_id ? projects.filter((p) => p.space_id === task.space_id) : projects),
    [projects, task.space_id],
  );

  function save(patch: TaskPatch) {
    tasksRepo.update(task.id, patch).then(onChanged);
  }

  function handleSpaceChange(next: string) {
    const project = projects.find((p) => p.id === task.project_id);
    // O Espaço da tarefa vem do projeto quando há um; trocar de Espaço desvincula um projeto de outro Espaço.
    const keepProject = !project || (next ? project.space_id === next : !project.space_id);
    save({ space_id: next || null, ...(keepProject ? {} : { project_id: null }) });
  }

  function handleProjectChange(next: string) {
    const project = projects.find((p) => p.id === next);
    // Com projeto em um Espaço, o Espaço passa a ser herdado dele (space_id próprio deixa de valer).
    save({ project_id: next || null, ...(project?.space_id ? { space_id: null } : {}) });
  }

  function handleAddSubtask() {
    const trimmed = newSubtask.trim();
    if (!trimmed) return;
    setNewSubtask("");
    tasksRepo
      .create({ title: trimmed, parent_task_id: task.id, sort_order: subtasks.length })
      .then(() => {
        loadSubtasks();
        onChanged();
      });
  }

  function mutateSubtask(action: Promise<void>) {
    action.then(() => {
      loadSubtasks();
      onChanged();
    });
  }

  const doneCount = subtasks.filter((s) => s.status === "done").length;
  const progress = subtasks.length === 0 ? 0 : Math.round((doneCount / subtasks.length) * 100);

  return (
    <div className="flex min-h-full flex-col gap-5 px-6 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-(--color-ink)">Detalhes da tarefa</h2>
        <button
          onClick={onClose}
          className="flex size-6 items-center justify-center rounded-md text-(--color-ink-muted) hover:text-(--color-ink)"
          title="Fechar"
        >
          <X className="size-4" strokeWidth={2} />
        </button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Título</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const trimmed = title.trim();
            if (!trimmed) setTitle(task.title);
            else if (trimmed !== task.title) save({ title: trimmed });
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className={FIELD_CLASS}
        />
      </label>

      <div className="flex gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className={LABEL_CLASS}>Espaço</span>
          <SelectMenu
            value={task.space_id ?? ""}
            options={spaces.map((s) => ({
              value: s.id,
              label: s.name,
              icon: <Circle className="size-3 shrink-0" strokeWidth={2} />,
            }))}
            onChange={handleSpaceChange}
            emptyLabel="Sem espaço"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className={LABEL_CLASS}>Projeto</span>
          <SelectMenu
            value={task.project_id ?? ""}
            options={visibleProjects.map((p) => ({
              value: p.id,
              label: p.name,
              icon: (
                <Square
                  className="size-2.5 shrink-0 fill-current"
                  strokeWidth={0}
                  style={{ color: p.color ?? "#007AFF" }}
                />
              ),
            }))}
            onChange={handleProjectChange}
            emptyLabel="Sem projeto"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={LABEL_CLASS}>Prioridade</span>
        <PriorityChips value={task.priority} onChange={(priority) => save({ priority })} />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Data de vencimento</span>
        <input
          type="date"
          value={task.due_date ?? ""}
          onChange={(e) => save({ due_date: e.target.value || null })}
          className={FIELD_CLASS}
        />
      </label>

      <section className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className={LABEL_CLASS}>Subtarefas</span>
          {subtasks.length > 0 && (
            <span className="text-[13px] text-(--color-ink-muted)">
              {doneCount} de {subtasks.length}
            </span>
          )}
        </div>
        {subtasks.length > 0 && <ProgressBar value={progress} className="mt-1.5 mb-2 h-1" />}

        <div className="flex flex-col">
          {subtasks.map((subtask) => (
            <SubtaskRow
              key={subtask.id}
              subtask={subtask}
              onToggle={(done) => mutateSubtask(tasksRepo.toggleDone(subtask.id, done))}
              onRename={(next) => mutateSubtask(tasksRepo.update(subtask.id, { title: next }))}
              onRemove={() => mutateSubtask(tasksRepo.remove(subtask.id))}
            />
          ))}
        </div>

        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-(--color-divider) bg-(--color-surface) px-3 py-2 focus-within:border-(--color-accent)">
          <Plus className="size-3.5 shrink-0 text-(--color-ink-muted)" strokeWidth={2} />
          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddSubtask();
              }
            }}
            placeholder="Adicionar subtarefa…"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)"
          />
        </div>
      </section>

      <div className="flex-1" />

      <button
        onClick={() => setConfirmingDelete(true)}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-(--color-danger)/12 py-2 text-[13px] font-semibold text-(--color-danger) hover:bg-(--color-danger)/18"
      >
        <Ban className="size-3.5" strokeWidth={2} />
        Excluir tarefa
      </button>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Excluir "${task.title}"?`}
        description={
          subtasks.length > 0
            ? `Isso também vai excluir ${subtasks.length} subtarefa${subtasks.length === 1 ? "" : "s"}.`
            : undefined
        }
        confirmLabel="Excluir"
        onConfirm={() => {
          tasksRepo.remove(task.id).then(() => {
            onClose();
            onChanged();
          });
        }}
      />
    </div>
  );
}
