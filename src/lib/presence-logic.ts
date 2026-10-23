// What "outside the office" means during a shift. This mirrors classifyPresence()
// in cus-reporting/src/lib/shifts.ts (which has the tests) so the phone and the
// admin dashboard always agree:
//  - outside during a break window  -> ON_BREAK   (nobody is alerted)
//  - still outside after a break ended -> BREAK_OVERRUN (the alarm case)
//  - outside at any other time on shift -> OUTSIDE
// The break and shift windows come from the server as real instants.

import type { BreakWindow, Schedule } from './api';

export type PresenceState = 'NOT_IN_SHIFT' | 'INSIDE' | 'ON_BREAK' | 'OUTSIDE' | 'BREAK_OVERRUN';

export function classify(input: {
  now: number;
  schedule: Schedule;
  inside: boolean;
  /** When they were first seen outside (ms); null while inside. */
  outsideSince: number | null;
}): { state: PresenceState; overrunSince: number | null } {
  const { now, schedule, inside, outsideSince } = input;
  const shift = schedule.shift;
  if (!shift?.start || !shift.end) return { state: 'NOT_IN_SHIFT', overrunSince: null };

  const start = new Date(shift.start).getTime();
  const end = new Date(shift.end).getTime();
  if (now < start || now >= end) return { state: 'NOT_IN_SHIFT', overrunSince: null };
  if (inside) return { state: 'INSIDE', overrunSince: null };

  const windows = schedule.breaks.map((b: BreakWindow) => ({
    start: new Date(b.start).getTime(),
    end: new Date(b.end).getTime(),
  }));
  if (windows.some((b) => now >= b.start && now < b.end)) {
    return { state: 'ON_BREAK', overrunSince: null };
  }

  const left = outsideSince ?? now;
  const overstayed = windows
    .filter((b) => b.end <= now && left <= b.end)
    .sort((a, b) => b.end - a.end)[0];
  if (overstayed) return { state: 'BREAK_OVERRUN', overrunSince: overstayed.end };
  return { state: 'OUTSIDE', overrunSince: null };
}

/** The next break that hasn't ended yet (the current one if one is running), or null. */
export function nextBreak(schedule: Schedule, now: number): BreakWindow | null {
  return (
    schedule.breaks
      .filter((b) => new Date(b.end).getTime() > now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0] ?? null
  );
}
