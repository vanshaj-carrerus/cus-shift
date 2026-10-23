import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BackLink } from '@/components/back-link';
import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Radar } from '@/components/radar';
import { Screen } from '@/components/screen';
import { Colors, Radius, Spacing, type ColorName } from '@/constants/theme';
import { recordAttendance, type DayAttendance, type PunchAction } from '@/lib/api';
import { useEmployeeSession } from '@/lib/employee-session';
import { getCurrentCoordinates, LocationError } from '@/lib/location';
import { formatIstDateTime } from '@/lib/time';

type Stage =
  | 'requesting-location'
  | 'submitting'
  | 'success'
  | 'location-denied'
  | 'location-timeout'
  | 'location-unavailable'
  | 'out-of-location'
  | 'already-done'
  | 'not-checked-in'
  | 'error';

const ERROR_STAGES: Stage[] = [
  'location-denied',
  'location-timeout',
  'location-unavailable',
  'out-of-location',
  'error',
];

interface ViewState {
  stage: Stage;
  message: string;
  time: string | null;
  /** Permission was denied and the OS won't ask again — send the user to Settings. */
  canOpenSettings: boolean;
}

const INITIAL_VIEW: ViewState = {
  stage: 'requesting-location',
  message: 'Requesting your location…',
  time: null,
  canOpenSettings: false,
};

const WORDS = {
  in: { title: 'Check-In', noun: 'Check-in', done: 'checked in' },
  out: { title: 'Check-Out', noun: 'Check-out', done: 'checked out' },
} as const;

/**
 * The whole flow: GPS fix → server verification (which also confirms the
 * signed-in employee is inside the office). Reports progress through `update`;
 * `isStale` lets the screen drop results from a run the user has left or retried.
 */
async function performPunch(
  action: PunchAction,
  isStale: () => boolean,
  update: (view: ViewState) => void,
  onRecorded: (attendance: DayAttendance) => void
): Promise<void> {
  const words = WORDS[action];
  const show = (stage: Stage, message: string, extra: Partial<ViewState> = {}) =>
    update({ ...INITIAL_VIEW, stage, message, ...extra });

  let coords;
  try {
    coords = await getCurrentCoordinates();
  } catch (e) {
    if (isStale()) return;
    const reason = e instanceof LocationError ? e.reason : 'unavailable';
    if (reason === 'denied') {
      show(
        'location-denied',
        'Location permission was denied. Please allow location access for this app and try again.',
        { canOpenSettings: e instanceof LocationError && !e.canAskAgain }
      );
    } else if (reason === 'timeout') {
      show('location-timeout', 'Getting your location timed out. Move to an area with better GPS signal and retry.');
    } else {
      show('location-unavailable', 'Could not determine your location. Check that GPS/location services are turned on.');
    }
    return;
  }
  if (isStale()) return;

  show('submitting', 'Verifying your location…');

  const result = await recordAttendance(action, coords.latitude, coords.longitude);
  if (isStale()) return;

  switch (result.kind) {
    case 'success':
      onRecorded(result.attendance);
      if (action === 'in') {
        show(
          'success',
          result.attendance.status === 'LATE' ? 'Checked in — marked Late.' : 'Checked in — On Time!',
          { time: result.attendance.checkInTime }
        );
      } else {
        show('success', 'Checked out — see you tomorrow!', { time: result.attendance.checkOutTime ?? null });
      }
      break;
    case 'already':
      onRecorded(result.attendance);
      show('already-done', `You've already ${words.done} today.`, {
        time: (action === 'in' ? result.attendance.checkInTime : result.attendance.checkOutTime) ?? null,
      });
      break;
    case 'not-checked-in':
      show('not-checked-in', "You haven't checked in today, so there's nothing to check out of.");
      break;
    case 'out-of-location':
      // Deliberately nothing is recorded as done: a rejected attempt isn't a
      // check-in/out, and the employee must be able to retry from the office.
      show(
        'out-of-location',
        `You're ${Math.round(result.distanceFromOffice)}m from the office (allowed: ${result.allowedRadius}m). ${words.noun} rejected.`
      );
      break;
    case 'error':
      show('error', result.message);
      break;
  }
}

