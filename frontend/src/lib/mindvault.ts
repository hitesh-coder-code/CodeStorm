import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createJournal,
  deleteJournal,
  isAuthenticated,
  listJournals,
  updateJournal,
  type BackendJournal,
  type BackendMood,
  type JournalCreatePayload,
  type JournalUpdatePayload,
} from "@/lib/api";


export type Mood =
  | "great"
  | "good"
  | "okay"
  | "low"
  | "rough";

export const MOODS: {
  id: Mood;
  emoji: string;
  label: string;
  score: number;
}[] = [
  {
    id: "great",
    emoji: "😄",
    label: "Great",
    score: 5,
  },
  {
    id: "good",
    emoji: "🙂",
    label: "Good",
    score: 4,
  },
  {
    id: "okay",
    emoji: "😐",
    label: "Okay",
    score: 3,
  },
  {
    id: "low",
    emoji: "😔",
    label: "Low",
    score: 2,
  },
  {
    id: "rough",
    emoji: "😣",
    label: "Rough",
    score: 1,
  },
];

export const moodMeta = (mood: Mood) =>
  MOODS.find((item) => item.id === mood) ??
  MOODS[2];

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

function frontendMoodToBackend(
  mood: Mood,
): BackendMood {
  const mapping: Record<Mood, BackendMood> = {
    great: "happy",
    good: "calm",
    okay: "neutral",
    low: "sad",
    rough: "stressed",
  };

  return mapping[mood];
}

function backendMoodToFrontend(
  mood: BackendMood | null,
): Mood {
  const mapping: Record<BackendMood, Mood> = {
    happy: "great",
    calm: "good",
    neutral: "okay",
    anxious: "rough",
    sad: "low",
    stressed: "rough",
    angry: "rough",
  };

  return mood ? mapping[mood] : "okay";
}

function backendToEntry(
  journal: BackendJournal,
): Entry {
  return {
    id: String(journal.id),
    title: journal.title ?? "Untitled entry",
    body: journal.original_text,
    mood: backendMoodToFrontend(
      journal.mood_label,
    ),
    createdAt: journal.created_at,
    favorite: journal.is_favorite,
    source:
      journal.entry_source === "audio"
        ? "voice"
        : "text",
    emotions: [],
    summary:
      journal.mood_summary ?? undefined,
    reflection:
      journal.reflection_questions[0] ??
      undefined,
  };
}

function entryToCreatePayload(
  entry: Omit<
    Entry,
    "id" | "createdAt" | "favorite"
  >,
): JournalCreatePayload {
  return {
    title: entry.title,
    original_text: entry.body,
    transcript:
      entry.source === "voice"
        ? entry.body
        : null,
    reflection_questions:
      entry.reflection
        ? [entry.reflection]
        : [],
    mood_summary: entry.summary ?? null,
    mood_label:
      frontendMoodToBackend(entry.mood),
    mood_score:
      moodMeta(entry.mood).score * 2,
    entry_source:
      entry.source === "voice"
        ? "audio"
        : "typed",
    is_favorite: false,
  };
}

function patchToBackend(
  patch: Partial<Entry>,
): JournalUpdatePayload {
  const result: JournalUpdatePayload = {};

  if (patch.title !== undefined) {
    result.title = patch.title;
  }

  if (patch.body !== undefined) {
    result.original_text = patch.body;
  }

  if (patch.mood !== undefined) {
    result.mood_label =
      frontendMoodToBackend(patch.mood);

    result.mood_score =
      moodMeta(patch.mood).score * 2;
  }

  if (patch.favorite !== undefined) {
    result.is_favorite = patch.favorite;
  }

  if (patch.summary !== undefined) {
    result.mood_summary = patch.summary;
  }

  if (patch.reflection !== undefined) {
    result.reflection_questions =
      patch.reflection
        ? [patch.reflection]
        : [];
  }

  if (patch.source !== undefined) {
    result.entry_source =
      patch.source === "voice"
        ? "audio"
        : "typed";
  }

  return result;
}

export function useEntries() {
  const [entries, setEntries] =
    useState<Entry[]>([]);

  const [hydrated, setHydrated] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated()) {
      setEntries([]);
      setHydrated(true);
      return;
    }

    try {
      setError(null);

      const journals =
        await listJournals();

      setEntries(
        journals.map(backendToEntry),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load journals.",
      );
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (
      entry: Omit<
        Entry,
        "id" | "createdAt" | "favorite"
      >,
    ): Promise<Entry> => {
      const created =
        await createJournal(
          entryToCreatePayload(entry),
        );

      const mapped =
        backendToEntry(created);

      setEntries((previous) => [
        mapped,
        ...previous,
      ]);

      return mapped;
    },
    [],
  );

  const update = useCallback(
    async (
      id: string,
      patch: Partial<Entry>,
    ): Promise<Entry> => {
      const updated =
        await updateJournal(
          id,
          patchToBackend(patch),
        );

      const mapped =
        backendToEntry(updated);

      setEntries((previous) =>
        previous.map((entry) =>
          entry.id === id
            ? mapped
            : entry,
        ),
      );

      return mapped;
    },
    [],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await deleteJournal(id);

      setEntries((previous) =>
        previous.filter(
          (entry) => entry.id !== id,
        ),
      );
    },
    [],
  );

  const clear = useCallback(async () => {
    const currentEntries = [...entries];

    await Promise.all(
      currentEntries.map((entry) =>
        deleteJournal(entry.id),
      ),
    );

    setEntries([]);
  }, [entries]);

  return {
    entries,
    add,
    update,
    remove,
    clear,
    refresh,
    hydrated,
    error,
  };
}

