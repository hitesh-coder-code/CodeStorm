import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Mic, PenLine } from "lucide-react";
import { moodMeta, useEntries } from "@/lib/mindvault";
import { useJournalSearch } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/app/journal")({
  head: () => ({
    meta: [
      { title: "Journal History — MindVault" },
      {
        name: "description",
        content: "Browse every journal entry saved on this device, with moods and AI reflections.",
      },
      { property: "og:title", content: "Journal History — MindVault" },
      { property: "og:description", content: "All of your entries, stored locally and never synced." },
    ],
  }),
  component: JournalHistory,
});

function JournalHistory() {
  const { entries, hydrated } = useEntries();
  const search = useJournalSearch().toLowerCase();

  const filtered = entries.filter(
    (e) =>
      !search ||
      e.title.toLowerCase().includes(search) ||
      e.body.toLowerCase().includes(search),
  );

  if (!hydrated) {
    return (
      <div className="mx-auto grid max-w-4xl gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Journal History</h1>
        <p className="text-sm text-muted-foreground">
          {entries.length} entries · stored only on this device
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="rounded-full">
          <TabsTrigger value="all" className="rounded-full">
            All
          </TabsTrigger>
          <TabsTrigger value="favorites" className="rounded-full">
            Favorites
          </TabsTrigger>
          <TabsTrigger value="voice" className="rounded-full">
            Voice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <EntryList entries={filtered} />
        </TabsContent>
        <TabsContent value="favorites" className="mt-4">
          <EntryList entries={filtered.filter((e) => e.favorite)} kind="favorites" />
        </TabsContent>
        <TabsContent value="voice" className="mt-4">
          <EntryList entries={filtered.filter((e) => e.source === "voice")} kind="recordings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EntryList({
  entries,
  kind = "entries",
}: {
  entries: ReturnType<typeof useEntries>["entries"];
  kind?: string;
}) {
  if (!entries.length) {
    return (
      <EmptyState
        title={`No ${kind} yet`}
        description="When you write or record something, it will appear here — and nowhere else."
        actionLabel="Start journaling"
        actionTo="/app/voice"
      />
    );
  }

  return (
    <ul className="grid gap-3">
      {entries.map((e) => (
        <li key={e.id} className="animate-rise">
          <Link
            to="/app/entry/$id"
            params={{ id: e.id }}
            className="glass grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-3xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow"
          >
            <span className="text-2xl" aria-hidden>
              {moodMeta(e.mood).emoji}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{e.title}</span>
              <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                {e.body}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {new Date(e.createdAt).toLocaleString()}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
              {e.favorite && <Heart className="size-4 fill-current text-primary" aria-hidden />}
              {e.source === "voice" ? (
                <Mic className="size-4" aria-hidden />
              ) : (
                <PenLine className="size-4" aria-hidden />
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
