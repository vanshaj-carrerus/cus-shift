import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { AttendanceStatus } from '@/lib/api';

import { AppText } from './app-text';

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  ON_TIME: 'On Time',
  LATE: 'Late',
  OUT_OF_LOCATION: 'Out of Location',
};

const STATUS_STYLES = {
  ON_TIME: { color: 'success', bg: Colors.successBg, border: 'rgba(59,130,246,0.3)' },
  LATE: { color: 'warning', bg: Colors.warningBg, border: 'rgba(251,191,36,0.3)' },
  OUT_OF_LOCATION: { color: 'danger', bg: Colors.dangerBg, border: 'rgba(248,113,113,0.3)' },
} as const;

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }]}>
      <AppText variant="small" color={s.color} style={styles.text}>
        {STATUS_LABELS[status]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: { fontWeight: '500', lineHeight: 16 },
});
