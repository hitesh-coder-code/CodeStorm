/**
 * MindVault local-only data layer.
 * Everything lives in localStorage — nothing is ever sent off the device.
 */
import { useCallback, useEffect, useState } from "react";

export type Mood = "great" | "good" | "okay" | "low" | "rough";

export const MOODS: { id: Mood; emoji: string; label: string; score: number }[] = [
  { id: "great", emoji: "😄", label: "Great", score: 5 },
  { id: "good", emoji: "🙂", label: "Good", score: 4 },
  { id: "okay", emoji: "😐", label: "Okay", score: 3 },
  { id: "low", emoji: "😔", label: "Low", score: 2 },
  { id: "rough", emoji: "😣", label: "Rough", score: 1 },
];

export const moodMeta = (m: Mood) => MOODS.find((x) => x.id === m) ?? MOODS[2];

export type Entry = {
  id: string;
  title: string;
  body: string;
  mood: Mood;
  createdAt: string;
  favorite: boolean;
  source: "text" | "voice";
  emotions: string[];
  summary?: string;
  reflection?: string;
  durationSec?: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type Settings = {
  name: string;
  theme: "dark" | "light";
  notifications: boolean;
  reminderTime: string;
  analytics: false;
};

const KEYS = {
  entries: "mindvault.entries",
  chat: "mindvault.chat",
  settings: "mindvault.settings",
};

export const defaultSettings: Settings = {
  name: "Friend",
  theme: "dark",
  notifications: true,
  reminderTime: "21:00",
  analytics: false,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("mindvault:change", { detail: key }));
}

function useLocal<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(read(key, fallback));
    setHydrated(true);
    const sync = () => setValue(read(key, fallback));
    window.addEventListener("mindvault:change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("mindvault:change", sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        write(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return { value, setValue: update, hydrated };
}

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function useEntries() {
  const { value, setValue, hydrated } = useLocal<Entry[]>(KEYS.entries, []);

  const add = (entry: Omit<Entry, "id" | "createdAt" | "favorite">) => {
    const full: Entry = {
      ...entry,
      id: uid(),
      createdAt: new Date().toISOString(),
      favorite: false,
    };
    setValue((prev) => [full, ...prev]);
    return full;
  };

  const update = (id: string, patch: Partial<Entry>) =>
    setValue((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const remove = (id: string) =>
    setValue((prev) => prev.filter((e) => e.id !== id));

  return { entries: value, add, update, remove, clear: () => setValue([]), hydrated };
}

export function useChat() {
  const { value, setValue, hydrated } = useLocal<ChatMessage[]>(KEYS.chat, []);
  const push = (role: ChatMessage["role"], content: string) => {
    const msg: ChatMessage = {
      id: uid(),
      role,
      content,
      createdAt: new Date().toISOString(),
    };
    setValue((prev) => [...prev, msg]);
    return msg;
  };
  return { messages: value, push, clear: () => setValue([]), hydrated };
}

export function useSettings() {
  const { value, setValue, hydrated } = useLocal<Settings>(
    KEYS.settings,
    defaultSettings,
  );
  return {
    settings: value,
    setSettings: (patch: Partial<Settings>) =>
      setValue((prev) => ({ ...prev, ...patch })),
    hydrated,
  };
}

export function wipeAllLocalData() {
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  window.dispatchEvent(new CustomEvent("mindvault:change"));
}

export function exportPayload(entries: Entry[]) {
  return JSON.stringify({ app: "MindVault", exportedAt: new Date().toISOString(), entries }, null, 2);
}

export function downloadJson(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- streak + analytics helpers ---------------- */

const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

export function computeStreak(entries: Entry[]) {
  const days = new Set(entries.map((e) => dayKey(e.createdAt)));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function entriesThisWeek(entries: Entry[]) {
  const weekAgo = Date.now() - 7 * 864e5;
  return entries.filter((e) => new Date(e.createdAt).getTime() >= weekAgo).length;
}

export function weeklyMoodSeries(entries: Entry[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = dayKey(d);
    const dayEntries = entries.filter((e) => dayKey(e.createdAt) === key);
    const avg = dayEntries.length
      ? dayEntries.reduce((s, e) => s + moodMeta(e.mood).score, 0) / dayEntries.length
      : 0;
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      mood: Number(avg.toFixed(2)),
      entries: dayEntries.length,
    };
  });
}

export function monthlyMoodSeries(entries: Entry[]) {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = dayKey(d);
    const dayEntries = entries.filter((e) => dayKey(e.createdAt) === key);
    const avg = dayEntries.length
      ? dayEntries.reduce((s, e) => s + moodMeta(e.mood).score, 0) / dayEntries.length
      : 0;
    return { day: d.getDate().toString(), mood: Number(avg.toFixed(2)) };
  });
}

export function topEmotions(entries: Entry[]) {
  const counts = new Map<string, number>();
  entries.forEach((e) =>
    e.emotions.forEach((em) => counts.set(em, (counts.get(em) ?? 0) + 1)),
  );
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([emotion, count]) => ({ emotion, count }));
}

export function streakCalendar(entries: Entry[]) {
  const days = new Set(entries.map((e) => dayKey(e.createdAt)));
  return Array.from({ length: 35 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (34 - i));
    return { date: d, active: days.has(dayKey(d)) };
  });
}
