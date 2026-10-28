// Web (PWA) version of notifications.ts. Notifications are shown through the service
// worker (public/sw.js), the only way iOS allows them, and only once the app is
// installed to the Home Screen (iOS 16.4+). There are no "channels" on the web, and
// the alarm's loud looping sound is played by the alarm screen itself (alarm-sound.web.ts):
// a web notification can only use the phone's default sound.

import { registerPushToken } from './api';

export const ALARM_CHANNEL = 'break-alarm-v1';
export const ALERT_CHANNEL = 'outside-alert-v1';
export const ALARM_VIBRATION = [0, 800, 400, 800, 400, 800];

const ICON = '/icon-192.png';

export function notificationsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

let ready: Promise<ServiceWorkerRegistration | null> | null = null;

/** Registers the service worker that shows notifications and receives admin alerts. */
export function setupNotifications(): Promise<ServiceWorkerRegistration | null> {
  ready ??= (async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
    try {
      await navigator.serviceWorker.register('/sw.js');
      return await navigator.serviceWorker.ready;
    } catch {
      return null;
    }
  })();
  return ready;
}

/** True if the user has allowed notifications (asks once if not decided yet and `ask` is set). */
export async function notificationsAllowed(ask = false): Promise<boolean> {
  if (!notificationsSupported()) return false;
  let permission = Notification.permission;
  if (permission === 'default' && ask) permission = await Notification.requestPermission();
  return permission === 'granted';
}

async function show(title: string, options: Record<string, unknown>) {
  if (!(await notificationsAllowed(false))) return;
  const registration = await setupNotifications();
  await registration?.showNotification(title, { icon: ICON, badge: ICON, ...options });
}

/** One ring of the break-over alarm. */
export async function ringAlarm(ring: number, silenceAfter: number): Promise<void> {
  await show('Break over — come back to the office', {
    body:
      ring >= silenceAfter
        ? 'Your break has ended. Open the app to silence this alarm.'
        : 'Your break has ended and you are still outside the office.',
    tag: 'alarm',
    renotify: true,
    requireInteraction: true,
    vibrate: ALARM_VIBRATION,
    data: { type: 'alarm' },
  });
}

/** The gentler "you're away during work time" notice. */
export async function warnOutside(): Promise<void> {
  await show('You are outside the office', {
    body: 'This is not a break time. Please return to the office. Your admin can see this.',
    tag: 'outside',
    renotify: true,
    vibrate: [0, 400, 250, 400],
    data: { type: 'outside' },
  });
}

export async function dismissAllNotifications(): Promise<void> {
  try {
    const registration = await setupNotifications();
    const open = (await registration?.getNotifications()) ?? [];
    open.forEach((n) => n.close());
  } catch {
    // Nothing to clear.
  }
}

function applicationServerKey(base64Url: string): Uint8Array {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * Lets the admin's alerts reach this phone: subscribes to Web Push and gives the
 * subscription to the server. Quietly does nothing if notifications are refused or the
 * deployment has no VAPID key (EXPO_PUBLIC_VAPID_PUBLIC_KEY).
 */
export async function registerForAdminAlerts(): Promise<void> {
  try {
    const key = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    if (!key || !(await notificationsAllowed(false))) return;
    const registration = await setupNotifications();
    if (!registration) return;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(key) as BufferSource,
      }));
    await registerPushToken({ subscription: subscription.toJSON() });
  } catch {
    // Push isn't available here; alerts just won't arrive.
  }
}
