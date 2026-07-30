import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Home,
  LineChart,
  Mic,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkle,
  Sun,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import { BackendStatusPill } from "@/components/BackendStatusPill";

const NAV = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/history", label: "Journal History", icon: BookOpen },
  { to: "/app/voice", label: "Voice Notes", icon: Mic },
  { to: "/app/trends", label: "Mood Trends", icon: LineChart },
  { to: "/app/reflections", label: "AI Reflections", icon: Sparkle },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

const MOBILE_NAV = NAV.filter((item) => item.label !== "Settings");

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Still awake";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function AppShell({
  children,
  onSearch,
}: {
  children: ReactNode;
  onSearch?: (value: string) => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { settings, update } = useSettings();
  const [query, setQuery] = useState("");

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar/60 px-4 py-6 backdrop-blur-xl lg:flex">
        <Link to="/" className="mb-8 flex items-center gap-3 px-2">
          <span className="brand-surface flex size-9 items-center justify-center rounded-2xl text-sm font-semibold">
            MV
          </span>
          <span className="font-display text-lg font-semibold">MindVault</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive(item.to, "exact" in item ? item.exact : false) &&
                  "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          to="/app/journal"
          className="brand-surface mt-4 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5"
        >
          <Plus className="size-4" /> New Journal
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold sm:text-lg">
              {greeting()}, friend
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Your thoughts stay on your device.
            </p>
          </div>

          <label className="relative hidden items-center md:flex">
            <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                onSearch?.(event.target.value);
              }}
              placeholder="Search entries"
              aria-label="Search entries"
              className="h-10 w-56 rounded-xl border border-border/70 bg-card/60 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary/60"
            />
          </label>

          <BackendStatusPill compact />

          <button
            type="button"
            aria-label="Toggle color theme"
            onClick={() => update({ theme: settings.theme === "dark" ? "light" : "dark" })}
            className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-card/60 text-muted-foreground transition-colors hover:text-foreground"
          >
            {settings.theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <span className="brand-surface flex size-10 items-center justify-center rounded-xl text-sm font-semibold">
            You
          </span>
        </header>

        <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <Link
        to="/app/journal"
        aria-label="New journal entry"
        className="brand-surface fixed bottom-24 right-5 z-40 flex size-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 lg:hidden"
      >
        <Plus className="size-6" />
      </Link>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border/60 bg-background/85 px-2 py-2 backdrop-blur-xl lg:hidden">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition-colors",
              isActive(item.to, "exact" in item ? item.exact : false) && "text-primary",
            )}
          >
            <item.icon className="size-5" />
            {item.label.split(" ")[0]}
          </Link>
        ))}
        <Link
          to="/app/settings"
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition-colors",
            isActive("/app/settings") && "text-primary",
          )}
        >
          <Settings className="size-5" />
          Settings
        </Link>
      </nav>
    </div>
  );
}
