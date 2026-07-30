import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, Heart, Pencil, Sparkle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { JournalComposer } from "@/components/JournalComposer";
import { AiErrorCard, AiLoadingCard, ReflectionCard } from "@/components/ReflectionCard";
import { describeApiError, generateReflection, generateSummary } from "@/services/api";
import {
  deleteEntry,
  getEntry,
  loadEntries,
  updateEntry,
  type JournalEntry,
} from "@/store/journal";
import { buildMemorySummary, recentEntryTexts } from "@/utils/memory";
import { formatDateTime, moodMeta } from "@/utils/analytics";

export const Route = createFileRoute("/app/entry/$id")({
  head: () => ({
    meta: [
      { title: "Journal Entry — MindVault" },
      {
        name: "description",
        content: "Read a saved journal entry with its mood, emotions and local AI reflection.",
      },
      { property: "og:title", content: "Journal Entry — MindVault" },
      { property: "og:description", content: "A single private entry, stored on this device." },
    ],
  }),
  component: EntryDetail,
});

function EntryDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<null | "reflect" | "summarize">(null);
  const [error, setError] = useState<{ message: string; retry: "reflect" | "summarize" } | null>(null);

  useEffect(() => {
    setEntry(getEntry(id) ?? null);
    setLoaded(true);
  }, [id]);

  if (!loaded) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  if (!entry) {
    return (
      <div className="glass mx-auto max-w-lg rounded-3xl p-8 text-center">
        <p className="text-sm text-muted-foreground">This entry isn't on this device.</p>
        <Link to="/app/history" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to history
        </Link>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            setEntry(getEntry(id) ?? null);
            setEditing(false);
          }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Done editing
        </button>
        <JournalComposer initial={entry} heading="Edit entry" source={entry.source} />
      </div>
    );
  }

  const runReflect = async () => {
    setError(null);
    setBusy("reflect");
    try {
      const all = loadEntries();
      const response = await generateReflection({
        entry: entry.text,
        memory_summary: buildMemorySummary(all.filter((e) => e.id !== entry.id)),
        recent_entries: recentEntryTexts(all, entry.id, 3),
      });
      const updated = updateEntry(entry.id, {
        reflection: { text: response.reflection, createdAt: new Date().toISOString() },
      });
      if (updated) setEntry(updated);
    } catch (err) {
      setError({ message: describeApiError(err), retry: "reflect" });
    } finally {
      setBusy(null);
    }
  };

  const runSummarize = async () => {
    setError(null);
    setBusy("summarize");
    try {
      const response = await generateSummary({ entries: [entry.text] });
      const updated = updateEntry(entry.id, {
        summary: { text: response.summary, createdAt: new Date().toISOString() },
      });
      if (updated) setEntry(updated);
    } catch (err) {
      setError({ message: describeApiError(err), retry: "summarize" });
    } finally {
      setBusy(null);
    }
  };

  const exportEntry = () => {
    const blob = new Blob([JSON.stringify(entry, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindvault-entry-${entry.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const mood = moodMeta(entry.mood);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/app/history"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Journal history
      </Link>

      <article className="glass rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl" aria-hidden>
            {mood.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold">{entry.title}</h1>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(entry.createdAt)} · Mood: {mood.label} · {entry.source === "voice" ? "Voice note" : "Written"}
            </p>
          </div>
        </div>

        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">{entry.text}</p>

        {entry.emotions.length > 0 && (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Key emotions</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {entry.emotions.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-teal/50 bg-teal/10 px-3 py-1 text-xs capitalize"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/50 px-4 py-2 text-sm hover:bg-card"
          >
            <Pencil className="size-4" /> Edit
          </button>
          <button
            type="button"
            onClick={() => {
              const updated = updateEntry(entry.id, { favorite: !entry.favorite });
              if (updated) setEntry(updated);
            }}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm ${
              entry.favorite ? "border-primary/60 bg-primary/15" : "border-border/70 bg-card/50"
            }`}
          >
            <Heart className="size-4" /> {entry.favorite ? "Favorited" : "Favorite"}
          </button>
          <button
            type="button"
            onClick={exportEntry}
            className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/50 px-4 py-2 text-sm hover:bg-card"
          >
            <Download className="size-4" /> Export
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirm("Delete this entry from this device? This cannot be undone.")) return;
              deleteEntry(entry.id);
              toast.success("Entry deleted from this device.");
              navigate({ to: "/app/history" });
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          >
            <Trash2 className="size-4" /> Delete
          </button>
        </div>
      </article>

      {busy === "reflect" && <AiLoadingCard label="Your local AI companion is reflecting..." />}
      {busy === "summarize" && <AiLoadingCard label="Your local AI is summarizing your journal..." />}
      {error && (
        <AiErrorCard
          message={error.message}
          onRetry={() => (error.retry === "reflect" ? runReflect() : runSummarize())}
        />
      )}

      {entry.summary && !busy && (
        <article className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-semibold">AI summary</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {entry.summary.text}
          </p>
        </article>
      )}

      {entry.reflection && !busy && (
        <ReflectionCard
          reflection={entry.reflection.text}
          timestamp={entry.reflection.createdAt}
          animate={false}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={runReflect}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-3 text-sm font-medium hover:bg-primary/20 disabled:opacity-60"
        >
          <Sparkle className="size-4" />
          {entry.reflection ? "Regenerate reflection" : "Generate Reflection"}
        </button>
        <button
          type="button"
          onClick={runSummarize}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-card/50 px-5 py-3 text-sm font-medium hover:bg-card disabled:opacity-60"
        >
          Summarize
        </button>
      </div>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        Personal insights are generated locally and stay on this device.
      </p>
    </div>
  );
}
