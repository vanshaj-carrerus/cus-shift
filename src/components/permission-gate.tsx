import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  getTrackingPermissions,
  openLocationSettings,
  requestTrackingPermissions,
  type TrackingPermissions,
} from '@/lib/tracking';

import { AppText } from './app-text';
import { Button } from './button';
import { Icon } from './icon';
import { Screen } from './screen';

/**
 * Keeps the app unusable until every permission the shift tracking needs is on:
 * location, location "all the time", notifications and the phone's location switch.
 * Shown as an overlay (not instead of the app) so navigation state survives. It
 * re-checks whenever the app returns from system settings.
 */
export function PermissionGate({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<TrackingPermissions | null>(null);
  const [asking, setAsking] = useState(false);

  const check = useCallback(() => getTrackingPermissions().then(setPermissions).catch(() => {}), []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => sub.remove();
  }, [check]);

  async function allow() {
    setAsking(true);
    try {
      setPermissions(await requestTrackingPermissions());
    } finally {
      setAsking(false);
    }
  }

  const blocked = permissions !== null && !permissions.ready;

  return (
    <View style={styles.fill}>
      {children}
      {blocked ? (
        <View style={styles.overlay}>
          <Screen scroll center>
            <View style={styles.card}>
              <View style={styles.badge}>
                <Icon name="triangle-alert" size={28} color="warning" />
              </View>
              <AppText variant="heading" style={styles.center}>
                Permissions required
              </AppText>
              <AppText variant="body" color="muted" style={styles.center}>
                CUS Shift can&apos;t be used until all of these are allowed. Your location is tracked
                while you are on shift, and stops when you check out.
              </AppText>

              <View style={styles.list}>
                <Row ok={permissions.servicesEnabled} label="Phone location switched on" />
                <Row ok={permissions.foreground} label="Location access" />
                <Row ok={permissions.background} label={'Location: "Allow all the time"'} />
                <Row ok={permissions.notifications} label="Notifications" />
              </View>

              {!permissions.servicesEnabled ? (
                <Button label="Turn on location" icon="map-pin" onPress={openLocationSettings} />
              ) : (
                <Button label="Allow permissions" icon="map-pin" onPress={allow} loading={asking} />
              )}
              <Button
                label="Open app settings"
                icon="settings"
                variant="secondary"
                onPress={() => Linking.openSettings().catch(() => {})}
              />
              <AppText variant="small" color="muted" style={styles.center}>
                If a prompt doesn&apos;t appear, open app settings, then Permissions, and choose
                &quot;Allow all the time&quot; for Location and allow Notifications.
              </AppText>
            </View>
          </Screen>
        </View>
      ) : null}
    </View>
  );
}

function Row({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={styles.row}>
      <Icon name={ok ? 'circle-check' : 'circle-alert'} size={16} color={ok ? 'success' : 'danger'} />
      <AppText variant="small" color={ok ? 'foreground' : 'danger'} style={styles.grow}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: Colors.background },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  badge: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warningBg,
  },
  center: { textAlign: 'center' },
  list: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two + 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  grow: { flex: 1 },
});
