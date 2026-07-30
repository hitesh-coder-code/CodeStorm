import { useCallback, useEffect, useState } from "react";

const KEY = "mindvault.theme";

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY) as "dark" | "light" | null;
    const next = stored ?? "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem(KEY, next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  const apply = useCallback((next: "dark" | "light") => {
    window.localStorage.setItem(KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
    setTheme(next);
  }, []);

  return { theme, toggle, apply };
}
