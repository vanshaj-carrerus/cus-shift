import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Fonts, type ColorName } from '@/constants/theme';

export type AppTextProps = TextProps & {
  variant?: 'title' | 'heading' | 'body' | 'small' | 'label' | 'mono';
  color?: ColorName;
};

export function AppText({ variant = 'body', color = 'foreground', style, ...rest }: AppTextProps) {
  return <Text style={[styles[variant], { color: Colors[color] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 34, fontWeight: '600', letterSpacing: -0.5 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  mono: { fontSize: 12, lineHeight: 16, fontFamily: Fonts.mono },
});
