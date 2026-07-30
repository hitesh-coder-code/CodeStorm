import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Cpu, Database, CloudOff, KeyRound } from "lucide-react";
import { PrivacyBadges, PrivacyBanner } from "@/components/privacy";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "How Privacy Works — MindVault" },
      {
        name: "description",
        content:
          "MindVault processes journals with on-device AI and stores them in your browser only. No cloud storage, no analytics, no data collection.",
      },
      { property: "og:title", content: "How Privacy Works — MindVault" },
      {
        property: "og:description",
        content: "On-device AI, local-only storage, and zero data collection. Here's exactly how.",
      },
    ],
  }),
  component: Privacy,
});

const POINTS = [
  {
    icon: Cpu,
    title: "Processing happens in your browser",
    body: "Reflections, summaries and emotion detection run in JavaScript on this device. No inference request is ever made to a remote model.",
  },
  {
    icon: Database,
    title: "Storage is local-only",
    body: "Entries live in your browser's local storage. There is no account, no database, and no sync target.",
  },
  {
    icon: CloudOff,
    title: "Works offline by design",
    body: "Once the app is loaded you can put your device in airplane mode and keep journaling exactly as before.",
  },
  {
    icon: KeyRound,
    title: "You hold the only copy",
    body: "Export your data as JSON whenever you want, or wipe it permanently with one tap in Settings.",
  },
];

function Privacy() {
  return (
    <div className="relative min-h-screen">
      <div className="aurora pointer-events-none fixed inset-0" aria-hidden />
      <div className="relative z-10 mx-auto max-w-3xl px-5 py-10">
        <Button asChild variant="ghost" className="mb-8 rounded-full">
          <Link to="/">
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Link>
        </Button>

        <h1 className="text-4xl font-semibold sm:text-5xl">
          How <span className="gradient-text">privacy</span> works
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Everything stays on your device. No cloud. No server. Complete privacy.
        </p>

        <PrivacyBadges className="mt-8" />

        <div className="mt-10 grid gap-4">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="glass rounded-3xl p-6">
              <span className="brand-surface grid size-11 place-items-center rounded-2xl">
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <PrivacyBanner />
        </div>

        <Button asChild size="lg" className="mt-10 w-full rounded-full shadow-glow sm:w-auto">
          <Link to="/app">Start Journaling</Link>
        </Button>
      </div>
    </div>
  );
}
