import * as Location from 'expo-location';

import { LOCATION_TIMEOUT_MS } from './config';

export type LocationFailure = 'denied' | 'timeout' | 'unavailable';

export class LocationError extends Error {
  constructor(
    public readonly reason: LocationFailure,
    /** False when the OS will no longer show the permission prompt (user must use Settings). */
    public readonly canAskAgain: boolean = true
  ) {
    super(reason);
  }
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Asks for foreground location permission and returns one fresh, high-accuracy
 * fix. expo-location has no timeout of its own, so we race it against one.
 */
export async function getCurrentCoordinates(): Promise<Coordinates> {
  let permission;
  try {
    permission = await Location.requestForegroundPermissionsAsync();
  } catch {
    throw new LocationError('unavailable');
  }
  if (!permission.granted) {
    throw new LocationError('denied', permission.canAskAgain);
  }

  let servicesEnabled = true;
  try {
    servicesEnabled = await Location.hasServicesEnabledAsync();
  } catch {
    // Fall through — the position request below will report the real failure.
  }
  if (!servicesEnabled) throw new LocationError('unavailable');

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new LocationError('timeout')), LOCATION_TIMEOUT_MS);
  });

  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      timeout,
    ]);
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch (error) {
    if (error instanceof LocationError) throw error;
    throw new LocationError('unavailable');
  } finally {
    clearTimeout(timer);
  }
}
