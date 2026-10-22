import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * Page container: dark background, safe areas, centered max-width column.
 * `scroll` wraps the content in a keyboard-friendly ScrollView.
 */
export function Screen({
  children,
  scroll = false,
  center = false,
  edges = ['top', 'bottom', 'left', 'right'],
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  /** Vertically center the content (forms, status cards). */
  center?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  contentStyle?: ViewStyle;
}) {
  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, center && styles.center, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <View style={styles.column}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.fill, styles.pad, center && styles.center, contentStyle]}>
      <View style={styles.column}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {inner}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  fill: { flex: 1 },
  pad: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  center: { justifyContent: 'center' },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
});
