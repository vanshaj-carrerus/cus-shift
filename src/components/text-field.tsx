import type { ReactNode, Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export function TextField({
  label,
  icon,
  right,
  invalid,
  style,
  ref,
  ...rest
}: TextInputProps & {
  ref?: Ref<TextInputInstance>;
  label?: string;
  icon?: IconName;
  /** Element pinned to the right edge (e.g. a show/hide password toggle). */
  right?: ReactNode;
  invalid?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View style={[styles.field, invalid && styles.invalid]}>
        {icon ? (
          <View style={styles.icon}>
            <Icon name={icon} size={16} color="muted" />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={Colors.muted}
          selectionColor={Colors.accent}
          style={[styles.input, icon ? styles.inputWithIcon : null, style]}
          {...rest}
        />
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { marginLeft: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    minHeight: 48,
  },
  invalid: { borderColor: Colors.danger },
  icon: { paddingLeft: 14 },
  input: {
    flex: 1,
    color: Colors.foreground,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputWithIcon: { paddingLeft: 10 },
  right: { paddingRight: Spacing.two },
});
