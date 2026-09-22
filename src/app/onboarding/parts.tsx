import { useId, useState, type ComponentPropsWithRef } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { cn } from "../../shared/utils/cn";

const INPUT_CLASS =
  "w-full rounded-lg border border-(--color-divider) bg-(--color-surface-elevated) px-3 py-2.5 text-[14px] text-(--color-ink) outline-none focus:border-(--color-accent)";

export function StepHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-brand text-[24px] font-semibold tracking-[-0.03em] text-(--color-ink)">{title}</h1>
      {description && <p className="text-[14px] text-(--color-ink-muted)">{description}</p>}
    </div>
  );
}

type FieldProps = ComponentPropsWithRef<"input"> & { label: string };

export function Field({ label, className, ...props }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-(--color-ink-muted)">{label}</span>
      <input className={cn(INPUT_CLASS, className)} {...props} />
    </label>
  );
}

export function PasswordField({ label, ...props }: Omit<FieldProps, "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-(--color-ink-muted)">
        {label}
      </label>
      <div className="relative">
        <input id={id} type={visible ? "text" : "password"} className={cn(INPUT_CLASS, "pr-10")} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-(--color-ink-muted) hover:text-(--color-ink)"
        >
          {visible ? <EyeOff className="size-4" strokeWidth={1.75} /> : <Eye className="size-4" strokeWidth={1.75} />}
        </button>
      </div>
    </div>
  );
}

export function PrimaryButton({ className, ...props }: ComponentPropsWithRef<"button">) {
  return (
    <button
      className={cn(
        "w-full rounded-lg bg-(--color-accent) py-2.5 text-[14px] font-semibold text-(--color-accent-ink) disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 self-start text-[13px] text-(--color-ink-muted) hover:text-(--color-ink)"
    >
      <ArrowLeft className="size-3.5" strokeWidth={2} />
      Voltar
    </button>
  );
}
