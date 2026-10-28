import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useNow } from '@/hooks/use-alarm';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { DayAttendance, Schedule } from '@/lib/api';
import { nextBreak } from '@/lib/presence-logic';
import { formatIstHm } from '@/lib/time';
import {
  getTrackingPermissions,
  openBatterySettings,
  openLocationSettings,
  requestTrackingPermissions,
  startTracking,
  type TrackingPermissions,
} from '@/lib/tracking';

import { AppText } from './app-text';
import { Button } from './button';
import { Icon } from './icon';

function countdown(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/**
 * The employee's shift and today's fixed break times, plus (once checked in) the
 * permissions the break alarms need. Breaks can't be started or ended — they
 * simply happen at these times.
 */
export function ShiftCard({
  schedule,
  attendance,
}: {
  schedule: Schedule | null;
  attendance: DayAttendance | null;
}) {
  const now = useNow(30_000);
  const [permissions, setPermissions] = useState<TrackingPermissions | null>(null);
  const [asking, setAsking] = useState(false);

  const shift = schedule?.shift ?? null;
  const onShift = Boolean(attendance && !attendance.checkOutTime && shift?.start);

  // Re-read the permissions whenever the screen is shown (the user may have just
  // changed them in system settings).
  useFocusEffect(
    useCallback(() => {
      let live = true;
      getTrackingPermissions().then((p) => live && setPermissions(p));
      return () => {
        live = false;
      };
    }, [])
  );

  async function allow() {
    setAsking(true);
    try {
      const next = await requestTrackingPermissions();
      setPermissions(next);
      if (next.ready && onShift) await startTracking();
    } finally {
      setAsking(false);
    }
  }

  if (!schedule || !shift) {
    return (
      <View style={styles.card}>
        <View style={styles.headRow}>
          <Icon name="clock" size={16} color="muted" />
          <AppText variant="label">Your shift</AppText>
        </View>
        <AppText variant="small" color="muted">
          No shift is assigned to you yet. Ask your admin to set one up.
        </AppText>
      </View>
    );
  }

  const overnight = shift.endTime <= shift.startTime;
  const upcoming = nextBreak(schedule, now);

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Icon name="clock" size={16} color="accentText" />
        <AppText variant="label" style={styles.grow}>
          {shift.name}
        </AppText>
        <AppText variant="mono" color="muted">
          {shift.startTime} – {shift.endTime} IST{overnight ? ' (+1)' : ''}
        </AppText>
      </View>

      {schedule.breaks.length === 0 ? (
        <AppText variant="small" color="muted">
          No scheduled breaks.
        </AppText>
      ) : (
        <View style={styles.breaks}>
          {schedule.breaks.map((b) => {
            const start = new Date(b.start).getTime();
            const end = new Date(b.end).getTime();
            const live = now >= start && now < end;
            const past = now >= end;
            return (
              <View key={`${b.name}-${b.start}`} style={[styles.breakRow, live && styles.breakLive]}>
                <Icon name="coffee" size={14} color={live ? 'accentText' : 'muted'} />
                <AppText variant="small" color={past ? 'muted' : 'foreground'} style={styles.grow}>
                  {b.name}
                  {live ? '  · now' : ''}
                </AppText>
                <AppText variant="mono" color={past ? 'muted' : 'foreground'}>
                  {formatIstHm(b.start)} – {formatIstHm(b.end)}
                </AppText>
              </View>
            );
          })}
        </View>
      )}

      {upcoming ? (
        <AppText variant="small" color="muted">
          {now >= new Date(upcoming.start).getTime()
            ? `${upcoming.name} ends in ${countdown(new Date(upcoming.end).getTime() - now)}.`
            : `Next break: ${upcoming.name} in ${countdown(new Date(upcoming.start).getTime() - now)}.`}{' '}
          Be back inside by the time it ends — an alarm rings if you aren&apos;t.
        </AppText>
      ) : null}

      {onShift && permissions && !permissions.ready ? (
        <View style={styles.permission}>
          <View style={styles.headRow}>
            <Icon name="triangle-alert" size={16} color="warning" />
            <AppText variant="label" color="warning">
              {permissions.servicesEnabled ? 'Turn on break alarms' : 'Turn on your location'}
            </AppText>
          </View>
          {!permissions.servicesEnabled ? (
            <>
              <AppText variant="small" color="muted">
                Your phone&apos;s location is switched off. You are on shift and CUS Headoffice tracks your
                location, so please turn location on now.
              </AppText>
              <Button label="Turn on location" icon="map-pin" onPress={openLocationSettings} />
            </>
          ) : null}
          <AppText variant="small" color="muted">
            While you are checked in, the app checks whether you are in the office so it can warn you
            and ring the alarm when a break ends. CUS Headoffice can see where you are while you are outside the office area.{' '}
            {Platform.OS === 'web' ? (
              'Allow location and notifications, and keep the app open on screen while you are on shift.'
            ) : (
              <>
                Choose{' '}
                <AppText variant="small" color="foreground">
                  &quot;Allow all the time&quot;
                </AppText>{' '}
                for location, and allow notifications.
              </>
            )}{' '}
            Tracking stops when you check out.
          </AppText>
          {permissions.servicesEnabled ? (
            <Button label="Allow" icon="map-pin" onPress={allow} loading={asking} />
          ) : null}
        </View>
      ) : null}

      {onShift && permissions?.ready ? (
        <View style={styles.tracking}>
          <Icon name="radar" size={14} color="success" />
          <AppText variant="small" color="muted" style={styles.grow}>
            {Platform.OS === 'web'
              ? 'Break alarms are on while this app is open. Keep it open on screen.'
              : 'Break alarms are on.'}
          </AppText>
          {Platform.OS === 'web' ? null : (
            <AppText
              variant="small"
              color="accentText"
              onPress={openBatterySettings}
              accessibilityRole="button">
              Keep reliable
            </AppText>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.three,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  grow: { flex: 1 },
  breaks: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
  },
  breakLive: { backgroundColor: Colors.infoBg, marginHorizontal: -Spacing.three, paddingHorizontal: Spacing.three },
  permission: {
    gap: Spacing.two + 2,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.three,
  },
  tracking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.three,
  },
});