function read<T>(
  key: string,
  fallback: T,
): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw =
      window.localStorage.getItem(key);

    return raw
      ? (JSON.parse(raw) as T)
      : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(
  key: string,
  value: T,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    key,
    JSON.stringify(value),
  );
}

function useLocal<T>(
  key: string,
  fallback: T,
) {
  const [value, setValue] =
    useState<T>(fallback);

  const [hydrated, setHydrated] =
    useState(false);

  useEffect(() => {
    setValue(read(key, fallback));
    setHydrated(true);
  }, [key]);

  const update = useCallback(
    (
      next:
        | T
        | ((previous: T) => T),
    ) => {
      setValue((previous) => {
        const resolved =
          typeof next === "function"
            ? (
                next as (
                  value: T,
                ) => T
              )(previous)
            : next;

        write(key, resolved);

        return resolved;
      });
    },
    [key],
  );

  return {
    value,
    setValue: update,
    hydrated,
  };
}

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

export function useChat() {
  const {
    value,
    setValue,
    hydrated,
  } = useLocal<ChatMessage[]>(
    KEYS.chat,
    [],
  );

  const push = (
    role: ChatMessage["role"],
    content: string,
  ) => {
    const message: ChatMessage = {
      id: uid(),
      role,
      content,
      createdAt:
        new Date().toISOString(),
    };

    setValue((previous) => [
      ...previous,
      message,
    ]);

    return message;
  };

  return {
    messages: value,
    push,
    clear: () => setValue([]),
    hydrated,
  };
}

export function useSettings() {
  const {
    value,
    setValue,
    hydrated,
  } = useLocal<Settings>(
    KEYS.settings,
    defaultSettings,
  );

  return {
    settings: value,
    setSettings: (
      patch: Partial<Settings>,
    ) =>
      setValue((previous) => ({
        ...previous,
        ...patch,
      })),
    hydrated,
  };
}

export function wipeAllLocalData() {
  Object.values(KEYS).forEach((key) =>
    window.localStorage.removeItem(key),
  );
}

export function exportPayload(
  entries: Entry[],
) {
  return JSON.stringify(
    {
      app: "MindVault",
      exportedAt:
        new Date().toISOString(),
      entries,
    },
    null,
    2,
  );
}

export function downloadJson(
  filename: string,
  contents: string,
) {
  const blob = new Blob(
    [contents],
    {
      type: "application/json",
    },
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

const dayKey = (
  dateValue: Date | string,
) =>
  new Date(dateValue)
    .toISOString()
    .slice(0, 10);

export function computeStreak(
  entries: Entry[],
) {
  const days = new Set(
    entries.map((entry) =>
      dayKey(entry.createdAt),
    ),
  );

  let streak = 0;
  const cursor = new Date();

  if (!days.has(dayKey(cursor))) {
    cursor.setDate(
      cursor.getDate() - 1,
    );
  }

  while (days.has(dayKey(cursor))) {
    streak += 1;

    cursor.setDate(
      cursor.getDate() - 1,
    );
  }

  return streak;
}

export function entriesThisWeek(
  entries: Entry[],
) {
  const weekAgo =
    Date.now() - 7 * 864e5;

  return entries.filter(
    (entry) =>
      new Date(
        entry.createdAt,
      ).getTime() >= weekAgo,
  ).length;
}

export function weeklyMoodSeries(
  entries: Entry[],
) {
  return Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date();

      date.setDate(
        date.getDate() -
          (6 - index),
      );

      const key = dayKey(date);

      const dayEntries =
        entries.filter(
          (entry) =>
            dayKey(
              entry.createdAt,
            ) === key,
        );

      const average =
        dayEntries.length
          ? dayEntries.reduce(
              (sum, entry) =>
                sum +
                moodMeta(
                  entry.mood,
                ).score,
              0,
            ) /
            dayEntries.length
          : 0;

      return {
        day: date.toLocaleDateString(
          undefined,
          {
            weekday: "short",
          },
        ),
        mood:
          Number(
            average.toFixed(2),
          ),
        entries:
          dayEntries.length,
      };
    },
  );
}

export function monthlyMoodSeries(
  entries: Entry[],
) {
  return Array.from(
    { length: 30 },
    (_, index) => {
      const date = new Date();

      date.setDate(
        date.getDate() -
          (29 - index),
      );

      const key = dayKey(date);

      const dayEntries =
        entries.filter(
          (entry) =>
            dayKey(
              entry.createdAt,
            ) === key,
        );

      const average =
        dayEntries.length
          ? dayEntries.reduce(
              (sum, entry) =>
                sum +
                moodMeta(
                  entry.mood,
                ).score,
              0,
            ) /
            dayEntries.length
          : 0;

      return {
        day:
          date.getDate().toString(),
        mood:
          Number(
            average.toFixed(2),
          ),
      };
    },
  );
}

export function topEmotions(
  entries: Entry[],
) {
  const counts =
    new Map<string, number>();

  entries.forEach((entry) =>
    entry.emotions.forEach(
      (emotion) =>
        counts.set(
          emotion,
          (counts.get(emotion) ??
            0) + 1,
        ),
    ),
  );

  return [...counts.entries()]
    .sort(
      (first, second) =>
        second[1] - first[1],
    )
    .slice(0, 6)
    .map(
      ([emotion, count]) => ({
        emotion,
        count,
      }),
    );
}

export function streakCalendar(
  entries: Entry[],
) {
  const days = new Set(
    entries.map((entry) =>
      dayKey(entry.createdAt),
    ),
  );

  return Array.from(
    { length: 35 },
    (_, index) => {
      const date = new Date();

      date.setDate(
        date.getDate() -
          (34 - index),
      );

      return {
        date,
        active:
          days.has(dayKey(date)),
      };
    },
  );
}