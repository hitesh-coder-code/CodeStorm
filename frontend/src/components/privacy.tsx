import { Lock, Smartphone, ShieldCheck, Zap } from "lucide-react";

const BADGES = [
  { icon: Lock, label: "100% On-device AI" },
  { icon: Smartphone, label: "Works Offline" },
  { icon: ShieldCheck, label: "No Data Collection" },
  { icon: Zap, label: "Instant Processing" },
];

export function PrivacyBadges({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {BADGES.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="glass flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-foreground/85 transition-transform duration-300 hover:-translate-y-0.5"
        >
          <Icon className="size-3.5 text-teal" aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}

export function PrivacyBanner() {
  return (
    <div className="glass relative overflow-hidden rounded-3xl p-5 sm:p-6">
      <div className="aurora pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative flex items-start gap-4">
        <span className="brand-surface grid size-11 shrink-0 place-items-center rounded-2xl">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Your data never leaves this device</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No cloud storage. No external servers. Everything is processed locally using
            on-device AI.
          </p>
        </div>
      </div>
    </div>
  );
}
