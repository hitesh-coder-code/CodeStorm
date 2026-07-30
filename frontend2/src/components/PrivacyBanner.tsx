import { cn } from "@/lib/utils";

const BADGES = [
  { icon: "🔒", label: "Local AI Processing" },
  { icon: "📱", label: "Offline-first" },
  { icon: "🛡", label: "No Cloud Storage" },
  { icon: "⚡", label: "Private Processing" },
];

export function PrivacyBadges({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {BADGES.map((badge) => (
        <li
          key={badge.label}
          className="flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3 py-1.5 text-xs text-muted-foreground"
        >
          <span aria-hidden>{badge.icon}</span>
          {badge.label}
        </li>
      ))}
    </ul>
  );
}

export function PrivacyBanner({ className }: { className?: string }) {
  return (
    <section className={cn("glass rounded-3xl p-6 sm:p-8", className)}>
      <h2 className="font-display text-2xl font-semibold sm:text-3xl">
        Your thoughts stay on your device.
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
        MindVault stores your journal locally and connects to your local AI companion for private AI
        processing. Your journal data stays on your device and AI processing is performed locally.
      </p>
      <PrivacyBadges className="mt-5" />
    </section>
  );
}
