import { useEffect, useState } from "react";

/** Segundos decorridos desde `startedAt` (ISO), atualizados a cada segundo. */
export function useElapsedSeconds(startedAt: string): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
}
