import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mic,
  Sparkles,
  Sun,
  HeartPulse,
  WifiOff,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import hero from "@/assets/hero-journaling.jpg";
import logo from "@/assets/mindvault-logo.png";
import { PrivacyBadges } from "@/components/privacy";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MindVault — Your private AI journal, entirely on-device" },
      {
        name: "description",
        content:
          "MindVault is a calming AI mental health companion. Voice journaling, reflections and mood insights that never leave your device.",
      },
      { property: "og:title", content: "MindVault — Private AI journaling" },
      {
        property: "og:description",
        content:
          "Your private AI journal that never sends your thoughts to the cloud. 100% on-device, offline-first.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Mic,
    title: "Voice Journaling",
    body: "Speak freely. Transcription happens right here in your browser.",
  },
  {
    icon: Sparkles,
    title: "AI Reflection",
    body: "Gentle, empathetic responses that help you look a little deeper.",
  },
  {
    icon: Sun,
    title: "Daily Insights",
    body: "Quiet patterns surfaced from your own words, day after day.",
  },
  {
    icon: HeartPulse,
    title: "Mood Tracking",
    body: "See how your weeks actually felt, not how you remember them.",
  },
  {
    icon: WifiOff,
    title: "Completely Offline",
    body: "Airplane mode works. There is no server to talk to.",
  },
];

function Landing() {
  useTheme();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="aurora pointer-events-none fixed inset-0" aria-hidden />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="MindVault logo" width={512} height={512} className="size-9" />
          <span className="text-lg font-semibold tracking-tight">MindVault</span>
        </div>
        <Button asChild variant="ghost" className="rounded-full">
          <Link to="/privacy">How Privacy Works</Link>
        </Button>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24">
        <section className="grid items-center gap-12 py-10 lg:grid-cols-2 lg:py-16">
          <div className="animate-rise">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium">
              <ShieldCheck className="size-3.5 text-teal" aria-hidden />
              Everything stays on your device
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] sm:text-6xl">
              <span className="gradient-text">MindVault</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Your private AI journal that never sends your thoughts to the cloud.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-7 shadow-glow">
                <Link to="/login">
                  Start Journaling
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-border/70 bg-transparent px-7"
              >
                <Link to="/privacy">How Privacy Works</Link>
              </Button>
            </div>
            <PrivacyBadges className="mt-9" />
          </div>

          <div className="relative animate-rise">
            <div
              className="brand-surface absolute -inset-6 rounded-[3rem] opacity-25 blur-3xl animate-breathe"
              aria-hidden
            />
            <img
              src={hero}
              alt="Illustration of a person journaling surrounded by calm gradient orbs"
              width={1280}
              height={1024}
              className="relative w-full rounded-[2rem] border border-border/60 shadow-soft"
            />
          </div>
        </section>

        <section className="pt-8">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            A companion that stays in your pocket
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            No cloud. No server. Complete privacy — with the features you'd expect from a
            premium journal.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="glass group rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
              >
                <span className="brand-surface grid size-11 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-110">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="glass mt-16 flex flex-col items-center rounded-[2rem] px-6 py-12 text-center">
          <h2 className="max-w-lg text-2xl font-semibold sm:text-3xl">
            Write something today. Only you will ever read it.
          </h2>
          <Button asChild size="lg" className="mt-7 rounded-full px-8 shadow-glow">
            <Link to="/login">Start Journaling</Link>
          </Button>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        MindVault · On-device AI · No data collection
      </footer>
    </div>
  );
}
