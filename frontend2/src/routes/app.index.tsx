import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Flame, ShieldCheck, Sparkle } from "lucide-react";
import { useEntries } from "@/hooks/useEntries";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { PrivacyBanner } from "@/components/PrivacyBanner";
import {
  computeStreak,
  entriesThisWeek,
  formatDateTime,
  moodMeta,
  weeklyMoodSeries,
} from "@/utils/analytics";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — MindVault" },
      {
        name: "description",
        content: "Your MindVault dashboard: today's mood, journal streak, weekly entries and local AI status.",
      },
      { property: "og:title", content: "Dashboard — MindVault" },
      { property: "og:description", content: "Mood, streaks and local AI status at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { entries } = useEntries();
  const { state, info } = useBackendHealth();

  const today = entries.find(
    (e) => new Date(e.createdAt).toDateString() === new Date().toDateString(),
  );
  const streak = computeStreak(entries);
  const week = entriesThisWeek(entries);
  const series = weeklyMoodSeries(entries);

  const cards = [
    {
      label: "Today's Mood",
      value: today ? `${moodMeta(today.mood).emoji} ${moodMeta(today.mood).label}` : "Not logged",
      hint: today ? "Logged today" : "Write an entry to log it",
    },
    { label: "Journal Streak", value: `${streak} ${streak === 1 ? "day" : "days"}`, hint: "Consecutive days" },
    { label: "Entries This Week", value: `${week}`, hint: "Last 7 days" },
    {
      label: "Privacy Status",
      value: state === "online" ? "Local Mode Active" : state === "checking" ? "Checking…" : "Local only",
      hint: info?.model ? `${info.model} · ${info.runtime}` : "Journaling works offline",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="glass rounded-3xl p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">This week</h2>
            <Link to="/app/trends" className="text-xs text-primary hover:underline">
              Mood trends
            </Link>
          </div>
          <div className="mt-6 flex h-40 items-end gap-3">
            {series.map((point) => (
              <div key={point.day} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-xl bg-primary/70 transition-all"
                  style={{ height: `${((point.mood ?? 0) / 5) * 100}%`, minHeight: point.mood ? 8 : 3 }}
                  title={point.mood ? `${point.mood.toFixed(1)} / 5` : "No entry"}
                />
                <span className="text-[11px] text-muted-foreground">{point.day}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="font-display text-xl font-semibold">Quick actions</h2>
          <div className="mt-4 grid gap-3">
            <Link
              to="/app/journal"
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 text-sm transition-colors hover:bg-card"
            >
              <BookOpen className="size-4 text-primary" /> Write a new entry
            </Link>
            <Link
              to="/app/reflections"
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 text-sm transition-colors hover:bg-card"
            >
              <Sparkle className="size-4 text-primary" /> Talk with your local companion
            </Link>
            <Link
              to="/app/trends"
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 text-sm transition-colors hover:bg-card"
            >
              <Flame className="size-4 text-primary" /> Review your streak
            </Link>
            <Link
              to="/privacy"
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 text-sm transition-colors hover:bg-card"
            >
              <ShieldCheck className="size-4 text-primary" /> How privacy works
            </Link>
          </div>
        </section>
      </div>

      <section className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Recent entries</h2>
          <Link to="/app/history" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
        {entries.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No entries yet. Your first one is waiting.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {entries.slice(0, 4).map((entry) => (
              <li key={entry.id}>
                <Link
                  to="/app/entry/$id"
                  params={{ id: entry.id }}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 transition-colors hover:bg-card"
                >
                  <span className="text-xl" aria-hidden>
                    {moodMeta(entry.mood).emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{entry.text}</p>
                  </div>
                  <time className="shrink-0 text-[11px] text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PrivacyBanner />
    </div>
  );
}
