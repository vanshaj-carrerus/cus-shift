// The background half of the break system. While an employee is checked in on a
// shift, Android runs this task from a foreground service every ~30 s with the
// phone's location. A scheduled notification can't check where you are, so this
// is what decides, tick by tick, whether to warn or ring the alarm (see
// presence-process.ts). The web build has no background task: see presence-task.web.ts.
//
// IMPORTANT: defineTask must run at module load (not inside a component), so
// this file is imported from the root layout.

import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { MAX_FIX_ACCURACY_M, processLocation } from './presence-process';

export const PRESENCE_TASK = 'cus-presence';

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
