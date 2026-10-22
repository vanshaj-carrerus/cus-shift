import { Image } from 'expo-image';

import { BRAND_NAME } from '@/lib/config';

// The app is dark, so it uses the white-text logo (same asset as the web header).
export function Brand({ height = 32 }: { height?: number }) {
  return (
    <Image
      source={require('@/assets/images/logo-light.png')}
      accessibilityLabel={BRAND_NAME}
      contentFit="contain"
      style={{ height, width: height * (4433 / 1439) }}
    />
  );
}
