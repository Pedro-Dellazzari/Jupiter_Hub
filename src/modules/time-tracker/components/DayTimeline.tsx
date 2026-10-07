import { formatTracked } from "../../../shared/utils/duration";
import { DAY_MS, secondsIn, type Session } from "../utils/timeStats";

const HOUR_MS = 60 * 60 * 1000;

/** Faixa do dia de hoje: cada sessão vira um segmento na cor do projeto, posicionado pela hora. */
export function DayTimeline({
  sessions,
  now,
  todayStart,
}: {
  sessions: Session[];
  now: number;
  todayStart: number;
}) {
  const today = sessions.filter((s) => secondsIn(s, todayStart, todayStart + DAY_MS) > 0);

  // Janela padrão 06h–18h, alargada (em horas pares) para caber a primeira e a última sessão do dia.
  const firstHour = Math.min(...today.map((s) => (Math.max(s.start, todayStart) - todayStart) / HOUR_MS), 6);
  const lastHour = Math.max(...today.map((s) => (Math.min(s.end, todayStart + DAY_MS) - todayStart) / HOUR_MS), 18);
  const fromHour = Math.max(0, Math.floor(firstHour / 2) * 2);
  const toHour = Math.min(24, Math.ceil(lastHour / 2) * 2);
  const from = todayStart + fromHour * HOUR_MS;
  const span = (toHour - fromHour) * HOUR_MS;
  const ticks = Array.from({ length: (toHour - fromHour) / 2 + 1 }, (_, i) => fromHour + i * 2);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-2.5 rounded-full bg-[#2a2a31]">
        {today.map((s) => {
          const start = Math.max(s.start, from);
          const end = Math.min(s.end, todayStart + DAY_MS);
          const time = (ms: number) =>
            new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          return (
            <div
              key={s.id}
              title={`${s.taskTitle} · ${time(start)}–${s.running ? "agora" : time(end)} · ${formatTracked(Math.round((end - start) / 1000))}`}
              className="absolute inset-y-0 min-w-1.5 rounded-full"
              style={{
                left: `${((start - from) / span) * 100}%`,
                width: `${((end - start) / span) * 100}%`,
                backgroundColor: s.projectColor,
                opacity: s.running ? 1 : 0.75,
              }}
            >
              {s.running && (
                <span className="absolute top-1/2 right-0 size-2 translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-4 ring-white/20" />
              )}
            </div>
          );
        })}
        {now >= from && now <= from + span && today.every((s) => !s.running) && (
          <span
            className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-white/40"
            style={{ left: `${((now - from) / span) * 100}%` }}
            title="Agora"
          />
        )}
      </div>
      <div className="flex justify-between text-[11px] text-[#8e8e93] tabular-nums">
        {ticks.map((hour) => (
          <span key={hour}>{String(hour).padStart(2, "0")}h</span>
        ))}
      </div>
    </div>
  );
}
