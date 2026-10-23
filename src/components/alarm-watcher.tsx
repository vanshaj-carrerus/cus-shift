import * as Notifications from 'expo-notifications';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAlarm } from '@/hooks/use-alarm';

/**
 * Brings the alarm screen up whenever the break-over alarm is ringing and the
 * app is open, and when the employee taps the alarm notification. Renders nothing.
 */
export function AlarmWatcher() {
  const alarm = useAlarm(2000);
  const pathname = usePathname();
  const tapped = Notifications.useLastNotificationResponse();

  const ringing = Boolean(alarm && !alarm.silenced);

  useEffect(() => {
    if (ringing && pathname !== '/alarm' && AppState.currentState === 'active') {
      router.push('/alarm');
    }
    // A new ring (or a new overstayed break) should re-open it if it was dismissed.
  }, [ringing, alarm?.overrunSince, alarm?.rings, pathname]);

  useEffect(() => {
    const type = tapped?.notification.request.content.data?.type;
    if (type === 'alarm' && pathname !== '/alarm') router.push('/alarm');
    // Only react to a new tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapped?.notification.request.identifier]);

  return null;
}
