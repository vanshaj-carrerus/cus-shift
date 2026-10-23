import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

import { clearShiftMemory } from './alarm-state';
import { notificationsAllowed, dismissAllNotifications } from './notifications';
import { PRESENCE_TASK } from './presence-task';

export interface TrackingPermissions {
  /** Location while the app is open. */
  foreground: boolean;
  /** Location with the phone locked / app closed ("Allow all the time"). */
  background: boolean;
  notifications: boolean;
  /** Everything needed for break alarms to work. */
  ready: boolean;
}

/** Reads the current permissions without asking. */
export async function getTrackingPermissions(): Promise<TrackingPermissions> {
  const [fg, bg, notifications] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    notificationsAllowed(false),
  ]);
  return {
    foreground: fg.granted,
    background: bg.granted,
    notifications,
    ready: fg.granted && bg.granted && notifications,
  };
}

/**
 * Asks for what's missing, in the order Android requires (foreground location
 * first, then "all the time", which opens system settings on Android 11+).
 */
export async function requestTrackingPermissions(): Promise<TrackingPermissions> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.granted) await Location.requestBackgroundPermissionsAsync();
  await notificationsAllowed(true);
  return getTrackingPermissions();
}

/** Opens the system battery-optimisation list so the app isn't put to sleep mid-shift. */
export async function openBatterySettings(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
    } else {
      await Linking.openSettings();
    }
  } catch {
    await Linking.openSettings().catch(() => {});
  }
}

export async function isTracking(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(PRESENCE_TASK);
  } catch {
    return false;
  }
}

/** Starts the on-shift location task (with Android's foreground-service notification). No-op if running. */
export async function startTracking(): Promise<boolean> {
  const permissions = await getTrackingPermissions();
  if (!permissions.foreground || !permissions.background) return false;
  if (await isTracking()) return true;
  try {
    await Location.startLocationUpdatesAsync(PRESENCE_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30_000,
      distanceInterval: 0,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'CUS Shift — on shift',
        notificationBody: 'Tracking your location for break alarms. Stops when you check out.',
        notificationColor: '#3b82f6',
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** Stops tracking and forgets the shift's alarm state. */
export async function stopTracking(): Promise<void> {
  if (await isTracking()) {
    await Location.stopLocationUpdatesAsync(PRESENCE_TASK).catch(() => {});
  }
  await clearShiftMemory();
  await dismissAllNotifications();
}
