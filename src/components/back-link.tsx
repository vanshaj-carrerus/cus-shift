import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './app-text';
import { Icon } from './icon';

export function BackLink({ label = 'Back' }: { label?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={styles.link}>
      <Icon name="arrow-left" size={16} color="muted" />
      <AppText variant="small" color="muted">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 4 },
});
