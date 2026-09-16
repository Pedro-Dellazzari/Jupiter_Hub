import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "../../shared/ui/Card";
import { Dialog } from "../../shared/ui/Dialog";
import { cn } from "../../shared/utils/cn";

const WEEKDAY_HEADERS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function monthLabel(date: Date) {
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date);
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
}

function buildWeeks(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - start.getDay());

  const lastOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const end = new Date(lastOfMonth);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export default function CalendarModule() {
  const [viewedMonth, setViewedMonth] = useState(() => new Date());
  const [connectOpen, setConnectOpen] = useState(false);
  const today = new Date();

  const weeks = buildWeeks(viewedMonth);

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-(--color-ink)">Calendário</h1>
          <div className="flex items-center gap-2 text-[14px]">
            <button
              onClick={() => setViewedMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="text-(--color-ink-muted) hover:text-(--color-ink)"
            >
              <ChevronLeft className="size-4" strokeWidth={2} />
            </button>
            <span className="font-semibold text-(--color-ink)">{monthLabel(viewedMonth)}</span>
            <button
              onClick={() => setViewedMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="text-(--color-ink-muted) hover:text-(--color-ink)"
            >
              <ChevronRight className="size-4" strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setConnectOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-(--color-accent) py-2 pr-3.5 pl-3 text-[12px] font-semibold text-white"
          >
            <span className="flex size-3.5 items-center justify-center rounded-sm bg-white text-[8px] font-semibold text-(--color-accent)">
              G
            </span>
            Conectar Gmail ou Outlook
          </button>
        </div>

        <Card className="flex flex-col gap-1.5 p-4.5">
          <div className="flex items-start gap-1.5">
            {WEEKDAY_HEADERS.map((h) => (
              <div key={h} className="flex flex-1 items-start justify-center py-1">
                <span className="text-[11px] font-semibold text-(--color-ink-muted)/70">{h}</span>
              </div>
            ))}
          </div>
          {weeks.map((week, i) => (
            <div key={i} className="flex items-start gap-1.5">
              {week.map((day) => {
                const isCurrentMonth = day.getMonth() === viewedMonth.getMonth();
                const isToday = day.toDateString() === today.toDateString();
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "h-[92px] flex-1 rounded-[10px] p-2",
                      isToday && "bg-(--color-accent)/12",
                    )}
                  >
                    {isToday ? (
                      <span className="flex size-[22px] items-center justify-center rounded-full bg-(--color-accent) text-[12px] font-semibold text-white">
                        {day.getDate()}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "text-[12px] font-medium",
                          isCurrentMonth ? "text-(--color-ink)" : "text-(--color-ink-muted)/50",
                        )}
                      >
                        {day.getDate()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </Card>
      </div>

      <Dialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        title="Conectar calendário"
        description="Integração com Google Calendar e Outlook ainda não está disponível nesta versão do Hub."
      >
        <button
          onClick={() => setConnectOpen(false)}
          className="w-full rounded-lg bg-(--color-fill) py-2 text-[13px] font-semibold text-(--color-ink)"
        >
          Entendi
        </button>
      </Dialog>
    </div>
  );
}
