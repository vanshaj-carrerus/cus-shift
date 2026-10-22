import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from './icon';
import { TextField } from './text-field';

/** TextField for passwords, with a show/hide toggle. */
export function PasswordField(props: Omit<ComponentProps<typeof TextField>, 'secureTextEntry' | 'right' | 'icon'>) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      icon="key-round"
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={8}
          onPress={() => setVisible((v) => !v)}
          style={styles.eye}>
          <Icon name={visible ? 'eye-off' : 'eye'} size={16} color="muted" />
        </Pressable>
      }
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  eye: { padding: 8 },
});
