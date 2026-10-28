import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Brand } from '@/components/brand';
import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ShiftCard } from '@/components/shift-card';
import { StatusBadge } from '@/components/status-badge';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useEmployeeSession } from '@/lib/employee-session';
import { formatIstDate, formatIstTime, istDateKey } from '@/lib/time';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

// The app's home for a signed-in employee (the root layout shows the sign-in
// screen instead whenever nobody is signed in).
export default function HomeScreen() {
  const { employee, attendance, schedule, update, signOut, refresh } = useEmployeeSession();
  const [signingOut, setSigningOut] = useState(false);

  // Re-read today's attendance whenever this screen comes into view, so it's
  // right after a check-in/out and after the app has been left open overnight.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (!employee) return null;

  const checkedIn = attendance !== null;
  const checkedOut = Boolean(attendance?.checkOutTime);

  return (
    <Screen scroll>
      <Brand />

      {/* The installed web app always loads the latest version, so it never shows an APK update. */}
      {Platform.OS !== 'web' && update?.available && update.url ? (
        <View style={styles.update}>
          <View style={styles.updateHead}>
            <Icon name="triangle-alert" size={16} color="warning" />
            <AppText variant="label" color="warning" style={styles.updateTitle}>
              Update available{update.latestVersion ? ` (v${update.latestVersion})` : ''}
            </AppText>
          </View>
          <AppText variant="small" color="muted">
            {update.message ?? 'A newer version of this app is available. Please install it.'}
          </AppText>
          <Button
            label="Install update"
            icon="log-in"
            onPress={() => Linking.openURL(update.url as string).catch(() => {})}
          />
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <AppText variant="label" color="accentText">
              {initials(employee.name)}
            </AppText>
          </View>
          <View style={styles.profileText}>
            <AppText variant="body" style={styles.name} numberOfLines={1}>
              {employee.name}
            </AppText>
            {employee.email ? (
              <AppText variant="small" color="muted" numberOfLines={1}>
                {employee.email}
              </AppText>
            ) : null}
            <AppText variant="small" color="muted" numberOfLines={1}>
              {employee.department ?? 'No department assigned'}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            disabled={signingOut}
            hitSlop={8}
            onPress={async () => {
              setSigningOut(true);
              await signOut();
              setSigningOut(false);
            }}
            style={[styles.signOut, signingOut && styles.disabled]}>
            <Icon name="log-out" size={16} color="muted" />
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View>
          <AppText variant="mono" color="muted" style={styles.kicker}>
            TODAY
          </AppText>
          <AppText variant="heading">{formatIstDate(istDateKey())}</AppText>
        </View>

        <View style={styles.times}>
          <TimeRow
            icon="log-in"
            label="Checked in"
            time={attendance?.checkInTime}
            badge={attendance ? <StatusBadge status={attendance.status} /> : null}
          />
          <TimeRow icon="log-out" label="Checked out" time={attendance?.checkOutTime} />
        </View>

        {checkedOut ? (
          <View style={styles.done}>
            <Icon name="circle-check" size={18} color="success" />
            <AppText variant="body" color="success">
              You&apos;re done for today.
            </AppText>
          </View>
        ) : checkedIn ? (
          <Button label="Check out" icon="log-out" onPress={() => router.push('/checkin/out')} />
        ) : (
          <Button label="Check in" icon="log-in" onPress={() => router.push('/checkin/in')} />
        )}

        <View style={styles.footnote}>
          <Icon name="map-pin" size={15} color="muted" />
          <AppText variant="small" color="muted" style={styles.footnoteText}>
            Checking in and out only works from inside the office area. Your location is read when you
            tap the button.
          </AppText>
        </View>
      </View>

      <ShiftCard schedule={schedule} attendance={attendance} />
    </Screen>
  );
}

function TimeRow({
  icon,
  label,
  time,
  badge,
}: {
  icon: IconName;
  label: string;
  time?: string | null;
  badge?: React.ReactNode;
}) {
  return (
    <View style={styles.timeRow}>
      <Icon name={icon} size={16} color={time ? 'accentText' : 'muted'} />
      <AppText variant="body" color={time ? 'foreground' : 'muted'} style={styles.timeLabel}>
        {label}
      </AppText>
      {badge}
      <AppText variant="mono" color={time ? 'foreground' : 'muted'}>
        {time ? formatIstTime(time) : '—'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.four,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  update: {
    marginTop: Spacing.four,
    gap: Spacing.two + 2,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: Radius.xl,
    padding: Spacing.four,
  },
  updateHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  updateTitle: { flex: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  profileText: { flex: 1 },
  name: { fontWeight: '600' },
  signOut: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  disabled: { opacity: 0.5 },
  divider: { height: 1, backgroundColor: Colors.border },
  kicker: { fontSize: 10, letterSpacing: 0.6 },
  times: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    minHeight: 52,
  },
  timeLabel: { flex: 1 },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.successBg,
  },
  footnote: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.three,
  },
  footnoteText: { flex: 1 },
});
