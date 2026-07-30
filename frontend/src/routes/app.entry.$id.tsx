import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Download, Heart, Pencil, Save, Trash2 } from "lucide-react";
import { moodMeta, useEntries, downloadJson } from "@/lib/mindvault";
import { insight, reflectionPrompts, summarize, reflect } from "@/lib/on-device-ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/entry/$id")({
  head: () => ({
    meta: [
      { title: "Journal Entry — MindVault" },
      {
        name: "description",
        content: "Read your entry with its on-device AI summary, reflection prompts and key emotions.",
      },
      { property: "og:title", content: "Journal Entry — MindVault" },
      { property: "og:description", content: "A private entry, summarised locally by on-device AI." },
    ],
  }),
  component: EntryDetail,
});

function EntryDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { entries, update, remove, hydrated } = useEntries();
  const entry = entries.find((e) => e.id === id);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  if (!hydrated) return <div className="mx-auto h-64 max-w-3xl animate-pulse rounded-3xl bg-muted" />;

  if (!entry) {
    return (
      <div className="glass mx-auto max-w-md rounded-3xl p-8 text-center">
        <h1 className="text-lg font-semibold">Entry not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been deleted from this device.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/app/journal">Back to journal</Link>
        </Button>
      </div>
    );
  }

  const startEdit = () => {
    setDraftTitle(entry.title);
    setDraftBody(entry.body);
    setEditing(true);
  };

  const save = () => {
    update(entry.id, {
      title: draftTitle,
      body: draftBody,
      summary: summarize(draftBody),
      reflection: reflect(draftBody, entry.mood),
    });
    setEditing(false);
    toast.success("Entry updated locally");
  };

  return (
    <article className="mx-auto max-w-3xl space-y-5">
      <Button asChild variant="ghost" className="rounded-full">
        <Link to="/app/journal">
          <ArrowLeft className="size-4" aria-hidden />
          Journal
        </Link>
      </Button>

      <div className="glass animate-rise rounded-3xl p-6 sm:p-8">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
          <span className="text-4xl" aria-hidden>
            {moodMeta(entry.mood).emoji}
          </span>
          <div className="min-w-0">
            {editing ? (
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="rounded-2xl text-lg"
                aria-label="Entry title"
              />
            ) : (
              <h1 className="text-2xl font-semibold leading-tight">{entry.title}</h1>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(entry.createdAt).toLocaleString()} · {moodMeta(entry.mood).label} ·{" "}
              {entry.source === "voice" ? "Voice note" : "Written"}
            </p>
          </div>
        </div>

        <div className="mt-6">
          {editing ? (
            <Textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={10}
              className="rounded-2xl"
              aria-label="Entry text"
            />
          ) : (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
              {entry.body}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {editing ? (
            <Button onClick={save} className="rounded-full">
              <Save className="size-4" aria-hidden />
              Save
            </Button>
          ) : (
            <Button onClick={startEdit} variant="outline" className="rounded-full bg-transparent">
              <Pencil className="size-4" aria-hidden />
              Edit
            </Button>
          )}
          <Button
            variant="outline"
            className="rounded-full bg-transparent"
            onClick={() => {
              update(entry.id, { favorite: !entry.favorite });
              toast.success(entry.favorite ? "Removed from favorites" : "Added to favorites");
            }}
          >
            <Heart className={`size-4 ${entry.favorite ? "fill-current text-primary" : ""}`} aria-hidden />
            Favorite
          </Button>
          <Button
            variant="outline"
            className="rounded-full bg-transparent"
            onClick={() => downloadJson(`mindvault-entry-${entry.id}.json`, JSON.stringify(entry, null, 2))}
          >
            <Download className="size-4" aria-hidden />
            Export
          </Button>
          <Button
            variant="ghost"
            className="rounded-full text-destructive hover:text-destructive"
            onClick={() => {
              remove(entry.id);
              toast.success("Entry deleted from this device");
              navigate({ to: "/app/journal" });
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="glass rounded-3xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            AI Summary
          </h2>
          <p className="mt-3 text-sm leading-relaxed">
            {entry.summary ?? summarize(entry.body)}
          </p>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Key Emotions
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {entry.emotions.map((em) => (
              <Badge key={em} variant="secondary" className="rounded-full px-3 py-1 capitalize">
                {em}
              </Badge>
            ))}
          </div>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Reflection Prompts
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {reflectionPrompts(entry.body).map((p) => (
              <li key={p} className="glass rounded-2xl px-4 py-2.5">
                {p}
              </li>
            ))}
          </ul>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Personal Insight
          </h2>
          <p className="mt-3 text-sm leading-relaxed">{insight(entry.body, entry.mood)}</p>
          {entry.reflection && (
            <p className="mt-3 border-l-2 border-primary/50 pl-3 text-sm italic text-muted-foreground">
              {entry.reflection}
            </p>
          )}
        </section>
      </div>
    </article>
  );
}
