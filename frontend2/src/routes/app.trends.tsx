import { createFileRoute } from "@tanstack/react-router";
import { useEntries } from "@/hooks/useEntries";
import {
  emotionFrequency,
  computeStreak,
  monthlyMoodSeries,
  reflectionRate,
  streakCalendar,
  weeklyMoodSeries,
} from "@/utils/analytics";

export const Route = createFileRoute("/app/trends")({
  head: () => ({
    meta: [
      { title: "Mood Trends — MindVault" },
      {
        name: "description",
        content: "Weekly and monthly mood trends, common emotions and your journal streak — all computed locally.",
      },
      { property: "og:title", content: "Mood Trends — MindVault" },
      { property: "og:description", content: "Local analytics from your own journal entries." },
    ],
  }),
  component: TrendsPage,
});

function TrendsPage() {
  const { entries } = useEntries();
  const weekly = weeklyMoodSeries(entries);
  const monthly = monthlyMoodSeries(entries);
  const emotions = emotionFrequency(entries);
  const calendar = streakCalendar(entries);
  const maxEmotion = Math.max(1, ...emotions.map((e) => e.count));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Mood trends</h1>
        <p className="text-sm text-muted-foreground">
          Calculated on this device from your own entries. Nothing is sent anywhere.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-semibold">Weekly mood</h2>
          <div className="mt-6 flex h-44 items-end gap-3">
            {weekly.map((point) => (
              <div key={point.day} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-xl bg-primary/70"
                  style={{ height: `${((point.mood ?? 0) / 5) * 100}%`, minHeight: point.mood ? 8 : 3 }}
                />
                <span className="text-[11px] text-muted-foreground">{point.day}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-semibold">Monthly trend</h2>
          <div className="mt-6 flex h-44 items-end gap-[3px]">
            {monthly.map((point) => (
              <div
                key={point.day}
                title={`${point.day}: ${point.mood ? point.mood.toFixed(1) : "no entry"}`}
                className="flex-1 rounded-t bg-teal/70"
                style={{ height: `${((point.mood ?? 0) / 5) * 100}%`, minHeight: point.mood ? 6 : 2 }}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Last 30 days</p>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-semibold">Most common emotions</h2>
          {emotions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Tag a few entries to see patterns.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {emotions.map((item) => (
                <li key={item.emotion} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs capitalize text-muted-foreground">
                    {item.emotion}
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${(item.count / maxEmotion) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 text-right text-xs text-muted-foreground">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-semibold">Streak calendar</h2>
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {calendar.map((cell) => (
              <span
                key={cell.key}
                title={cell.label}
                className={`aspect-square rounded-lg ${cell.active ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
              <p className="text-xs text-muted-foreground">Current streak</p>
              <p className="font-display text-xl font-semibold">{computeStreak(entries)} days</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
              <p className="text-xs text-muted-foreground">Reflection frequency</p>
              <p className="font-display text-xl font-semibold">{reflectionRate(entries)}%</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
