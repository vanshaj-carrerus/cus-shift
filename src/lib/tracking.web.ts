// Web (PWA) version of tracking.ts. Same API, different limits: a browser cannot read
// the location while the app is closed or the phone is locked. So on-shift tracking
// runs from a timer WHILE THE APP IS OPEN, and a screen wake lock keeps the phone
// awake so it stays open. Everything the timer decides is shared with Android
// (presence-process.ts).

import { clearShiftMemory } from './alarm-state';
import { notificationsAllowed, dismissAllNotifications, notificationsSupported } from './notifications';
import { MAX_FIX_ACCURACY_M, processLocation } from './presence-process';

export interface TrackingPermissions {
  /** Location while the app is open. */
  foreground: boolean;
  /** Not a thing on the web: always true so the shared screens treat it as granted. */
  background: boolean;
  notifications: boolean;
  /** Not detectable on the web: the position request reports a switched-off phone instead. */
  servicesEnabled: boolean;
  /** iPhone/iPad Safari tab: notifications and tracking only work from the Home Screen icon. */
  needsInstall?: boolean;
  /** Everything needed for break alarms to work. */
  ready: boolean;
}

const TICK_MS = 30_000;
const FIX_TIMEOUT_MS = 20_000;
const GRANTED_KEY = 'cus.geoGranted';

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  );
}

async function locationGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state === 'granted';
  } catch {
    // Older Safari can't be asked; remember that a position request succeeded.
    try {
      return localStorage.getItem(GRANTED_KEY) === '1';
    } catch {
      return false;
    }
  }
}

/** Reads the current permissions without asking. */
export async function getTrackingPermissions(): Promise<TrackingPermissions> {
  const needsInstall = isIos() && !isStandalone();
  const [foreground, notifications] = await Promise.all([
    locationGranted(),
    notificationsAllowed(false),
  ]);
  // A browser with no notification support at all (and not an iPhone tab) isn't blocked on it.
  const notificationsOk = notificationsSupported() ? notifications : !needsInstall;
  return {
    foreground,
    background: true,
    notifications: notificationsOk,
    servicesEnabled: true,
    needsInstall,
    ready: foreground && notificationsOk && !needsInstall,
  };
}

/**
 * Asks for what's missing. Must be called from a tap. Notifications go first: iOS only
 * shows that prompt while the tap is still "fresh", and the location prompt would use it up.
 */
export async function requestTrackingPermissions(): Promise<TrackingPermissions> {
  if (!(isIos() && !isStandalone())) await notificationsAllowed(true);
  await new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => {
        try {
          localStorage.setItem(GRANTED_KEY, '1');
        } catch {}
        resolve();
      },
      () => resolve(),
      { enableHighAccuracy: true, timeout: FIX_TIMEOUT_MS }
    );
  });
  return getTrackingPermissions();
}

/** A browser can't open the phone's settings; the permission screen explains where to go. */
export async function openLocationSettings(): Promise<void> {}
export async function openBatterySettings(): Promise<void> {}

let timer: ReturnType<typeof setInterval> | null = null;
let busy = false;
let wakeLock: { release: () => Promise<void> } | null = null;

export async function isTracking(): Promise<boolean> {
  return timer !== null;
}

async function holdScreenAwake() {
  try {
    if (wakeLock || !('wakeLock' in navigator)) return;
    wakeLock = await (navigator as any).wakeLock.request('screen');
    (wakeLock as any).addEventListener?.('release', () => {
      wakeLock = null;
    });
  } catch {
    // Refused (e.g. low battery); tracking still works while the screen is on.
  }
}

function getFix(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
      enableHighAccuracy: true,
      timeout: FIX_TIMEOUT_MS,
      maximumAge: 0,
    })
  );
}

async function tick() {
  if (busy) return;
  busy = true;
  try {
    const fix = await getFix();
    if (!fix || fix.coords.accuracy > MAX_FIX_ACCURACY_M) return;
    const keepGoing = await processLocation(fix.coords.latitude, fix.coords.longitude);
    if (!keepGoing) await stopTracking();
  } finally {
    busy = false;
  }
}

// The phone locks / the app is switched away: the page is frozen. When it comes back,
// grab the wake lock again and catch up immediately instead of waiting for the next beat.
function onVisible() {
  if (document.visibilityState !== 'visible' || timer === null) return;
  holdScreenAwake();
  tick();
}

/** Starts the on-shift location timer. No-op if running. */
export async function startTracking(): Promise<boolean> {
  const permissions = await getTrackingPermissions();
  if (!permissions.foreground) return false;
  if (timer !== null) return true;
  timer = setInterval(tick, TICK_MS);
  document.addEventListener('visibilitychange', onVisible);
  holdScreenAwake();
  tick();
  return true;
}

/** Stops tracking and forgets the shift's alarm state. */
export async function stopTracking(): Promise<void> {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
    document.removeEventListener('visibilitychange', onVisible);
  }
  wakeLock?.release().catch(() => {});
  wakeLock = null;
  await clearShiftMemory();
  await dismissAllNotifications();
}
