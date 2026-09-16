export function Backlinks({ hasNote }: { hasNote: boolean }) {
  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-(--color-divider) bg-(--color-surface-elevated) px-5 pt-6 pb-5">
      <p className="text-[13px] font-semibold text-(--color-ink)">Mencionado em</p>
      <p className="text-[12px] text-(--color-ink-muted)">
        {hasNote ? "Nenhuma menção ainda." : "Selecione uma nota."}
      </p>

      <div className="h-px w-full bg-(--color-divider)" />

      <p className="text-[13px] font-semibold text-(--color-ink)">Tags</p>
      <p className="text-[12px] text-(--color-ink-muted)">Sem tags.</p>
    </div>
  );
}
