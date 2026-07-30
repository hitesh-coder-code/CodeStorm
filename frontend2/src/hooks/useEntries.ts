import { useCallback, useEffect, useState } from "react";
import { loadEntries, subscribeEntries, type JournalEntry } from "@/store/journal";

export function useEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => setEntries(loadEntries()), []);

  useEffect(() => {
    refresh();
    setHydrated(true);
    return subscribeEntries(refresh);
  }, [refresh]);

  return { entries, hydrated, refresh };
}
