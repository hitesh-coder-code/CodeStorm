import { MOODS, type JournalEntry } from "@/store/journal";

/**
 * Local memory summary: computed on-device from recent entries.
 * No AI call and no history upload — we only send a short digest to the backend.
 */
export function buildMemorySummary(entries: JournalEntry[]): string {
  const recent = entries.slice(0, 7);
  if (recent.length === 0) return "This is the user's first journal entry in MindVault.";

  const avgMood = recent.reduce((sum, e) => sum + e.mood, 0) / recent.length;
  const moodLabel = MOODS.find((m) => m.value === Math.round(avgMood))?.label.toLowerCase() ?? "mixed";

  const counts = new Map<string, number>();
  recent.forEach((e) => e.emotions.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
  const topEmotions = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  const parts = [
    `Over the last ${recent.length} ${recent.length === 1 ? "entry" : "entries"} the user's mood has generally been ${moodLabel}.`,
  ];
  if (topEmotions.length) {
    parts.push(`Recurring feelings: ${topEmotions.join(", ")}.`);
  }
  const themes = extractThemes(recent);
  if (themes.length) {
    parts.push(`Frequent themes: ${themes.join(", ")}.`);
  }
  return parts.join(" ");
}

const STOPWORDS = new Set(
  `the a an and or but i me my we you he she it they them was were is are be been being to of in on at for with about from that this these those so very really just today yesterday tomorrow had have has did do does not no yes if then than as by out up down over under again more most some any because while when what which who how too much many feel felt feeling`.split(
    /\s+/,
  ),
);

function extractThemes(entries: JournalEntry[]): string[] {
  const counts = new Map<string, number>();
  entries.forEach((entry) => {
    const words = entry.text.toLowerCase().match(/[a-z']{4,}/g) ?? [];
    new Set(words).forEach((word) => {
      if (STOPWORDS.has(word)) return;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    });
  });
  return [...counts.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
}

/** The most recent entries (excluding the one being reflected on). */
export function recentEntryTexts(entries: JournalEntry[], excludeId?: string, limit = 3): string[] {
  return entries
    .filter((e) => e.id !== excludeId)
    .slice(0, limit)
    .map((e) => e.text.trim())
    .filter(Boolean);
}
