import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, CalendarDays, ShieldCheck, Sparkles, Mic, PenLine } from "lucide-react";
import {
  MOODS,
  computeStreak,
  entriesThisWeek,
  moodMeta,
  useEntries,
  weeklyMoodSeries,
  type Mood,
} from "@/lib/mindvault";

import { PrivacyBadges } from "@/components/privacy";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { detectEmotions, insight, reflect } from "@/lib/on-device-ai";
import { generateAIReflection } from "@/lib/api";
export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — MindVault" },
      {
        name: "description",
        content: "Your mood, streak and weekly journaling activity — stored only on this device.",
      },
      { property: "og:title", content: "Dashboard — MindVault" },
      { property: "og:description", content: "Private journaling dashboard with on-device insights." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { entries, add, hydrated } = useEntries();

  const streak = computeStreak(entries);
  const week = entriesThisWeek(entries);
  const today = entries.find(
    (e) => new Date(e.createdAt).toDateString() === new Date().toDateString(),
  );
  const series = weeklyMoodSeries(entries);

  const logMood = async (mood: Mood) => {
  const body =
    `Quick mood check-in: feeling ${
      moodMeta(mood).label.toLowerCase()
    }.`;

  let reflectionText = reflect(body, mood);

  try {
    const aiResponse =
      await generateAIReflection(
        body,
        mood,
      );

    reflectionText =
      aiResponse.reflection;
  } catch (error) {
    console.error(
      "Gemma reflection failed:",
      error,
    );
  }

  try {
    await add({
      title:
        `Mood check-in · ${
          moodMeta(mood).label
        }`,
      body,
      mood,
      source: "text",
      emotions:
        detectEmotions(body),
      summary: body,
      reflection:
        reflectionText,
    });

    toast.success(
      "Mood saved with Gemma reflection",
      {
        description:
          reflectionText,
      },
    );
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "Unable to save mood.",
    );
  }
};

  if (!hydrated) {
    return (
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
        <Skeleton className="h-64 rounded-3xl sm:col-span-2 lg:col-span-4" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Mood"
          value={today ? `${moodMeta(today.mood).emoji} ${moodMeta(today.mood).label}` : "Not set"}
          hint={today ? "Logged today" : "Tap a mood below"}
        />
        <StatCard
          icon={<Flame className="size-4 text-teal" aria-hidden />}
          label="Journal Streak"
          value={`${streak} ${streak === 1 ? "day" : "days"}`}
          hint="Keep it gentle, not perfect"
        />
        <StatCard
          icon={<CalendarDays className="size-4 text-teal" aria-hidden />}
          label="Entries This Week"
          value={String(week)}
          hint={`${entries.length} total on this device`}
        />
        <StatCard
          icon={<ShieldCheck className="size-4 text-teal" aria-hidden />}
          label="Privacy Status"
          value="Always Local"
          hint="0 bytes sent to any server"
        />
      </div>

      <section className="glass animate-rise rounded-3xl p-6">
        <h2 className="text-lg font-semibold">How are you feeling right now?</h2>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {MOODS.map((m) => (
            <button
              key={m.id}
              onClick={() => logMood(m.id)}
              className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:-translate-y-1 hover:shadow-glow"
            >
              <span className="text-xl" aria-hidden>
                {m.emoji}
              </span>
              {m.label}
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild className="rounded-full">
            <Link to="/app/voice">
              <Mic className="size-4" aria-hidden />
              Voice entry
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full bg-transparent">
            <Link to="/app/reflections">
              <Sparkles className="size-4" aria-hidden />
              Talk it through
            </Link>
          </Button>
        </div>
      </section>

      <section className="glass rounded-3xl p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate text-lg font-semibold">This week</h2>
          <Link to="/app/moods" className="shrink-0 text-sm text-primary hover:underline">
            Mood trends
          </Link>
        </div>
        <div className="mt-4 h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: -24, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis domain={[0, 5]} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 16,
                  color: "var(--color-popover-foreground)",
                }}
              />
              <Area
                type="monotone"
                dataKey="mood"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                fill="url(#moodFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate text-lg font-semibold">Recent entries</h2>
          <Link to="/app/journal" className="shrink-0 text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {entries.length === 0 ? (
          <EmptyState
            title="No journal entries yet"
            description="Your first entry is always the hardest. One sentence counts."
            actionLabel="Write your first entry"
            actionTo="/app/voice"
          />
        ) : (
          <ul className="grid gap-3">
            {entries.slice(0, 3).map((e) => (
              <li key={e.id}>
                <Link
                  to="/app/entry/$id"
                  params={{ id: e.id }}
                  className="glass grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-3xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <span className="text-2xl" aria-hidden>
                    {moodMeta(e.mood).emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{e.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString()} · {e.emotions.join(", ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PrivacyBadges />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="glass animate-rise rounded-3xl p-5 transition-transform duration-300 hover:-translate-y-1">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon ?? <PenLine className="size-4 text-teal" aria-hidden />}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-3 truncate text-2xl font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
