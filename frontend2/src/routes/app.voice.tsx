import { createFileRoute } from "@tanstack/react-router";
import { Mic, Pause, Play, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { JournalComposer } from "@/components/JournalComposer";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

export const Route = createFileRoute("/app/voice")({
  head: () => ({
    meta: [
      { title: "Voice Notes — MindVault" },
      {
        name: "description",
        content: "Speak your journal entry, edit the transcript, and reflect with your local AI companion.",
      },
      { property: "og:title", content: "Voice Notes — MindVault" },
      { property: "og:description", content: "Voice journaling with on-device transcription." },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  const { supported, listening, transcript, interim, error, start, stop, reset, setManualTranscript } =
    useSpeechRecognition();
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (listening) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [listening]);

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  if (done) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            setDone(false);
            reset();
            setSeconds(0);
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Record again
        </button>
        <JournalComposer
          heading="Voice entry"
          source="voice"
          initial={{ text: transcript, title: "Voice note" }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold">Voice journaling</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Transcription runs in your browser. Nothing is uploaded anywhere.
        </p>
      </div>

      {!supported ? (
        <div className="glass rounded-3xl p-6 text-center">
          <p className="text-sm">
            Speech recognition isn't available in this browser. You can still journal by typing.
          </p>
          <button
            type="button"
            onClick={() => setDone(true)}
            className="brand-surface mt-4 inline-flex rounded-2xl px-5 py-3 text-sm font-medium"
          >
            Switch to text journaling
          </button>
        </div>
      ) : (
        <div className="glass flex flex-col items-center rounded-3xl p-8">
          <div className="relative flex size-40 items-center justify-center">
            {listening && (
              <span className="absolute inset-0 animate-breathe rounded-full bg-primary/25" />
            )}
            <span className="brand-surface relative flex size-24 items-center justify-center rounded-full">
              <Mic className="size-10" />
            </span>
          </div>

          <p className="mt-6 font-display text-3xl tabular-nums">{clock}</p>
          <p className="text-xs text-muted-foreground">
            {listening ? "Listening…" : seconds > 0 ? "Paused" : "Ready when you are"}
          </p>

          <div className="mt-6 flex h-14 w-full items-center justify-center gap-1">
            {Array.from({ length: 36 }).map((_, index) => (
              <span
                key={index}
                className="w-1.5 rounded-full bg-primary/60 transition-all"
                style={{
                  height: listening
                    ? `${18 + Math.abs(Math.sin((index + seconds) * 0.7)) * 38}px`
                    : "6px",
                }}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!listening ? (
              <button
                type="button"
                onClick={start}
                className="brand-surface inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium"
              >
                <Play className="size-4" /> {seconds > 0 ? "Resume" : "Start recording"}
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-card/50 px-5 py-3 text-sm"
              >
                <Pause className="size-4" /> Pause
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                stop();
                setDone(true);
              }}
              disabled={!transcript.trim()}
              className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-3 text-sm disabled:opacity-50"
            >
              <Square className="size-4" /> Stop & review
            </button>
            <button
              type="button"
              onClick={() => {
                stop();
                reset();
                setSeconds(0);
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" /> Cancel
            </button>
          </div>

          {error && <p className="mt-4 text-xs text-destructive">{error}</p>}
        </div>
      )}

      {(transcript || interim) && (
        <div className="glass rounded-3xl p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Transcription</p>
          <textarea
            value={transcript}
            onChange={(event) => setManualTranscript(event.target.value)}
            rows={7}
            className="mt-3 w-full resize-y rounded-2xl border border-border/70 bg-card/50 p-4 text-sm leading-relaxed outline-none focus:border-primary/60"
          />
          {interim && <p className="mt-2 text-xs italic text-muted-foreground">{interim}</p>}
        </div>
      )}
    </div>
  );
}
