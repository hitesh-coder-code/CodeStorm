import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useEntries } from "@/hooks/useEntries";
import { formatDateTime, moodMeta } from "@/utils/analytics";

export const Route = createFileRoute("/app/history")({
  head: () => ({
    meta: [
      { title: "Journal History — MindVault" },
      {
        name: "description",
        content: "Browse and search every journal entry stored locally on this device.",
      },
      { property: "og:title", content: "Journal History — MindVault" },
      { property: "og:description", content: "Every entry you've written, stored only on this device." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { entries } = useEntries();
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (onlyFavorites && !entry.favorite) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.text.toLowerCase().includes(q) ||
        entry.emotions.some((tag) => tag.includes(q))
      );
    });
  }, [entries, query, onlyFavorites]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold">Journal history</h1>
        <span className="rounded-full border border-border/70 bg-card/50 px-3 py-1 text-xs text-muted-foreground">
          {entries.length} stored locally
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="relative flex min-w-56 flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your entries"
            className="h-11 w-full rounded-2xl border border-border/70 bg-card/50 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
          />
        </label>
        <button
          type="button"
          onClick={() => setOnlyFavorites((v) => !v)}
          className={`flex items-center gap-2 rounded-2xl border px-4 text-sm transition-colors ${
            onlyFavorites ? "border-primary/60 bg-primary/15" : "border-border/70 bg-card/50"
          }`}
        >
          <Heart className="size-4" /> Favorites
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
          Nothing here yet.{" "}
          <Link to="/app/journal" className="text-primary hover:underline">
            Write your first entry
          </Link>
          .
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <Link
                to="/app/entry/$id"
                params={{ id: entry.id }}
                className="glass flex h-full flex-col rounded-3xl p-5 transition-transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xl" aria-hidden>
                    {moodMeta(entry.mood).emoji}
                  </span>
                  <time className="text-[11px] text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </time>
                </div>
                <p className="mt-3 line-clamp-1 text-sm font-medium">{entry.title}</p>
                <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{entry.text}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {entry.emotions.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] capitalize text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                  {entry.reflection && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                      reflected
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
