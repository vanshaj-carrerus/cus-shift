// Client for the cus-reporting web backend. Endpoint behaviour mirrors the web
// app's own screens: see cus-reporting/src/app/api/**.
//
// Employees sign in with an httpOnly session cookie (`employee_session`). React Native's networking stack keeps cookies in the OS
// cookie jar, so we only need to send requests with credentials included.

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { API_NOT_CONFIGURED_MESSAGE, API_URL, REQUEST_TIMEOUT_MS } from './config';

export type AttendanceStatus = 'ON_TIME' | 'LATE' | 'OUT_OF_LOCATION';

/** The signed-in employee. */
export interface EmployeeProfile {
  id: string;
  name: string;
  email: string | null;
  /** Name of the employee's department, or null if none is assigned yet. */
  department: string | null;
}

/** One fixed break window, as real instants (ISO strings). */
export interface BreakWindow {
  name: string;
  start: string;
  end: string;
}

/** The employee's shift, today's break windows, the office area and the alarm rules. */
export interface Schedule {
  shift: {
    name: string;
    /** IST "HH:mm". */
    startTime: string;
    endTime: string;
    /** The concrete instance being worked (or about to be); null if none is open. */
    start: string | null;
    end: string | null;
  } | null;
  breaks: BreakWindow[];
  /** Every place the employee may check in from (inside any one counts). */
  offices?: { name: string; latitude: number; longitude: number; radius: number }[];
  /** The first of `offices`; sent for older app builds. */
  office: { latitude: number; longitude: number; radius: number };
  alarm: { intervalMinutes: number; ringsBeforeSilence: number };
  noSignalMinutes: number;
}

/** The installed app's version (from app.json), sent with every request so the admin can see it. */
export const APP_VERSION: string = Constants.expoConfig?.version ?? '';

/** Whether a newer app version is available, as decided by the server from the admin's settings. */
export interface UpdateNotice {
  available: boolean;
  latestVersion: string | null;
  url: string | null;
  message: string | null;
}

/** An employee's own attendance row for a day. */
export interface DayAttendance {
  _id: string;
  checkInTime: string;
  status: AttendanceStatus;
  distanceFromOffice: number;
  checkOutTime?: string | null;
}

const NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again.";
const SIGN_IN_AGAIN = 'Please sign in again.';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number = 0,
    /** Machine-readable reason from the server, when it sends one. */
    public readonly code?: string
  ) {
    super(message);
  }
}

// Registered by the employee session so an expired session (401) signs the user
// out everywhere, instead of each screen handling it separately.
let onEmployeeUnauthorized: (() => void) | null = null;
export function setEmployeeUnauthorizedHandler(handler: (() => void) | null) {
  onEmployeeUnauthorized = handler;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RawResponse {
  status: number;
  ok: boolean;
  // The body may not be JSON if something upstream failed, so don't assume it.
  data: any;
}

async function rawRequest(method: Method, path: string, body?: unknown): Promise<RawResponse> {
  if (!API_URL) throw new ApiError(API_NOT_CONFIGURED_MESSAGE);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'X-App-Version': APP_VERSION,
        'X-App-Platform': Platform.OS,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  } catch {
    throw new ApiError(NETWORK_ERROR);
  } finally {
    clearTimeout(timer);
  }
}

/** Request that needs a session: throws ApiError on any failure, and a 401 signs the user out. */
async function sessionRequest<T>(
  handler: () => (() => void) | null,
  signInMessage: string,
  method: Method,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await rawRequest(method, path, body);
  if (res.status === 401) {
    handler()?.();
    throw new ApiError(res.data?.error ?? signInMessage, 401);
  }
  if (!res.ok) {
    throw new ApiError(res.data?.error ?? `Request failed (error ${res.status}).`, res.status, res.data?.code);
  }
  return res.data as T;
}

const employeeRequest = <T>(method: Method, path: string, body?: unknown) =>
  sessionRequest<T>(() => onEmployeeUnauthorized, SIGN_IN_AGAIN, method, path, body);

// ----------------------------------------------------------------- Employee

/** Sign-in and first-time setup answer with the profile and set the session cookie. */
async function employeeAuth(path: string, credentials: Record<string, string>, failure: string) {
  const res = await rawRequest('POST', path, credentials);
  if (!res.ok) {
    throw new ApiError(res.data?.error ?? `${failure} (error ${res.status}).`, res.status, res.data?.code);
  }
  return res.data.employee as EmployeeProfile;
}

