import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAlarm } from '@/hooks/use-alarm';

/**
 * Web version of alarm-watcher.tsx: brings the alarm screen up whenever the break-over
 * alarm is ringing and the app is open, and when the employee taps the alarm notification
 * (the service worker forwards the tap as a message). Renders nothing.
 */
export function AlarmWatcher() {
  const alarm = useAlarm(2000);
  const pathname = usePathname();

  const ringing = Boolean(alarm && !alarm.silenced);

  useEffect(() => {
    if (ringing && pathname !== '/alarm' && AppState.currentState === 'active') {
      router.push('/alarm');
    }
    // A new ring (or a new overstayed break) should re-open it if it was dismissed.
  }, [ringing, alarm?.overrunSince, alarm?.rings, pathname]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'notification-click' && event.data.data?.type === 'alarm') {
        router.push('/alarm');
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  return null;
}
