/**
 * Local-only journal storage. Everything lives in this browser's localStorage —
 * no cloud database, no analytics, no third-party services.
 */

export const MOODS = [
  { value: 1, label: "Low", emoji: "😔" },
  { value: 2, label: "Down", emoji: "😕" },
  { value: 3, label: "Okay", emoji: "😐" },
  { value: 4, label: "Good", emoji: "🙂" },
  { value: 5, label: "Great", emoji: "😄" },
] as const;

export const EMOTIONS = [
  "grateful",
  "calm",
  "hopeful",
  "tired",
  "anxious",
  "overwhelmed",
  "lonely",
  "motivated",
  "proud",
  "frustrated",
  "content",
  "restless",
];

export interface AiArtifact {
  text: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  text: string;
  mood: number;
  emotions: string[];
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
  source: "text" | "voice";
  reflection?: AiArtifact;
  summary?: AiArtifact;
}

const ENTRIES_KEY = "mindvault.entries.v1";
const SETTINGS_KEY = "mindvault.settings.v1";
const EVENT = "mindvault:entries-changed";

export interface AppSettings {
  theme: "dark" | "light";
  gentleReminders: boolean;
  typingAnimation: boolean;
}

export const defaultSettings: AppSettings = {
  theme: "dark",
  gentleReminders: false,
  typingAnimation: true,
};

const isBrowser = () => typeof window !== "undefined";

export function loadEntries(): JournalEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as JournalEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

function persist(entries: JournalEntry[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeEntries(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function createId(): string {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID();
  return `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function saveEntry(
  input: Omit<Partial<JournalEntry>, "id"> & { id?: string; text: string },
): JournalEntry {
  const entries = loadEntries();
  const now = new Date().toISOString();
  const existing = input.id ? entries.find((e) => e.id === input.id) : undefined;

  const entry: JournalEntry = {
    id: existing?.id ?? input.id ?? createId(),
    title: (input.title ?? existing?.title ?? "").trim() || defaultTitle(input.text, now),
    text: input.text,
    mood: input.mood ?? existing?.mood ?? 3,
    emotions: input.emotions ?? existing?.emotions ?? [],
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
    favorite: input.favorite ?? existing?.favorite ?? false,
    source: input.source ?? existing?.source ?? "text",
    reflection: input.reflection ?? existing?.reflection,
    summary: input.summary ?? existing?.summary,
  };

  const next = existing
    ? entries.map((e) => (e.id === entry.id ? entry : e))
    : [entry, ...entries];

  persist(next);
  return entry;
}

function defaultTitle(text: string, iso: string) {
  const firstLine = text.trim().split("\n")[0]?.slice(0, 48).trim();
  if (firstLine) return firstLine;
  return `Entry · ${new Date(iso).toLocaleDateString()}`;
}

export function getEntry(id: string): JournalEntry | undefined {
  return loadEntries().find((e) => e.id === id);
}

export function updateEntry(id: string, patch: Partial<JournalEntry>): JournalEntry | undefined {
  const entries = loadEntries();
  const target = entries.find((e) => e.id === id);
  if (!target) return undefined;
  const updated = { ...target, ...patch, id: target.id, updatedAt: new Date().toISOString() };
  persist(entries.map((e) => (e.id === id ? updated : e)));
  return updated;
}

export function deleteEntry(id: string) {
  persist(loadEntries().filter((e) => e.id !== id));
}

export function deleteAllEntries() {
  persist([]);
}

export function clearAiMemory() {
  persist(
    loadEntries().map((entry) => ({
      ...entry,
      reflection: undefined,
      summary: undefined,
    })),
  );
}

export function exportData(): string {
  return JSON.stringify(
    {
      app: "MindVault",
      exportedAt: new Date().toISOString(),
      storage: "local-device",
      entries: loadEntries(),
    },
    null,
    2,
  );
}

export function loadSettings(): AppSettings {
  if (!isBrowser()) return defaultSettings;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...(JSON.parse(raw) as Partial<AppSettings>) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
