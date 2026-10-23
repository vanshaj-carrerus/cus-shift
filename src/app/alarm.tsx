import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Vibration, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAlarm } from '@/hooks/use-alarm';
import { saveAlarm } from '@/lib/alarm-state';
import { useEmployeeSession } from '@/lib/employee-session';
import { ALARM_VIBRATION, dismissAllNotifications } from '@/lib/notifications';

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

// Shown (and sounded) while the employee is still outside after a break has
// ended. It can only be silenced after it has rung enough times, and it stops by
// itself as soon as they are back inside.
export default function AlarmScreen() {
  const { schedule } = useEmployeeSession();
  const alarm = useAlarm(1000);

  const silenceAfter = schedule?.alarm.ringsBeforeSilence ?? 5;
  const intervalMinutes = schedule?.alarm.intervalMinutes ?? 2;
  const rings = alarm?.rings ?? 0;
  const ringing = Boolean(alarm && !alarm.silenced);
  const canSilence = rings >= silenceAfter;

  // Loud looping sound and vibration for as long as the alarm is active.
  useEffect(() => {
    if (!ringing) return;
    const player = createAudioPlayer(require('@/assets/sounds/alarm.wav'));
    player.loop = true;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    player.play();
    Vibration.vibrate(ALARM_VIBRATION, true);
    return () => {
      Vibration.cancel();
      player.pause();
      player.remove();
    };
  }, [ringing]);

  async function silence() {
    if (!alarm || !canSilence) return;
    await saveAlarm({ ...alarm, silenced: true });
    await dismissAllNotifications();
    leave();
  }

  // Back inside (the task cleared the alarm): nothing left to do here.
  if (!alarm) {
    return (
      <Screen center>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: Colors.successBg }]}>
            <Icon name="circle-check" size={30} color="success" />
          </View>
          <AppText variant="heading">Alarm stopped</AppText>
          <AppText variant="body" color="muted" style={styles.center}>
            You&apos;re back in the office area. Thank you.
          </AppText>
          <Button label="Done" onPress={leave} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen center>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Icon name="bell-ring" size={30} color="danger" />
        </View>
        <AppText variant="title" style={styles.center}>
          Break over
        </AppText>
        <AppText variant="body" color="muted" style={styles.center}>
          Your break has ended and you are still outside the office. Please come back now. Your admin
          can see this.
        </AppText>

        <View style={styles.rings}>
          <AppText variant="mono" color="muted">
            RINGS
          </AppText>
          <AppText variant="heading">{rings}</AppText>
        </View>

        {alarm.silenced ? (
          <AppText variant="small" color="muted" style={styles.center}>
            Alarm silenced. It starts again for your next break.
          </AppText>
        ) : canSilence ? (
          <Button label="Silence alarm" icon="bell-off" onPress={silence} />
        ) : (
          <AppText variant="small" color="muted" style={styles.center}>
            You can silence this after {silenceAfter} rings ({silenceAfter - rings} more, about{' '}
            {(silenceAfter - rings) * intervalMinutes} min). It stops by itself when you are back
            inside.
          </AppText>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'stretch',
  },
  iconWrap: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  rings: { alignItems: 'center', gap: 2 },
});
