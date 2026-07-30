import { MOODS, type JournalEntry } from "@/store/journal";

export function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function dayKey(iso: string) {
  return startOfDay(new Date(iso)).toISOString().slice(0, 10);
}

export function computeStreak(entries: JournalEntry[]): number {
  if (!entries.length) return 0;
  const days = new Set(entries.map((e) => dayKey(e.createdAt)));
  let streak = 0;
  const cursor = startOfDay(new Date());
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function entriesThisWeek(entries: JournalEntry[]): number {
  const weekAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
  return entries.filter((e) => new Date(e.createdAt).getTime() >= startOfDay(new Date(weekAgo)).getTime())
    .length;
}

export function weeklyMoodSeries(entries: JournalEntry[]) {
  const out: { day: string; mood: number | null; count: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = startOfDay(new Date());
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const matches = entries.filter((e) => dayKey(e.createdAt) === key);
    out.push({
      day: date.toLocaleDateString(undefined, { weekday: "short" }),
      mood: matches.length ? matches.reduce((s, e) => s + e.mood, 0) / matches.length : null,
      count: matches.length,
    });
  }
  return out;
}

export function monthlyMoodSeries(entries: JournalEntry[]) {
  const out: { day: string; mood: number | null }[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const date = startOfDay(new Date());
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const matches = entries.filter((e) => dayKey(e.createdAt) === key);
    out.push({
      day: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      mood: matches.length ? matches.reduce((s, e) => s + e.mood, 0) / matches.length : null,
    });
  }
  return out;
}

export function emotionFrequency(entries: JournalEntry[]) {
  const counts = new Map<string, number>();
  entries.forEach((e) => e.emotions.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([emotion, count]) => ({ emotion, count }));
}

export function reflectionRate(entries: JournalEntry[]) {
  if (!entries.length) return 0;
  return Math.round((entries.filter((e) => e.reflection).length / entries.length) * 100);
}

export function moodMeta(value: number) {
  return MOODS.find((m) => m.value === Math.round(value)) ?? MOODS[2];
}

export function streakCalendar(entries: JournalEntry[], days = 35) {
  const set = new Set(entries.map((e) => dayKey(e.createdAt)));
  const cells: { key: string; active: boolean; label: string }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = startOfDay(new Date());
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    cells.push({ key, active: set.has(key), label: date.toLocaleDateString() });
  }
  return cells;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
