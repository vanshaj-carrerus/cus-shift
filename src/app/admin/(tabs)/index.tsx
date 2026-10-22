import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { AdminPage } from '@/components/admin-page';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { DatePickerButton } from '@/components/date-picker-button';
import { Icon, type IconName } from '@/components/icon';
import { ErrorNotice } from '@/components/notice';
import { StatusBadge } from '@/components/status-badge';
import { Colors, Radius, Spacing, type ColorName } from '@/constants/theme';
import { useFetch } from '@/hooks/use-fetch';
import { fetchAttendance, type AttendanceRecord } from '@/lib/api';
import { formatIstDate, formatIstTime, istDateKey, shiftDateKey } from '@/lib/time';

export default function AdminDashboardScreen() {
  const [dateKey, setDateKey] = useState(() => istDateKey());
  const fetcher = useCallback(() => fetchAttendance(dateKey), [dateKey]);
  const { data: records, error, refreshing, retry, refresh } = useFetch<AttendanceRecord[]>(fetcher);

  const list = records ?? [];
  const stats: { label: string; value: number; icon: IconName; color: ColorName; bg: string }[] = [
    { label: 'Total check-ins', value: list.length, icon: 'calendar-days', color: 'accentText', bg: 'rgba(59,130,246,0.1)' },
    { label: 'On time', value: list.filter((r) => r.status === 'ON_TIME').length, icon: 'circle-check', color: 'success', bg: Colors.successBg },
    { label: 'Late', value: list.filter((r) => r.status === 'LATE').length, icon: 'clock', color: 'warning', bg: Colors.warningBg },
    { label: 'Out of location', value: list.filter((r) => r.status === 'OUT_OF_LOCATION').length, icon: 'map-pin-off', color: 'danger', bg: Colors.dangerBg },
  ];

  const isToday = dateKey === istDateKey();

  return (
    <AdminPage refreshing={refreshing} onRefresh={refresh}>
      <View>
        <AppText variant="title">Attendance Dashboard</AppText>
        <AppText variant="small" color="muted">
          {formatIstDate(dateKey)} · IST
        </AppText>
      </View>

      <View style={styles.dateRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          hitSlop={8}
          onPress={() => setDateKey(shiftDateKey(dateKey, -1))}
          style={styles.navBtn}>
          <Icon name="chevron-left" size={18} color="foreground" />
        </Pressable>
        <DatePickerButton value={dateKey} onChange={setDateKey} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          hitSlop={8}
          onPress={() => setDateKey(shiftDateKey(dateKey, 1))}
          style={styles.navBtn}>
          <Icon name="chevron-right" size={18} color="foreground" />
        </Pressable>
        {!isToday && (
          <Pressable accessibilityRole="button" onPress={() => setDateKey(istDateKey())} hitSlop={8}>
            <AppText variant="label" color="accentText">
              Today
            </AppText>
          </Pressable>
        )}
      </View>

      <View style={styles.grid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <View style={[styles.statIcon, { backgroundColor: stat.bg }]}>
              <Icon name={stat.icon} size={16} color={stat.color} />
            </View>
            <AppText style={styles.statValue}>{records === null ? '–' : stat.value}</AppText>
            <AppText variant="small" color="muted">
              {stat.label}
            </AppText>
          </View>
        ))}
      </View>

      {error ? (
        <View style={styles.gap}>
          <ErrorNotice message={error} />
          <Button label="Try again" icon="rotate-ccw" variant="secondary" onPress={retry} />
        </View>
      ) : records === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.accentText} />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="body" color="muted">
            No check-ins for this date.
          </AppText>
        </View>
      ) : (
        <View style={styles.gap}>
          {records.map((record) => (
            <RecordCard key={record._id} record={record} />
          ))}
        </View>
      )}
    </AdminPage>
  );
}

function RecordCard({ record }: { record: AttendanceRecord }) {
  const outOfLocation = record.status === 'OUT_OF_LOCATION';
  const mapsUrl = `https://www.google.com/maps?q=${record.latitude},${record.longitude}`;

  return (
    <View style={[styles.record, outOfLocation && styles.recordOut]}>
      <View style={styles.recordTop}>
        <AppText variant="body" style={styles.name} numberOfLines={1}>
          {record.userId?.name ?? 'Unknown employee'}
        </AppText>
        <StatusBadge status={record.status} />
      </View>
      <View style={styles.recordMeta}>
        <View style={styles.metaItem}>
          <Icon name="clock" size={13} color="muted" />
          <AppText variant="small" color="muted">
            {formatIstTime(record.checkInTime)}
          </AppText>
        </View>
        {record.checkOutTime ? (
          <View style={styles.metaItem}>
            <Icon name="log-out" size={13} color="muted" />
            <AppText variant="small" color="muted">
              {formatIstTime(record.checkOutTime)}
            </AppText>
          </View>
        ) : null}
        <AppText variant="small" color="muted">
          {Math.round(record.distanceFromOffice)}m from office
        </AppText>
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Open location in maps"
        onPress={() => Linking.openURL(mapsUrl)}
        hitSlop={6}
        style={styles.coords}>
        <Icon name={outOfLocation ? 'map-pin-off' : 'map-pin'} size={13} color="accentText" />
        <AppText variant="mono" color="accentText">
          {record.latitude.toFixed(5)}, {record.longitude.toFixed(5)}
        </AppText>
        <Icon name="external-link" size={11} color="accentText" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 2 },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two + 4 },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: 2,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: { fontSize: 28, lineHeight: 34, fontWeight: '600', color: Colors.foreground },
  gap: { gap: Spacing.two + 4 },
  loading: { paddingVertical: Spacing.five, alignItems: 'center' },
  empty: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  record: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  recordOut: { backgroundColor: Colors.dangerBg, borderColor: 'rgba(248,113,113,0.3)' },
  recordTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  name: { flex: 1, fontWeight: '600' },
  recordMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coords: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 2 },
});
