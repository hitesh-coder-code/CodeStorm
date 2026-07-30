import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  BookLock,
  CloudOff,
  Mic,
  Sparkle,
  WifiOff,
} from "lucide-react";
import heroImage from "@/assets/hero-journaling.jpg";
import { PrivacyBadges } from "@/components/PrivacyBanner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MindVault — Your private AI journal" },
      {
        name: "description",
        content:
          "MindVault is a private, offline-first journal. Entries stay on your device and reflections come from your own local AI companion.",
      },
      { property: "og:title", content: "MindVault — Your private AI journal" },
      {
        property: "og:description",
        content:
          "Journal privately. Your entries stay on your device and AI reflection runs on your own machine.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Sparkle, title: "Private AI Reflection", body: "Supportive reflections from your own local model." },
  { icon: Mic, title: "Voice Journaling", body: "Speak your thoughts, edit the transcript, then save." },
  { icon: BarChart3, title: "Daily Insights", body: "Gentle summaries built from your own entries." },
  { icon: BookLock, title: "Mood Tracking", body: "Log how you feel and watch the patterns emerge." },
  { icon: WifiOff, title: "Offline-first Journaling", body: "Write any time — no connection required." },
  { icon: CloudOff, title: "Local AI Processing", body: "Requests go to your machine, never to the cloud." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-3">
          <span className="brand-surface flex size-9 items-center justify-center rounded-2xl text-sm font-semibold">
            MV
          </span>
          <span className="font-display text-lg font-semibold">MindVault</span>
        </div>
        <Link
          to="/app"
          className="rounded-xl border border-border/70 bg-card/50 px-4 py-2 text-sm transition-colors hover:bg-card"
        >
          Open app
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24">
        <section className="grid items-center gap-10 py-10 lg:grid-cols-2 lg:py-16">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3 py-1.5 text-xs text-muted-foreground">
              🔒 Runs with your local Gemma companion
            </span>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] sm:text-6xl">
              Mind<span className="gradient-text">Vault</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Your private AI journal designed to keep your thoughts close.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/app/journal"
                className="brand-surface rounded-2xl px-6 py-3.5 text-sm font-medium transition-transform hover:-translate-y-0.5"
              >
                Start Journaling
              </Link>
              <Link
                to="/privacy"
                className="rounded-2xl border border-border/70 bg-card/50 px-6 py-3.5 text-sm font-medium transition-colors hover:bg-card"
              >
                How Privacy Works
              </Link>
            </div>
            <PrivacyBadges className="mt-8" />
          </div>

          <div className="relative animate-float-slow">
            <div className="glass overflow-hidden rounded-[2rem] p-2">
              <img
                src={heroImage}
                alt="A person journaling calmly at night with soft ambient light"
                className="h-full w-full rounded-[1.6rem] object-cover"
                loading="eager"
              />
            </div>
          </div>
        </section>

        <section className="glass rounded-3xl p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold">Your thoughts stay on your device.</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            MindVault stores your journal locally and connects to your local AI companion for private AI
            processing.
          </p>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="glass rounded-3xl p-6 transition-transform hover:-translate-y-1"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <feature.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        MindVault · Journal data stays on your device · AI processing performed locally
      </footer>
    </div>
  );
}
