// The app talks to the cus-reporting web backend (Next.js + MongoDB).
// Set EXPO_PUBLIC_API_URL in .env — see .env.example. Must be read with dot
// notation so Expo can inline it at build time.

const raw = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';

export const API_URL = raw.replace(/\/+$/, '');

export const API_NOT_CONFIGURED_MESSAGE =
  'The server address is not configured. Set EXPO_PUBLIC_API_URL in .env and restart the app.';

// Geolocation timeout (ms) — generous for indoor GPS lock, same as the web app.
export const LOCATION_TIMEOUT_MS = 15000;

// Network timeout (ms) for API requests.
export const REQUEST_TIMEOUT_MS = 20000;

export const BRAND_NAME = 'CareerUS Solutions';
