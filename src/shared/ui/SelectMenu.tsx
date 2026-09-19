import type { ReactNode } from "react";
import { DropdownMenu } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../utils/cn";

export type SelectOption = { value: string; label: string; icon?: ReactNode };

type SelectMenuProps = {
  /** "" representa "nenhum" (o item `emptyLabel`). */
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  /** Texto do item que limpa a seleção (ex: "Sem projeto"). */
  emptyLabel: string;
  /** Ação extra no fim do menu (ex: "Novo espaço"). */
  footer?: { label: string; icon?: ReactNode; onSelect: () => void };
  leadingIcon?: ReactNode;
  className?: string;
};

const ITEM_CLASS =
  "flex cursor-pointer items-center gap-2 truncate rounded-lg px-2.5 py-2 text-[13px] font-medium outline-none data-[highlighted]:bg-(--color-fill)";

/** Select estilizado (menu do Radix) — mesmo visual dos demais menus do app e dos campos de formulário. */
export function SelectMenu({ value, options, onChange, emptyLabel, footer, leadingIcon, className }: SelectMenuProps) {
  const selected = options.find((o) => o.value === value);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-(--color-divider) bg-(--color-surface) px-3 py-2 text-left text-[13px] outline-none focus:border-(--color-accent) data-[state=open]:border-(--color-accent)",
            selected ? "text-(--color-ink)" : "text-(--color-ink-muted)",
            className,
          )}
        >
          {selected?.icon ?? leadingIcon}
          <span className="min-w-0 flex-1 truncate">{selected?.label ?? emptyLabel}</span>
          <ChevronDown className="size-3.5 shrink-0 text-(--color-ink-muted)" strokeWidth={2} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-[60] max-h-64 w-(--radix-dropdown-menu-trigger-width) min-w-[180px] overflow-y-auto rounded-xl bg-(--color-surface-elevated) p-1.5 shadow-[0px_8px_24px_-2px_rgba(0,0,0,0.16)]"
        >
          <DropdownMenu.Item
            onSelect={() => onChange("")}
            className={cn(ITEM_CLASS, value === "" ? "text-(--color-ink)" : "text-(--color-ink-muted)")}
          >
            {emptyLabel}
          </DropdownMenu.Item>
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              onSelect={() => onChange(option.value)}
              className={cn(
                ITEM_CLASS,
                option.value === value ? "bg-(--color-accent)/12 text-(--color-accent)" : "text-(--color-ink)",
              )}
            >
              {option.icon}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.value === value && <Check className="size-3.5 shrink-0" strokeWidth={2.5} />}
            </DropdownMenu.Item>
          ))}
          {footer && (
            <>
              <DropdownMenu.Separator className="my-1.5 h-px bg-(--color-divider)" />
              <DropdownMenu.Item onSelect={footer.onSelect} className={cn(ITEM_CLASS, "text-(--color-accent)")}>
                {footer.icon}
                {footer.label}
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
