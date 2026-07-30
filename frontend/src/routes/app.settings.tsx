import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Moon, Sun, Trash2, Wifi, WifiOff } from "lucide-react";
import {
  defaultSettings,
  downloadJson,
  exportPayload,
  useEntries,
  useSettings,
  wipeAllLocalData,
} from "@/lib/mindvault";
import { PrivacyBanner, PrivacyBadges } from "@/components/privacy";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MindVault" },
      {
        name: "description",
        content: "Control privacy, appearance, notifications, exports and local data deletion in MindVault.",
      },
      { property: "og:title", content: "Settings — MindVault" },
      { property: "og:description", content: "Own your data: export or permanently delete everything, locally." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, setSettings } = useSettings();
  const { entries } = useEntries();
  const { theme, apply } = useTheme();
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

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <PrivacyBanner />

      <Section title="Privacy">
        <PrivacyBadges />
        <Row label="Analytics & telemetry" hint="Permanently disabled. There is nowhere to send it.">
          <Switch checked={false} disabled aria-label="Analytics disabled" />
        </Row>
      </Section>

      <Section title="Appearance">
        <Row label="Your name" hint="Used only for greetings on this device.">
          <Input
            value={settings.name}
            onChange={(e) => setSettings({ name: e.target.value || defaultSettings.name })}
            className="h-9 w-40 rounded-full"
            aria-label="Your name"
          />
        </Row>
        <Row label="Theme" hint="Dark by default, easier on late-night eyes.">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={theme === "dark" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => apply("dark")}
            >
              <Moon className="size-4" aria-hidden />
              Dark
            </Button>
            <Button
              size="sm"
              variant={theme === "light" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => apply("light")}
            >
              <Sun className="size-4" aria-hidden />
              Light
            </Button>
          </div>
        </Row>
      </Section>

      <Section title="Notifications">
        <Row label="Daily reminder" hint="A local nudge to check in with yourself.">
          <Switch
            checked={settings.notifications}
            onCheckedChange={(v) => setSettings({ notifications: v })}
            aria-label="Daily reminder"
          />
        </Row>
        <Row label="Reminder time" hint="Stored locally, never scheduled on a server.">
          <Input
            type="time"
            value={settings.reminderTime}
            onChange={(e) => setSettings({ reminderTime: e.target.value })}
            className="h-9 w-32 rounded-full"
            aria-label="Reminder time"
          />
        </Row>
      </Section>

      <Section title="Offline Status">
        <Row
          label={online ? "Network available" : "Offline"}
          hint="MindVault works either way — it never needs a connection."
        >
          <span className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs">
            {online ? <Wifi className="size-3.5 text-teal" /> : <WifiOff className="size-3.5 text-teal" />}
            {online ? "Online" : "Offline"}
          </span>
        </Row>
      </Section>

      <Section title="Your data">
        <Row label="Export data" hint={`${entries.length} entries as a JSON file.`}>
          <Button
            variant="outline"
            className="rounded-full bg-transparent"
            onClick={() => {
              downloadJson("mindvault-export.json", exportPayload(entries));
              toast.success("Exported to your downloads");
            }}
          >
            <Download className="size-4" aria-hidden />
            Export
          </Button>
        </Row>
        <Row label="Delete local data" hint="Erases every entry and reflection. This cannot be undone.">
          <Button
            variant="ghost"
            className="rounded-full text-destructive hover:text-destructive"
            onClick={() => {
              wipeAllLocalData();
              toast.success("All local data deleted");
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete
          </Button>
        </Row>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass animate-rise space-y-4 rounded-3xl p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
