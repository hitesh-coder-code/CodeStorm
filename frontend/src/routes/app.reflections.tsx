import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, Paperclip, Send, Sparkles } from "lucide-react";
import { useChat, useEntries } from "@/lib/mindvault";
import { SUGGESTED_PROMPTS, demoTranscript, detectEmotions, reflect } from "@/lib/on-device-ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import logo from "@/assets/mindvault-logo.png";
import { toast } from "sonner";
import { generateAIReflection } from "@/lib/api";
export const Route = createFileRoute("/app/reflections")({
  head: () => ({
    meta: [
      { title: "AI Reflections — MindVault" },
      {
        name: "description",
        content: "Talk things through with an empathetic AI companion that runs entirely on your device.",
      },
      { property: "og:title", content: "AI Reflections — MindVault" },
      { property: "og:description", content: "A private, offline reflection chat — no cloud, no logs." },
    ],
  }),
  component: Reflections,
});

function Reflections() {
  const { messages, push, hydrated } = useChat();
  const { entries } = useEntries();
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing]);

  const send = (text: string) => {
  const content = text.trim();

  if (!content) {
    return;
  }

  push("user", content);
  setDraft("");
  setTyping(true);

  setTimeout(async () => {
    const recentMood =
      entries[0]?.mood ?? "okay";

    let responseText =
      reflect(content, recentMood);

    try {
      const aiResponse =
        await generateAIReflection(
          content,
          recentMood,
        );

      responseText =
        aiResponse.reflection;
    } catch (error) {
      console.error(
        "Gemma response failed:",
        error,
      );
    }

    push("assistant", responseText);
    setTyping(false);
  }, 1100);
};

  return (
    <div className="mx-auto flex h-[calc(100vh-11rem)] max-w-3xl flex-col lg:h-[calc(100vh-9rem)]">
      <div className="mb-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <img src={logo} alt="" width={512} height={512} className="size-10 shrink-0" />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">AI Reflections</h1>
          <p className="truncate text-xs text-muted-foreground">
            Running on-device · nothing is sent anywhere
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {hydrated && messages.length === 0 && (
          <div className="glass animate-rise rounded-3xl p-6 text-center">
            <span className="brand-surface mx-auto grid size-12 place-items-center rounded-2xl">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-semibold">No reflections yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start wherever you are. There's no wrong way to begin.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`animate-rise flex flex-col gap-1 ${
              m.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground"
              }`}
            >
              {m.content}
            </div>
            <span className="px-2 text-[11px] text-muted-foreground">
              {new Date(m.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}

        {typing && (
          <div className="flex items-center gap-1.5 px-2" aria-live="polite">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-2 rounded-full bg-primary animate-blink"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">Reflecting…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              className="glass rounded-full px-3.5 py-2 text-xs transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              {p}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="glass rounded-3xl p-3"
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder="Share what's on your mind…"
            aria-label="Message"
            rows={2}
            className="resize-none border-0 bg-transparent text-[15px] shadow-none focus-visible:ring-0"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Attach voice note"
              onClick={() => {
                setDraft(demoTranscript(Date.now()));
                toast.success("Voice note attached locally");
              }}
            >
              <Paperclip className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Record with microphone"
              onClick={() => {
                const t = demoTranscript(Date.now() + 1);
                setDraft(t);
                toast.success(`Transcribed on-device · ${detectEmotions(t)[0]}`);
              }}
            >
              <Mic className="size-4" aria-hidden />
            </Button>
            <Button type="submit" size="icon" className="rounded-full" aria-label="Send message">
              <Send className="size-4" aria-hidden />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