export const employeeLogin = (email: string, password: string) =>
  employeeAuth('/api/auth/login', { email, password }, 'Sign-in failed');

/** Emails the employee a 6-digit code. The answer is the same whether or not the email is registered. */
export async function requestVerificationCode(email: string): Promise<void> {
  const res = await rawRequest('POST', '/api/auth/request-code', { email });
  if (!res.ok) {
    throw new ApiError(res.data?.error ?? `Couldn't send the code (error ${res.status}).`, res.status, res.data?.code);
  }
}

/**
 * Sets or resets the password. `code` is the one the server emailed to `email`, which
 * proves the employee controls that inbox. Signs in on success.
 */
export const employeeActivate = (email: string, code: string, password: string) =>
  employeeAuth('/api/auth/activate', { email, code, password }, 'Setup failed');

export async function employeeLogout(): Promise<void> {
  try {
    await rawRequest('POST', '/api/auth/logout');
  } catch {
    // Signing out locally still proceeds if the request couldn't be sent.
  }
}

/** Who is signed in on this device, and their attendance for today (null if not yet checked in). */
export function fetchMe() {
  return employeeRequest<{
    employee: EmployeeProfile;
    attendance: DayAttendance | null;
    schedule: Schedule;
    update: UpdateNotice;
  }>(
    'GET',
    '/api/auth/me'
  );
}

export type PunchAction = 'in' | 'out';

export type PunchResult =
  | { kind: 'success'; attendance: DayAttendance }
  /** Already checked in (for `in`) / already checked out (for `out`) today. */
  | { kind: 'already'; attendance: DayAttendance }
  /** Tried to check out before checking in. */
  | { kind: 'not-checked-in' }
  | { kind: 'out-of-location'; distanceFromOffice: number; allowedRadius: number }
  | { kind: 'error'; message: string };

/** Check in or out as the signed-in employee. The server only accepts it from inside the office. */
export async function recordAttendance(
  action: PunchAction,
  latitude: number,
  longitude: number
): Promise<PunchResult> {
  let res: RawResponse;
  try {
    res = await rawRequest('POST', action === 'in' ? '/api/check-in' : '/api/check-out', {
      latitude,
      longitude,
    });
  } catch (error) {
    return { kind: 'error', message: (error as ApiError).message };
  }

  const { status, data } = res;
  if (status === 401) {
    onEmployeeUnauthorized?.();
    return { kind: 'error', message: data?.error ?? SIGN_IN_AGAIN };
  }
  if (status === 403) {
    return {
      kind: 'out-of-location',
      distanceFromOffice: data.distanceFromOffice,
      allowedRadius: data.allowedRadius,
    };
  }
  if (action === 'in') {
    if (status === 201) return { kind: 'success', attendance: data.attendance };
    if (status === 409) return { kind: 'already', attendance: data.attendance };
  } else {
    if (status === 200) return { kind: 'success', attendance: data.attendance };
    if (status === 409 && data?.code === 'NOT_CHECKED_IN') return { kind: 'not-checked-in' };
    if (status === 409 && data?.code === 'ALREADY_CHECKED_OUT') {
      return { kind: 'already', attendance: data.attendance };
    }
  }
  return {
    kind: 'error',
    message: data?.error ?? `Something went wrong (error ${status}). Please try again.`,
  };
}

/**
 * Reports the phone's location while on shift. Used from the background task, so it
 * never throws and never signs the user out: a failed report is simply skipped.
 */
export async function sendPresence(latitude: number, longitude: number): Promise<void> {
  try {
    await rawRequest('POST', '/api/presence', { latitude, longitude });
  } catch {
    // Offline or server down: the next report will catch up.
  }
}

/** Tells the server where to deliver admin alerts for the signed-in employee. Never throws. */
export async function registerPushToken(token: string): Promise<void> {
  try {
    await rawRequest('POST', '/api/push-token', { token });
  } catch {
    // Offline: it is registered again the next time the app opens.
  }
}

/** Stops admin alerts reaching this phone (call before signing out). Never throws. */
export async function clearPushToken(): Promise<void> {
  try {
    await rawRequest('DELETE', '/api/push-token');
  } catch {
    // Signing out proceeds anyway.
  }
}
