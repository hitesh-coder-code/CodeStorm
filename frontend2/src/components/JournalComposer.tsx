import { useNavigate } from "@tanstack/react-router";
import { FileText, Save, Sparkle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MoodPicker, EmotionTags } from "@/components/MoodPicker";
import { AiErrorCard, AiLoadingCard, ReflectionCard } from "@/components/ReflectionCard";
import { useEntries } from "@/hooks/useEntries";
import { useSettings } from "@/hooks/useSettings";
import { describeApiError, generateReflection, generateSummary } from "@/services/api";
import { EMOTIONS, loadEntries, saveEntry, updateEntry, type JournalEntry } from "@/store/journal";
import { buildMemorySummary, recentEntryTexts } from "@/utils/memory";

const SUGGESTED_PROMPTS = [
  "How are you feeling today?",
  "What made you smile today?",
  "What's stressing you lately?",
  "What's something you're grateful for?",
];

export function JournalComposer({
  initial,
  source = "text",
  heading = "New entry",
}: {
  initial?: Partial<JournalEntry>;
  source?: "text" | "voice";
  heading?: string;
}) {
  const navigate = useNavigate();
  const { entries } = useEntries();
  const { settings } = useSettings();

  const [entryId, setEntryId] = useState<string | undefined>(initial?.id);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [text, setText] = useState(initial?.text ?? "");
  const [mood, setMood] = useState(initial?.mood ?? 3);
  const [emotions, setEmotions] = useState<string[]>(initial?.emotions ?? []);

  const [reflection, setReflection] = useState(initial?.reflection?.text ?? "");
  const [summary, setSummary] = useState(initial?.summary?.text ?? "");
  const [busy, setBusy] = useState<null | "reflect" | "summarize">(null);
  const [error, setError] = useState<{ message: string; retry: "reflect" | "summarize" } | null>(null);

  const persistLocally = () => {
    const saved = saveEntry({
      id: entryId,
      title,
      text: text.trim(),
      mood,
      emotions,
      source,
      createdAt: initial?.createdAt,
    });
    setEntryId(saved.id);
    setTitle(saved.title);
    return saved;
  };

  const handleSave = () => {
    if (!text.trim()) {
      toast.error("Write a little something first.");
      return;
    }
    const saved = persistLocally();
    toast.success("Saved on this device.");
    return saved;
  };

  const handleReflect = async () => {
    if (!text.trim()) {
      toast.error("Write a little something first.");
      return;
    }
    // Always save locally FIRST — the entry survives any AI failure.
    const saved = persistLocally();
    setError(null);
    setBusy("reflect");
    try {
      const all = loadEntries();
      const response = await generateReflection({
        entry: saved.text,
        memory_summary: buildMemorySummary(all.filter((e) => e.id !== saved.id)),
        recent_entries: recentEntryTexts(all, saved.id, 3),
      });
      setReflection(response.reflection);
      updateEntry(saved.id, {
        reflection: { text: response.reflection, createdAt: new Date().toISOString() },
      });
    } catch (err) {
      setError({ message: describeApiError(err), retry: "reflect" });
    } finally {
      setBusy(null);
    }
  };

  const handleSummarize = async () => {
    const saved = text.trim() ? persistLocally() : undefined;
    setError(null);
    setBusy("summarize");
    try {
      const all = loadEntries();
      const texts = all
        .slice(0, 12)
        .map((e) => e.text.trim())
        .filter(Boolean);
      if (!texts.length) {
        toast.error("No entries to summarize yet.");
        setBusy(null);
        return;
      }
      const response = await generateSummary({ entries: texts });
      setSummary(response.summary);
      if (saved) {
        updateEntry(saved.id, {
          summary: { text: response.summary, createdAt: new Date().toISOString() },
        });
      }
    } catch (err) {
      setError({ message: describeApiError(err), retry: "summarize" });
    } finally {
      setBusy(null);
    }
  };

  const toggleEmotion = (tag: string) =>
    setEmotions((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="glass rounded-3xl p-5 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-2xl font-semibold">{heading}</h1>
          <time className="text-xs text-muted-foreground">
            {new Date(initial?.createdAt ?? Date.now()).toLocaleString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
        </div>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Entry title (optional)"
          className="mt-5 w-full rounded-2xl border border-border/70 bg-card/50 px-4 py-3 text-base outline-none transition-colors focus:border-primary/60"
        />

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={12}
          placeholder="Let it out. Nothing here leaves your device."
          className="mt-3 w-full resize-y rounded-2xl border border-border/70 bg-card/50 px-4 py-3 text-sm leading-relaxed outline-none transition-colors focus:border-primary/60"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setText((prev) => (prev ? `${prev}\n\n${prompt}\n` : `${prompt}\n`))}
              className="rounded-full border border-border/70 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>

        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">Mood</p>
        <MoodPicker value={mood} onChange={setMood} className="mt-2" />

        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Emotion tags
        </p>
        <EmotionTags selected={emotions} onToggle={toggleEmotion} options={EMOTIONS} className="mt-2" />

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="brand-surface inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5"
          >
            <Save className="size-4" /> Save Entry
          </button>
          <button
            type="button"
            onClick={handleReflect}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-3 text-sm font-medium transition-colors hover:bg-primary/20 disabled:opacity-60"
          >
            <Sparkle className="size-4" /> Generate Reflection
          </button>
          <button
            type="button"
            onClick={handleSummarize}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-card/50 px-5 py-3 text-sm font-medium transition-colors hover:bg-card disabled:opacity-60"
          >
            <FileText className="size-4" /> Summarize
          </button>
          {entryId && (
            <button
              type="button"
              onClick={() => navigate({ to: "/app/entry/$id", params: { id: entryId } })}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Open entry
            </button>
          )}
        </div>
      </section>

      <section className="space-y-4">
        {busy === "reflect" && <AiLoadingCard label="Your local AI companion is reflecting..." />}
        {busy === "summarize" && <AiLoadingCard label="Your local AI is summarizing your journal..." />}
        {error && (
          <AiErrorCard
            message={error.message}
            onRetry={() => (error.retry === "reflect" ? handleReflect() : handleSummarize())}
          />
        )}

        {reflection && !busy && (
          <ReflectionCard reflection={reflection} animate={settings.typingAnimation} />
        )}

        {summary && !busy && (
          <article className="glass animate-rise rounded-3xl p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">Journal summary</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {summary}
            </p>
          </article>
        )}

        {!reflection && !summary && !busy && !error && (
          <div className="rounded-3xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
            Write freely, then ask your local companion for a reflection. Entries save to this device
            first, so nothing is lost if the AI is offline.
          </div>
        )}

        <div className="rounded-3xl border border-border/60 bg-card/40 p-5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">What gets sent to your local model</p>
          <p className="mt-2">
            Only this entry, a short on-device memory summary, and your last {Math.min(3, Math.max(entries.length - 1, 0))} entries — never
            your full history, and never to the cloud.
          </p>
        </div>
      </section>
    </div>
  );
}
