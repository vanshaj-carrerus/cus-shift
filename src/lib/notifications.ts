import * as Notifications from 'expo-notifications';
import {
  AndroidAudioContentType,
  AndroidAudioUsage,
  AndroidImportance,
  AndroidNotificationVisibility,
} from 'expo-notifications';
import { Platform } from 'react-native';

// Channels can't be changed once created, so a new design means a new id.
export const ALARM_CHANNEL = 'break-alarm-v1';
export const ALERT_CHANNEL = 'outside-alert-v1';

// The alarm sound is bundled by the expo-notifications plugin (see app.json).
const ALARM_SOUND = 'alarm.wav';
export const ALARM_VIBRATION = [0, 800, 400, 800, 400, 800];

let ready: Promise<void> | null = null;

/** Shows notifications while the app is open too, and creates the Android channels. */
export function setupNotifications(): Promise<void> {
  ready ??= (async () => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS !== 'android') return;
    // The alarm rides the alarm audio stream, so it is heard even if the ringer is silent.
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL, {
      name: 'Break over alarm',
      description: 'Rings when your break has ended and you are still outside the office.',
      importance: AndroidImportance.MAX,
      sound: ALARM_SOUND,
      vibrationPattern: ALARM_VIBRATION,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      audioAttributes: {
        usage: AndroidAudioUsage.ALARM,
        contentType: AndroidAudioContentType.SONIFICATION,
      },
    });
    await Notifications.setNotificationChannelAsync(ALERT_CHANNEL, {
      name: 'Outside the office',
      description: 'A reminder when you are away from the office outside your break.',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 250, 400],
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    });
  })();
  return ready;
}

/** True if the user has allowed notifications (asks once if not decided yet and `ask` is set). */
export async function notificationsAllowed(ask = false): Promise<boolean> {
  await setupNotifications();
  let status = await Notifications.getPermissionsAsync();
  if (!status.granted && ask && status.canAskAgain) {
    status = await Notifications.requestPermissionsAsync();
  }
  return status.granted;
}

/** One ring of the break-over alarm. */
export async function ringAlarm(ring: number, silenceAfter: number): Promise<void> {
  await setupNotifications();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Break over — come back to the office',
      body:
        ring >= silenceAfter
          ? 'Your break has ended. Open the app to silence this alarm.'
          : 'Your break has ended and you are still outside the office.',
      sound: ALARM_SOUND,
      vibrate: ALARM_VIBRATION,
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { type: 'alarm' },
    },
    trigger: { channelId: ALARM_CHANNEL },
  });
}

/** The gentler "you're away during work time" notice. */
export async function warnOutside(): Promise<void> {
  await setupNotifications();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'You are outside the office',
      body: 'This is not a break time. Please return to the office. Your admin can see this.',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: { type: 'outside' },
    },
    trigger: { channelId: ALERT_CHANNEL },
  });
}

export function dismissAllNotifications(): Promise<void> {
  return Notifications.dismissAllNotificationsAsync().catch(() => {});
}