export default function PunchScreen() {
  const { action: actionParam } = useLocalSearchParams<{ action: string }>();
  const action: PunchAction | null = actionParam === 'in' || actionParam === 'out' ? actionParam : null;

  const { employee, setAttendance, refresh } = useEmployeeSession();
  const [view, setView] = useState<ViewState>(INITIAL_VIEW);
  const { stage, message, time, canOpenSettings } = view;

  // Bumped by "Try Again" to re-run the flow.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!action) return;
    // Drops results from a run the user has left or retried (slow GPS fix, slow network).
    let cancelled = false;
    performPunch(action, () => cancelled, setView, setAttendance);
    return () => {
      cancelled = true;
    };
  }, [action, attempt, setAttendance]);

  // The only invalid way in is a hand-typed link.
  if (!action) return <Redirect href="/" />;

  function retry() {
    setView(INITIAL_VIEW);
    setAttempt((n) => n + 1);
  }

  function backToDashboard() {
    // "Nothing to check out of" means the dashboard was stale: reload it.
    if (stage === 'not-checked-in') refresh();
    router.replace('/');
  }

  const isLoading = stage === 'requesting-location' || stage === 'submitting';
  const isError = ERROR_STAGES.includes(stage);
  const isFinished = stage === 'success' || stage === 'already-done' || stage === 'not-checked-in';
  const dotColor: ColorName = isError ? 'danger' : stage === 'success' ? 'accent' : 'accentText';

  return (
    <Screen scroll center>
      <BackLink />
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.dot, { backgroundColor: Colors[dotColor] }]} />
          <View>
            <AppText variant="label" style={styles.headerTitle}>
              Employee {WORDS[action].title}
            </AppText>
            <AppText variant="mono" color="muted" style={styles.headerSub}>
              {employee?.department ? `${employee.department} · ` : ''}Geofence verification
            </AppText>
          </View>
        </View>

        <View style={styles.body} accessibilityLiveRegion="polite">
          {isLoading && (
            <View style={styles.stack}>
              <Radar />
              <View style={styles.textCenter}>
                <AppText variant="heading">Verifying your location…</AppText>
                <AppText variant="body" color="muted" style={styles.sub}>
                  {message}
                </AppText>
              </View>
            </View>
          )}

          {stage === 'success' && <StatusPanel icon="circle-check" tone="success" message={message} time={time} />}

          {stage === 'already-done' && <StatusPanel icon="info" tone="info" message={message} time={time} />}

          {stage === 'not-checked-in' && <StatusPanel icon="info" tone="info" message={message} time={null} />}

          {isFinished && <Button label="Done" onPress={backToDashboard} style={styles.done} />}

          {isError && (
            <View style={styles.stack}>
              <View style={[styles.badge, { backgroundColor: Colors.dangerBg }]}>
                <Icon name="triangle-alert" size={28} color="danger" />
              </View>
              <AppText variant="body" color="danger" style={[styles.textCenter, styles.errorText]}>
                {message}
              </AppText>
              <View style={styles.actions}>
                {canOpenSettings && (
                  <Button
                    label="Open Settings"
                    icon="settings"
                    variant="secondary"
                    onPress={() => Linking.openSettings()}
                  />
                )}
                <Button label="Try Again" icon="rotate-ccw" onPress={retry} />
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Icon name="lock" size={12} color="muted" />
          <AppText variant="mono" color="muted">
            Geofence-verified
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

function StatusPanel({
  icon,
  tone,
  message,
  time,
}: {
  icon: IconName;
  tone: 'success' | 'info';
  message: string;
  time: string | null;
}) {
  return (
    <View style={styles.stack}>
      <View style={[styles.badge, { backgroundColor: tone === 'success' ? Colors.successBg : Colors.infoBg }]}>
        <Icon name={icon} size={30} color={tone} />
      </View>
      <AppText variant="heading" color={tone} style={styles.textCenter}>
        {message}
      </AppText>
      {time ? (
        <AppText variant="mono" color="muted">
          {formatIstDateTime(time)}
        </AppText>
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
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  headerTitle: { fontWeight: '600' },
  headerSub: { fontSize: 11 },
  body: { padding: Spacing.five, minHeight: 240, justifyContent: 'center', gap: Spacing.three },
  stack: { alignItems: 'center', gap: Spacing.three },
  textCenter: { alignItems: 'center', textAlign: 'center' },
  sub: { marginTop: 4, textAlign: 'center' },
  errorText: { fontWeight: '500' },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { alignSelf: 'stretch', gap: Spacing.two },
  done: { alignSelf: 'stretch' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: Colors.surface2,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
