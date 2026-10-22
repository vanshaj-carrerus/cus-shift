import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type Variant = 'primary' | 'secondary' | 'danger';

export function Button({
  label,
  onPress,
  icon,
  iconRight,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  iconRight?: IconName;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const inactive = disabled || loading;
  const fg = variant === 'primary' ? 'accentForeground' : variant === 'danger' ? 'foreground' : 'foreground';
  const textColor = inactive && variant === 'primary' ? 'muted' : fg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        inactive && variant === 'primary' && styles.primaryDisabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}>
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors[textColor]} />
        ) : icon ? (
          <Icon name={icon} size={16} color={textColor} />
        ) : null}
        <AppText variant="label" color={textColor}>
          {label}
        </AppText>
        {iconRight && !loading ? <Icon name={iconRight} size={16} color={textColor} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  primary: { backgroundColor: Colors.accent },
  primaryDisabled: { backgroundColor: Colors.surface2 },
  secondary: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  danger: { backgroundColor: Colors.danger },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
