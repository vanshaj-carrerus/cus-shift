// The app talks to the cus-reporting web backend (Next.js + MongoDB).
// Set EXPO_PUBLIC_API_URL in .env — see .env.example. Must be read with dot
// notation so Expo can inline it at build time.

import { Platform } from 'react-native';

const raw = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';

// The installed web app (PWA) is served from the same address as its /api proxy (vercel.json),
// so it always uses relative URLs and ignores EXPO_PUBLIC_API_URL: the employee cookie is
// SameSite=strict and a browser only sends it back to the address that set it.
export const API_URL = Platform.OS === 'web' ? '' : raw.replace(/\/+$/, '');

export const API_CONFIGURED = Platform.OS === 'web' || API_URL !== '';

export const API_NOT_CONFIGURED_MESSAGE =
  'The server address is not configured. Set EXPO_PUBLIC_API_URL in .env and restart the app.';

// Geolocation timeout (ms) — generous for indoor GPS lock, same as the web app.
export const LOCATION_TIMEOUT_MS = 15000;

// Network timeout (ms) for API requests.
export const REQUEST_TIMEOUT_MS = 20000;

export const BRAND_NAME = 'CareerUS Solutions';

