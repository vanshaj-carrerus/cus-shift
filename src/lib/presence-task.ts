// The background half of the break system. While an employee is checked in on a
// shift, Android runs this task from a foreground service every ~30 s with the
// phone's location. A scheduled notification can't check where you are, so this
// is what decides, tick by tick, whether to warn or ring the alarm.
//
// IMPORTANT: defineTask must run at module load (not inside a component), so
// this file is imported from the root layout.

import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import {
  clearAlarm,
  clearShiftMemory,
  loadAlarm,
  loadPresence,
  loadSchedule,
  savePresence,
  saveAlarm,
} from './alarm-state';
import { sendPresence } from './api';
import { haversineDistanceMeters } from './geo';
import { dismissAllNotifications, ringAlarm, warnOutside } from './notifications';
import { classify } from './presence-logic';

export const PRESENCE_TASK = 'cus-presence';

const MINUTE = 60 * 1000;
// "Outside, not on a break" reminder repeats this often.
const WARN_EVERY_MS = 5 * MINUTE;
// Two outside readings in a row before we believe it (GPS jumps near the edge).
const READINGS_TO_CONFIRM_OUTSIDE = 2;
// Ticks arrive roughly every 30 s; a ring may come this much early to stay on the 2-minute beat.
const RING_SLACK_MS = 5000;
// Readings less precise than this (metres) are ignored.
const MAX_FIX_ACCURACY_M = 50;

/**
 * Handles one location reading. Returns false when the shift is over and
 * tracking should stop.
 */
export async function processLocation(latitude: number, longitude: number, now = Date.now()): Promise<boolean> {
  const schedule = await loadSchedule();
  const shiftEnd = schedule?.shift?.end ? new Date(schedule.shift.end).getTime() : null;
  if (!schedule || shiftEnd === null || now >= shiftEnd) {
    await clearShiftMemory();
    await dismissAllNotifications();
    return false;
  }

  const areas = schedule.offices?.length ? schedule.offices : [schedule.office];
  const nowInside = areas.some(
    (o) => haversineDistanceMeters(latitude, longitude, o.latitude, o.longitude) <= o.radius
  );

  // Report first; the server keeps the admin's live view and the totals.
  await sendPresence(latitude, longitude);

  const memory = await loadPresence();
  if (nowInside) {
    memory.firstOutsideAt = null;
    memory.outsideStreak = 0;
    memory.lastWarnAt = null;
  } else {
    memory.firstOutsideAt ??= now;
    memory.outsideStreak += 1;
  }
  const confirmedOutside = !nowInside && memory.outsideStreak >= READINGS_TO_CONFIRM_OUTSIDE;

  const { state, overrunSince } = classify({
    now,
    schedule,
    inside: !confirmedOutside,
    outsideSince: confirmedOutside ? memory.firstOutsideAt : null,
  });

  if (state === 'BREAK_OVERRUN' && overrunSince !== null) {
    let alarm = await loadAlarm();
    if (!alarm || alarm.overrunSince !== overrunSince) {
      alarm = { overrunSince, rings: 0, lastRingAt: 0, silenced: false };
    }
    const interval = schedule.alarm.intervalMinutes * MINUTE;
    if (!alarm.silenced && now - alarm.lastRingAt >= interval - RING_SLACK_MS) {
      alarm.rings += 1;
      alarm.lastRingAt = now;
      await ringAlarm(alarm.rings, schedule.alarm.ringsBeforeSilence);
    }
    // The employee may have silenced it from the alarm screen while this tick ran.
    const latest = await loadAlarm();
    if (latest?.overrunSince === alarm.overrunSince && latest.silenced) alarm.silenced = true;
    await saveAlarm(alarm);
  } else {
    // Not overstaying (back inside, on a break, or off shift): the alarm is over.
    if (await loadAlarm()) {
      await clearAlarm();
      await dismissAllNotifications();
    }
    if (state === 'OUTSIDE' && (memory.lastWarnAt === null || now - memory.lastWarnAt >= WARN_EVERY_MS)) {
      memory.lastWarnAt = now;
      await warnOutside();
    }
  }

  await savePresence(memory);
  return true;
}

TaskManager.defineTask(PRESENCE_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as { locations?: LocationObject[] } | undefined)?.locations;
  const latest = locations?.[locations.length - 1];
  if (!latest) return;

  // A fix this coarse is a cell/Wi-Fi guess that can be hundreds of metres off, so it would
  // fake "outside" and put a wrong pin on the admin's map. Wait for a real GPS reading.
  const accuracy = latest.coords.accuracy;
  if (accuracy !== null && accuracy > MAX_FIX_ACCURACY_M) return;

  const keepGoing = await processLocation(latest.coords.latitude, latest.coords.longitude);
  if (!keepGoing) {
    // Imported lazily to avoid a cycle (tracking.ts imports this file's task name).
    const { stopTracking } = await import('./tracking');
    await stopTracking();
  }
});
