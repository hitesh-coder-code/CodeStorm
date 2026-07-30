import { RefreshCw, ShieldCheck, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBackendHealth } from "@/hooks/useBackendHealth";

export function BackendStatusPill({ compact = false }: { compact?: boolean }) {
  const { state, info, recheck } = useBackendHealth();

  const label =
    state === "online"
      ? "Local Mode Active"
      : state === "checking"
        ? "Checking local AI…"
        : "Local AI unavailable";

  return (
    <button
      type="button"
      onClick={recheck}
      title={
        info
          ? `${info.model ?? "Gemma"} · ${info.runtime ?? "llama.cpp"} · ${info.privacy ?? "local inference"}`
          : "Retry connection to your local AI companion"
      }
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
        state === "online"
          ? "border-success/40 bg-success/10 text-success"
          : state === "checking"
            ? "border-border/70 bg-card/60 text-muted-foreground"
            : "border-destructive/40 bg-destructive/10 text-destructive",
      )}
    >
      {state === "online" ? (
        <ShieldCheck className="size-4" />
      ) : state === "checking" ? (
        <RefreshCw className="size-4 animate-spin" />
      ) : (
        <WifiOff className="size-4" />
      )}
      <span className={cn(compact && "hidden xl:inline")}>{label}</span>
    </button>
  );
}
