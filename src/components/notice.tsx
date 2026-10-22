import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { AppText } from './app-text';
import { Icon } from './icon';

/** Inline error banner (mirrors the web app's red `role="alert"` boxes). */
export function ErrorNotice({ message }: { message: string }) {
  return (
    <View accessibilityRole="alert" style={styles.box}>
      <View style={styles.icon}>
        <Icon name="circle-alert" size={15} color="danger" />
      </View>
      <AppText variant="small" color="danger" style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
    backgroundColor: Colors.dangerBg,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  icon: { marginTop: 2 },
  text: { flex: 1, lineHeight: 19 },
});
