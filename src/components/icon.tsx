import { Lucide } from '@react-native-vector-icons/lucide';
import type { ComponentProps } from 'react';

import { Colors, type ColorName } from '@/constants/theme';

export type IconName = ComponentProps<typeof Lucide>['name'];

// Same icon set (lucide) as the web app.
export function Icon({
  name,
  size = 18,
  color = 'foreground',
}: {
  name: IconName;
  size?: number;
  color?: ColorName;
}) {
  return <Lucide name={name} size={size} color={Colors[color]} />;
}
