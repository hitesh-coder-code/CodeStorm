import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  computeStreak,
  monthlyMoodSeries,
  streakCalendar,
  topEmotions,
  useEntries,
  weeklyMoodSeries,
} from "@/lib/mindvault";
import { EmptyState } from "@/components/empty-state";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/moods")({
  head: () => ({
    meta: [
      { title: "Mood Trends — MindVault" },
      {
        name: "description",
        content: "Weekly and monthly mood charts, common emotions and your journaling streak — computed locally.",
      },
      { property: "og:title", content: "Mood Trends — MindVault" },
      { property: "og:description", content: "See how your weeks actually felt, with analytics that never leave your device." },
    ],
  }),
  component: MoodAnalytics,
});

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  color: "var(--color-popover-foreground)",
};

function MoodAnalytics() {
  const { entries, hydrated } = useEntries();

  if (!hydrated) {
    return (
      <div className="mx-auto grid max-w-5xl gap-4">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="No mood data yet"
          description="Log a mood or write an entry and your trends will start to take shape here."
          actionLabel="Log your first mood"
          actionTo="/app"
        />
      </div>
    );
  }

  const weekly = weeklyMoodSeries(entries);
  const monthly = monthlyMoodSeries(entries);
  const emotions = topEmotions(entries);
  const maxEmotion = emotions[0]?.count ?? 1;
  const calendar = streakCalendar(entries);
  const streak = computeStreak(entries);
  const reflections = entries.filter((e) => e.reflection).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Mood Trends</h1>
        <p className="text-sm text-muted-foreground">
          Computed on this device from {entries.length} entries.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass animate-rise rounded-3xl p-6">
          <h2 className="text-base font-semibold">Weekly mood</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ left: -24, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis domain={[0, 5]} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ opacity: 0.08 }} />
                <Bar dataKey="mood" fill="var(--color-chart-1)" radius={[10, 10, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass animate-rise rounded-3xl p-6">
          <h2 className="text-base font-semibold">Monthly trend</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ left: -24, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} interval={4} />
                <YAxis domain={[0, 5]} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="text-base font-semibold">Most common emotions</h2>
          <ul className="mt-4 space-y-3">
            {emotions.map((e) => (
              <li key={e.emotion}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
                  <span className="truncate capitalize">{e.emotion}</span>
                  <span className="shrink-0 text-muted-foreground">{e.count}</span>
                </div>
                <Progress value={(e.count / maxEmotion) * 100} className="mt-1.5 h-2" />
              </li>
            ))}
          </ul>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="text-base font-semibold">Streak calendar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {streak}-day streak · {reflections} reflections generated
          </p>
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {calendar.map(({ date, active }) => (
              <span
                key={date.toISOString()}
                title={date.toLocaleDateString()}
                className={`aspect-square rounded-lg transition-colors ${
                  active ? "brand-surface" : "bg-muted/60"
                }`}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
