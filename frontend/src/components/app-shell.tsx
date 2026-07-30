import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { createContext, useContext, useState } from "react";
import {
  Home,
  BookOpen,
  Mic,
  LineChart,
  Sparkles,
  Settings as SettingsIcon,
  Search,
  Moon,
  Sun,
  Plus,
  ShieldCheck,
} from "lucide-react";
import logo from "@/assets/mindvault-logo.png";
import { useTheme } from "@/hooks/use-theme";
import { useSettings } from "@/lib/mindvault";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/journal", label: "Journal History", icon: BookOpen },
  { to: "/app/voice", label: "Voice Notes", icon: Mic },
  { to: "/app/moods", label: "Mood Trends", icon: LineChart },
  { to: "/app/reflections", label: "AI Reflections", icon: Sparkles },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon },
];

const MOBILE_NAV = NAV.filter((n) => n.label !== "Settings").slice(0, 5);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const SearchContext = createContext("");
export const useJournalSearch = () => useContext(SearchContext);

export function AppShell() {
  const [search, setSearch] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const { settings } = useSettings();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  return (
    <div className="relative flex min-h-screen w-full">
      <div className="aurora pointer-events-none fixed inset-0 opacity-70" aria-hidden />

      {/* Sidebar */}
      <aside className="relative z-10 hidden w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar/60 px-4 py-6 backdrop-blur-xl lg:flex">
        <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
          <img src={logo} alt="" width={512} height={512} className="size-9" />
          <span className="text-lg font-semibold tracking-tight">MindVault</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to as never}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive(to, exact)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`}
            >
              <Icon className="size-4.5 shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="glass mt-6 rounded-2xl p-3.5">
          <p className="flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck className="size-4 text-teal" aria-hidden />
            Always local
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Nothing you write leaves this device.
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logo}
              alt=""
              width={512}
              height={512}
              className="size-8 shrink-0 lg:hidden"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">
                {greeting()}, {settings.name}
              </p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Your private space. Everything stays on this device.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="relative hidden md:block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search journal"
                aria-label="Search journal"
                className="h-9 w-52 rounded-full pl-9"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Toggle dark mode"
              className="rounded-full"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <span className="brand-surface grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold">
              {settings.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
          <SearchContext.Provider value={search}>
            <Outlet />
          </SearchContext.Provider>
        </main>
      </div>

      {/* Floating new journal */}
      <Link
        to="/app/voice"
        aria-label="New journal entry"
        className="brand-surface fixed bottom-24 right-5 z-30 grid size-14 place-items-center rounded-full shadow-glow transition-transform duration-300 hover:scale-105 active:scale-95 lg:bottom-8"
      >
        <Plus className="size-6" aria-hidden />
      </Link>

      {/* Bottom nav (mobile) */}
      <nav className="glass fixed inset-x-0 bottom-0 z-20 flex items-center justify-around px-2 py-2 lg:hidden">
        {MOBILE_NAV.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to as never}
            aria-label={label}
            className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors ${
              isActive(to, exact)
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="size-5" aria-hidden />
            {label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
