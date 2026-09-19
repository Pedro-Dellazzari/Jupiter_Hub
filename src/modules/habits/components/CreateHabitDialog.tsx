import { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { Space } from "../../../db/repositories/spacesRepo";
import { ChipSelect } from "../../../shared/ui/ChipSelect";
import { Dialog } from "../../../shared/ui/Dialog";
import { cn } from "../../../shared/utils/cn";

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
] as const;

const COLOR_OPTIONS = ["#007aff", "#8c59f2", "#33a673", "#f28c26", "#ff2d78", "#12b3a8"];

export function CreateHabitDialog({
  open,
  onOpenChange,
  spaces,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaces: Space[];
  onCreate: (input: {
    name: string;
    spaceId: string | null;
    frequencyType: string;
    color: string;
    targetCount: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [frequencyType, setFrequencyType] = useState<string>("daily");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [targetCount, setTargetCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ name: trimmed, spaceId: spaceId || null, frequencyType, color, targetCount });
      setName("");
      setSpaceId("");
      setFrequencyType("daily");
      setColor(COLOR_OPTIONS[0]);
      setTargetCount(1);
      onOpenChange(false);
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const unit = frequencyType === "weekly" ? "semana" : "dia";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) {
          onOpenChange(next);
          if (!next) setError(null);
        }
      }}
      title="Novo hábito"
      initialFocusRef={inputRef}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-(--color-ink-muted)">Nome</span>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="O que você quer manter todo dia?"
            className="rounded-lg border border-(--color-divider) bg-(--color-surface) px-3 py-2 text-[14px] text-(--color-ink) outline-none focus:border-(--color-accent)"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-(--color-ink-muted)">Espaço</span>
          <select
            value={spaceId}
            onChange={(e) => setSpaceId(e.target.value)}
            className="rounded-lg border border-(--color-divider) bg-(--color-surface) px-3 py-2 text-[13px] text-(--color-ink) outline-none focus:border-(--color-accent)"
          >
            <option value="">Nenhum Espaço</option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-(--color-ink-muted)">Frequência</span>
          <ChipSelect options={FREQUENCY_OPTIONS} value={frequencyType} onChange={setFrequencyType} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-(--color-ink-muted)">Cor</span>
          <div className="flex items-center gap-2.5">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setColor(option)}
                aria-label={`Cor ${option}`}
                style={{ backgroundColor: option }}
                className={cn(
                  "size-6 shrink-0 rounded-full outline-offset-2",
                  color === option && "outline outline-2 outline-(--color-ink)",
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-(--color-ink-muted)">Meta</span>
          <div className="flex items-center gap-1.5 rounded-lg border border-(--color-divider) bg-(--color-surface) p-1.5">
            <button
              type="button"
              onClick={() => setTargetCount((n) => Math.max(1, n - 1))}
              className="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--color-fill) text-(--color-ink-muted) hover:text-(--color-ink)"
            >
              <Minus className="size-3.5" strokeWidth={2.5} />
            </button>
            <span className="flex-1 text-center text-[14px] font-medium text-(--color-ink)">
              {targetCount}x por {unit}
            </span>
            <button
              type="button"
              onClick={() => setTargetCount((n) => Math.min(7, n + 1))}
              className="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--color-fill) text-(--color-ink-muted) hover:text-(--color-ink)"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {error && <p className="text-[12px] text-(--color-danger)">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="rounded-lg bg-(--color-accent) py-2 text-[13px] font-semibold text-(--color-accent-ink) disabled:opacity-40"
        >
          {submitting ? "Salvando…" : "Criar hábito"}
        </button>
      </form>
    </Dialog>
  );
}
