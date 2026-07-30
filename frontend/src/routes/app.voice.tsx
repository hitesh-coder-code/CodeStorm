import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square, X, Sparkles, Save, FileText } from "lucide-react";
import { MOODS, useEntries, type Mood } from "@/lib/mindvault";
import { demoTranscript, detectEmotions, reflect, summarize } from "@/lib/on-device-ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PrivacyBadges } from "@/components/privacy";
import { toast } from "sonner";

export const Route = createFileRoute("/app/voice")({
  head: () => ({
    meta: [
      { title: "Voice Notes — MindVault" },
      {
        name: "description",
        content: "Record a voice journal and transcribe it on-device. Audio and text never leave your phone.",
      },
      { property: "og:title", content: "Voice Notes — MindVault" },
      { property: "og:description", content: "On-device voice journaling with instant local transcription." },
    ],
  }),
  component: VoiceScreen,
});

const BARS = 28;

function VoiceScreen() {
  const navigate = useNavigate();
  const { add } = useEntries();
  const [state, setState] = useState<"idle" | "recording" | "paused" | "done">("idle");
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(BARS).fill(0.2));
  const [transcript, setTranscript] = useState("");
  const [mood, setMood] = useState<Mood>("okay");
  const [reflection, setReflection] = useState("");
  const [summary, setSummary] = useState("");
  const [thinking, setThinking] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state !== "recording") {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(() => {
      setSeconds((s) => s + 1);
      setLevels(Array.from({ length: BARS }, () => 0.15 + Math.random() * 0.85));
    }, 180);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [state]);

  const mmss = `${String(Math.floor(seconds / 5.5 / 60)).padStart(2, "0")}:${String(
    Math.floor(seconds / 5.5) % 60,
  ).padStart(2, "0")}`;

  const stop = () => {
    setState("done");
    setThinking(true);
    setTimeout(() => {
      setTranscript(demoTranscript(seconds));
      setThinking(false);
    }, 900);
  };

  const cancel = () => {
    setState("idle");
    setSeconds(0);
    setTranscript("");
    setReflection("");
    setSummary("");
  };

  const save = () => {
    if (!transcript.trim()) return;
    const entry = add({
      title: transcript.trim().split(/[.!?]/)[0].slice(0, 60) || "Voice note",
      body: transcript.trim(),
      mood,
      source: "voice",
      emotions: detectEmotions(transcript),
      summary: summary || summarize(transcript),
      reflection: reflection || reflect(transcript, mood),
      durationSec: Math.floor(seconds / 5.5),
    });
    toast.success("Saved to this device only");
    navigate({ to: "/app/entry/$id", params: { id: entry.id } });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Voice Journaling</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recording and transcription happen entirely on this device.
        </p>
      </div>

      <section className="glass relative overflow-hidden rounded-[2rem] px-6 py-10 text-center">
        <div className="relative mx-auto grid size-40 place-items-center">
          {state === "recording" && (
            <>
              <span className="brand-surface absolute inset-0 rounded-full opacity-30 animate-breathe" aria-hidden />
              <span
                className="brand-surface absolute inset-4 rounded-full opacity-40 animate-breathe"
                style={{ animationDelay: "0.6s" }}
                aria-hidden
              />
            </>
          )}
          <button
            onClick={() => (state === "idle" ? setState("recording") : setState(state === "recording" ? "paused" : "recording"))}
            aria-label={state === "recording" ? "Pause recording" : "Start recording"}
            className="brand-surface relative grid size-24 place-items-center rounded-full shadow-glow transition-transform duration-300 hover:scale-105 active:scale-95"
          >
            {state === "recording" ? (
              <Pause className="size-9" aria-hidden />
            ) : state === "paused" ? (
              <Play className="size-9" aria-hidden />
            ) : (
              <Mic className="size-9" aria-hidden />
            )}
          </button>
        </div>

        <p className="mt-6 font-mono text-3xl tabular-nums">{mmss}</p>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {state === "recording" ? "Recording" : state === "paused" ? "Paused" : state === "done" ? "Finished" : "Ready"}
        </p>

        <div className="mt-6 flex h-16 items-end justify-center gap-1" aria-hidden>
          {levels.map((l, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-primary/70 transition-all duration-150"
              style={{ height: `${(state === "recording" ? l : 0.15) * 100}%` }}
            />
          ))}
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button onClick={stop} disabled={state === "idle" || state === "done"} className="rounded-full">
            <Square className="size-4" aria-hidden />
            Stop
          </Button>
          <Button
            variant="outline"
            className="rounded-full bg-transparent"
            onClick={() => setState(state === "recording" ? "paused" : "recording")}
            disabled={state === "idle" || state === "done"}
          >
            <Pause className="size-4" aria-hidden />
            Pause
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={cancel}>
            <X className="size-4" aria-hidden />
            Cancel
          </Button>
        </div>
      </section>

      {state === "done" && (
        <section className="glass animate-rise space-y-4 rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Transcription</h2>
          {thinking ? (
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />
              <p className="text-xs text-muted-foreground">Transcribing on-device…</p>
            </div>
          ) : (
            <>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={7}
                aria-label="Transcription"
                className="rounded-2xl text-[15px] leading-relaxed"
              />

              <div>
                <p className="mb-2 text-sm text-muted-foreground">How did that feel?</p>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMood(m.id)}
                      aria-pressed={mood === m.id}
                      className={`rounded-2xl px-3.5 py-2 text-sm transition-all ${
                        mood === m.id
                          ? "brand-surface shadow-glow"
                          : "glass hover:-translate-y-0.5"
                      }`}
                    >
                      <span aria-hidden>{m.emoji}</span> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {summary && (
                <div className="glass rounded-2xl p-4 text-sm">
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Summary</p>
                  {summary}
                </div>
              )}
              {reflection && (
                <div className="glass rounded-2xl p-4 text-sm">
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Reflection</p>
                  {reflection}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={save} className="rounded-full">
                  <Save className="size-4" aria-hidden />
                  Save Entry
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full bg-transparent"
                  onClick={() => setReflection(reflect(transcript, mood))}
                >
                  <Sparkles className="size-4" aria-hidden />
                  Generate Reflection
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full bg-transparent"
                  onClick={() => setSummary(summarize(transcript))}
                >
                  <FileText className="size-4" aria-hidden />
                  Summarize
                </Button>
              </div>
            </>
          )}
        </section>
      )}

      <PrivacyBadges className="justify-center" />
    </div>
  );
}
