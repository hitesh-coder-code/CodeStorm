import { useCallback, useEffect, useState } from "react";
import { loadSettings, saveSettings, type AppSettings, defaultSettings } from "@/store/journal";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next.theme === "dark");
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", settings.theme === "dark");
    }
  }, [settings.theme]);

  return { settings, update };
}
