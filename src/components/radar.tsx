import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

import { Icon } from './icon';

/** Pulsing location "radar" shown while the GPS fix / server check runs. */
export function Radar({ size = 128 }: { size?: number }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System }),
      -1,
      false,
      undefined,
      ReduceMotion.System
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.7 * (1 - pulse.value),
    transform: [{ scale: 0.6 + 0.55 * pulse.value }],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View style={[styles.ring, { borderColor: 'rgba(59,130,246,0.3)' }]} />
      <View style={[styles.ring, styles.innerRing, { borderColor: 'rgba(59,130,246,0.2)' }]} />
      <Animated.View style={[styles.ring, { borderColor: 'rgba(59,130,246,0.5)' }, ringStyle]} />
      <View style={styles.core}>
        <Icon name="map-pin" size={20} color="accentText" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    borderWidth: 1,
  },
  innerRing: { margin: 16 },
  core: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
  },
});
