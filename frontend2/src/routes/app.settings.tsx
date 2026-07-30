import { createFileRoute } from "@tanstack/react-router";
import { Download, Eraser, ShieldCheck, Trash2, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { useEntries } from "@/hooks/useEntries";
import { useSettings } from "@/hooks/useSettings";
import { apiBaseUrl } from "@/services/api";
import { clearAiMemory, deleteAllEntries, exportData } from "@/store/journal";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MindVault" },
      {
        name: "description",
        content: "Manage privacy, appearance, notifications, data export and local data deletion in MindVault.",
      },
      { property: "og:title", content: "Settings — MindVault" },
      { property: "og:description", content: "Control your local MindVault data and appearance." },
    ],
  }),
  component: SettingsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-4 text-sm">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`h-6 w-11 shrink-0 rounded-full border border-border/70 p-0.5 transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`block size-5 rounded-full bg-background transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SettingsPage() {
  const { settings, update } = useSettings();
  const { entries } = useEntries();
  const { state, info, recheck } = useBackendHealth();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindvault-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded to this device.");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-semibold">Settings</h1>

      <Section title="Privacy">
        <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/40 p-4">
          <ShieldCheck className="mt-0.5 size-5 text-primary" />
          <div>
            <p className="font-medium">Your journal data stays on your device and AI processing is performed locally.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Backend: {apiBaseUrl} · {info?.model ?? "Gemma 3 4B-IT"} via {info?.runtime ?? "llama.cpp"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={recheck}
          className="rounded-xl border border-border/70 bg-card/50 px-4 py-2 text-sm hover:bg-card"
        >
          Re-check local AI connection ({state})
        </button>
      </Section>

      <Section title="Appearance">
        <Toggle
          label="Dark mode"
          description="Calm dark theme by default; switch to light any time."
          checked={settings.theme === "dark"}
          onChange={(value) => update({ theme: value ? "dark" : "light" })}
        />
        <Toggle
          label="Typing animation"
          description="Reveal AI reflections word by word."
          checked={settings.typingAnimation}
          onChange={(value) => update({ typingAnimation: value })}
        />
      </Section>

      <Section title="Notifications">
        <Toggle
          label="Gentle reminders"
          description="Show an in-app nudge to journal when you open MindVault."
          checked={settings.gentleReminders}
          onChange={(value) => update({ gentleReminders: value })}
        />
      </Section>

      <Section title="Offline status">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-4">
          <WifiOff className="size-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{online ? "Connected" : "Offline"}</p>
            <p className="text-xs text-muted-foreground">
              Journaling, mood tracking and analytics keep working offline. AI reflection needs your local
              companion running.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Export data">
        <p className="text-xs text-muted-foreground">
          {entries.length} entries stored locally. Export downloads a JSON file to this device only.
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/50 px-4 py-2 text-sm hover:bg-card"
        >
          <Download className="size-4" /> Export My Data
        </button>
      </Section>

      <Section title="Delete local data">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (!confirm("Clear all AI reflections and summaries? Your entries stay.")) return;
              clearAiMemory();
              toast.success("AI memory cleared.");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/50 px-4 py-2 text-sm hover:bg-card"
          >
            <Eraser className="size-4" /> Clear AI Memory
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirm("Delete ALL journal entries from this device? This cannot be undone.")) return;
              deleteAllEntries();
              toast.success("All local data deleted.");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          >
            <Trash2 className="size-4" /> Delete All Local Data
          </button>
        </div>
      </Section>
    </div>
  );
}
