export function ModuleErrorState({ message = "Não foi possível carregar seus dados locais." }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-[14px] text-(--color-ink-muted)">{message}</p>
    </div>
  );
}
