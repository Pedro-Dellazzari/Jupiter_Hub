import { Bell, Settings } from "lucide-react";

function greeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function todayLabel() {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function TopBar({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-4">
      <div>
        <h1 className="text-[24px] leading-[1.05] font-bold tracking-[-0.5px] text-(--color-ink)">
          {greeting(new Date().getHours())}, {name}
        </h1>
        <p className="text-[14px] text-(--color-ink-muted)">{todayLabel()}</p>
      </div>
      <div className="flex-1" />
      <div className="flex shrink-0 items-center gap-2.5">
        <button className="flex size-9 items-center justify-center rounded-[10px] text-(--color-ink) hover:bg-(--color-fill)">
          <Bell className="size-4" strokeWidth={1.75} />
        </button>
        <button className="flex size-9 items-center justify-center rounded-[10px] text-(--color-ink) hover:bg-(--color-fill)">
          <Settings className="size-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
