import { useCallback, useEffect, useRef, useState } from "react";
import { checkHealth, type HealthResponse } from "@/services/api";

export type HealthState = "checking" | "online" | "offline";

export function useBackendHealth(pollMs = 45_000) {
  const [state, setState] = useState<HealthState>("checking");
  const [info, setInfo] = useState<HealthResponse | null>(null);
  const mounted = useRef(true);

  const ping = useCallback(async () => {
    try {
      const data = await checkHealth();
      if (!mounted.current) return;
      setInfo(data);
      setState("online");
    } catch {
      if (!mounted.current) return;
      setInfo(null);
      setState("offline");
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    ping();
    const id = setInterval(ping, pollMs);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [ping, pollMs]);

  return { state, info, recheck: ping };
}
