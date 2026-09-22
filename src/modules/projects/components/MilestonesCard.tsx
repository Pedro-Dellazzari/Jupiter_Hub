import { useEffect, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import type { Milestone } from "../../../db/repositories/milestonesRepo";
import { Card } from "../../../shared/ui/Card";
import { springs } from "../../../shared/motion/springs";
import { cn } from "../../../shared/utils/cn";

function MilestoneRow({
  milestone,
  isNext,
  isLast,
  onToggle,
  onRename,
  onDateChange,
  onRemove,
}: {
  milestone: Milestone;
  isNext: boolean;
  isLast: boolean;
  onToggle: (done: boolean) => void;
  onRename: (title: string) => void;
  onDateChange: (dueDate: string | null) => void;
  onRemove: () => void;
}) {
  const isDone = !!milestone.completed_at;
  const [title, setTitle] = useState(milestone.title);

  useEffect(() => setTitle(milestone.title), [milestone.title]);

  function commit() {
    const trimmed = title.trim();
    if (!trimmed) setTitle(milestone.title);
    else if (trimmed !== milestone.title) onRename(trimmed);
  }

  return (
    <div className="group flex gap-3">
      <div className="flex flex-col items-center">
        <motion.button
          type="button"
          onClick={() => onToggle(!isDone)}
          whileHover={{ scale: 1.1, transition: springs.snappy }}
          whileTap={{ scale: 0.85, transition: springs.snappy }}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
            isDone
              ? "border-(--color-accent) bg-(--color-accent) text-(--color-accent-ink)"
              : isNext
                ? "border-(--color-accent) bg-(--color-surface-elevated)"
                : "border-(--color-divider) bg-(--color-surface-elevated)",
          )}
          title={isDone ? "Marcar como pendente" : "Marcar como concluído"}
        >
          {isDone && <Check className="size-3" strokeWidth={3} />}
          {!isDone && isNext && <span className="size-1.5 rounded-full bg-(--color-accent)" />}
        </motion.button>
        {!isLast && <div className="my-1 w-px flex-1 bg-(--color-divider)" style={{ minHeight: 20 }} />}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 pb-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-[13px] outline-none",
            isDone ? "text-(--color-ink-muted) line-through" : isNext ? "font-semibold text-(--color-ink)" : "text-(--color-ink)",
          )}
        />
        <input
          type="date"
          value={milestone.due_date ?? ""}
          onChange={(e) => onDateChange(e.target.value || null)}
          className={cn(
            "shrink-0 bg-transparent text-right text-[12px] outline-none",
            isNext ? "font-semibold text-(--color-accent-text)" : "text-(--color-ink-muted)",
          )}
        />
        <button
          type="button"
          onClick={onRemove}
          className="flex size-5 shrink-0 items-center justify-center rounded-full text-(--color-ink-muted) opacity-0 group-hover:opacity-100 hover:bg-(--color-danger)/12 hover:text-(--color-danger)"
          title="Excluir marco"
        >
          <Trash2 className="size-3" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/** Card "Marcos" da página de detalhe do projeto: linha do tempo de checkpoints com data-alvo. */
export function MilestonesCard({
  milestones,
  onToggle,
  onRename,
  onDateChange,
  onRemove,
  onAdd,
}: {
  milestones: Milestone[];
  onToggle: (id: string, done: boolean) => void;
  onRename: (id: string, title: string) => void;
  onDateChange: (id: string, dueDate: string | null) => void;
  onRemove: (id: string) => void;
  onAdd: (input: { title: string; due_date: string | null }) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");

  const nextId = milestones.find((m) => !m.completed_at)?.id;

  function handleAdd() {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    onAdd({ title: trimmed, due_date: newDate || null });
    setNewTitle("");
    setNewDate("");
  }

  return (
    <Card className="flex flex-col gap-3 border border-(--color-divider) p-5">
      <h2 className="text-[16px] font-bold text-(--color-ink)">Marcos</h2>

      {milestones.length === 0 ? (
        <p className="text-[13px] text-(--color-ink-muted)">Nenhum marco ainda — adicione os checkpoints do projeto.</p>
      ) : (
        <div className="flex flex-col">
          {milestones.map((milestone, index) => (
            <MilestoneRow
              key={milestone.id}
              milestone={milestone}
              isNext={milestone.id === nextId}
              isLast={index === milestones.length - 1}
              onToggle={(done) => onToggle(milestone.id, done)}
              onRename={(title) => onRename(milestone.id, title)}
              onDateChange={(dueDate) => onDateChange(milestone.id, dueDate)}
              onRemove={() => onRemove(milestone.id)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg border border-(--color-divider) bg-(--color-surface) px-3 py-2 focus-within:border-(--color-accent)">
        <Plus className="size-3.5 shrink-0 text-(--color-ink-muted)" strokeWidth={2} />
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Adicionar marco…"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)"
        />
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="shrink-0 bg-transparent text-[12px] text-(--color-ink-muted) outline-none"
        />
      </div>
    </Card>
  );
}
