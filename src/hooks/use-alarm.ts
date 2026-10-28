import { useEffect, useState } from 'react';

import { loadAlarm, subscribeAlarm, type AlarmMemory } from '@/lib/alarm-state';

/** The current break-over alarm (written by the background task), re-read every `intervalMs`. */
export function useAlarm(intervalMs = 1000): AlarmMemory | null {
  const [alarm, setAlarm] = useState<AlarmMemory | null>(null);

  useEffect(() => {
    let live = true;
    const tick = async () => {
      const next = await loadAlarm();
      if (live) setAlarm(next);
    };
    tick();
    const timer = setInterval(tick, intervalMs);
    const unsubscribe = subscribeAlarm(tick);
    return () => {
      live = false;
      clearInterval(timer);
      unsubscribe();
    };
  }, [intervalMs]);

  return alarm;
}

/** A clock that re-renders every `intervalMs` (for countdowns). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
