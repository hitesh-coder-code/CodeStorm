import { AlertTriangle, RefreshCw, Sparkle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { OFFLINE_SAVE_MESSAGE } from "@/services/api";

function useTypewriter(text: string, enabled: boolean) {
  const [shown, setShown] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) {
      setShown(text);
      return;
    }
    setShown("");
    let index = 0;
    const id = setInterval(() => {
      index += Math.max(2, Math.round(text.length / 220));
      setShown(text.slice(0, index));
      if (index >= text.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [text, enabled]);

  return shown;
}

export function AiLoadingCard({ label }: { label: string }) {
  return (
    <div className="glass flex items-center gap-4 rounded-3xl p-5">
      <span className="brand-surface flex size-10 animate-breathe items-center justify-center rounded-2xl">
        <Sparkle className="size-5" />
      </span>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          Running on your machine via llama.cpp — nothing leaves this device.
        </p>
      </div>
    </div>
  );
}

export function AiErrorCard({
  message,
  onRetry,
  savedLocally = true,
}: {
  message: string;
  onRetry: () => void;
  savedLocally?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-destructive/35 bg-destructive/10 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 text-destructive" />
        <div className="min-w-0 flex-1">
          {savedLocally && <p className="text-sm font-medium">{OFFLINE_SAVE_MESSAGE}</p>}
          <p className={cn("text-xs text-muted-foreground", savedLocally && "mt-1")}>{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-xs font-medium transition-colors hover:bg-card"
          >
            <RefreshCw className="size-3.5" /> Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReflectionCard({
  reflection,
  timestamp,
  animate = true,
  title = "Reflection from your local AI companion",
}: {
  reflection: string;
  timestamp?: string;
  animate?: boolean;
  title?: string;
}) {
  const shown = useTypewriter(reflection, animate);

  return (
    <article className="glass animate-rise rounded-3xl p-5 sm:p-6">
      <header className="flex items-center gap-3">
        <span className="brand-surface flex size-9 items-center justify-center rounded-2xl">
          <Sparkle className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          {timestamp && (
            <p className="text-xs text-muted-foreground">
              {new Date(timestamp).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </header>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {shown}
        {animate && shown.length < reflection.length && (
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary align-middle" />
        )}
      </p>
      <p className="mt-4 text-[11px] text-muted-foreground">
        A supportive reflection — not medical, clinical, or therapeutic advice.
      </p>
    </article>
  );
}
