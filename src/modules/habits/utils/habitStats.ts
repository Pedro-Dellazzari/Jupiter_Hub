import type { HabitLog } from "../../../db/repositories/habitLogsRepo";
import { formatIsoDate, startOfDay } from "../../../shared/utils/date";

export type WeekDay = {
  date: string;
  done: boolean;
  isFuture: boolean;
};

function startOfWeekMonday(date: Date): Date {
  const start = startOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - diff);
  return start;
}

/** Sequência atual de dias consecutivos com check-in, contando pra trás a partir de hoje. */
export function computeCurrentStreak(habitId: string, logs: HabitLog[], today: Date): number {
  const loggedDates = new Set(logs.filter((l) => l.habit_id === habitId).map((l) => l.date));
  let streak = 0;
  const cursor = startOfDay(today);
  while (loggedDates.has(formatIsoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Grade Segunda–Domingo da semana atual, marcando quais dias já têm check-in. */
export function computeWeekDots(habitId: string, logs: HabitLog[], today: Date): WeekDay[] {
  const loggedDates = new Set(logs.filter((l) => l.habit_id === habitId).map((l) => l.date));
  const monday = startOfWeekMonday(today);
  const todayIso = formatIsoDate(startOfDay(today));

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(day.getDate() + i);
    const iso = formatIsoDate(day);
    return { date: iso, done: loggedDates.has(iso), isFuture: iso > todayIso };
  });
}
