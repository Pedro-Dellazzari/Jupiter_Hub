/** Relógio corrido "HH:MM:SS" — usado enquanto o cronômetro está rodando. */
export function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
}

/** Tempo acumulado em formato curto: "45m", "1h 30m", "2h". Abaixo de 1 minuto vira "<1m". */
export function formatTracked(totalSeconds: number): string {
  if (totalSeconds < 60) return "<1m";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, "0")}m`;
}
