import { Platform } from 'react-native';

// Dark, blue-themed palette ported from the web app (cus-reporting globals.css).
export const Colors = {
  background: '#090b11',
  surface: '#12151d',
  surface2: '#181c26',
  foreground: '#eef1f7',
  muted: '#8b93a7',
  border: '#232838',
  accent: '#3b82f6',
  accentHover: '#60a5fa',
  accentText: '#6aa8ff',
  accentForeground: '#04101f',
  success: '#6aa8ff',
  successBg: '#0f1f3a',
  warning: '#fbbf24',
  warningBg: '#2a2110',
  danger: '#f87171',
  dangerBg: '#2a1416',
  info: '#93c5fd',
  infoBg: '#101f33',
} as const;

export type ColorName = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: { mono: 'ui-monospace' },
  default: { mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const MaxContentWidth = 560;
