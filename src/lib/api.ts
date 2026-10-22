// Client for the cus-reporting web backend. Endpoint behaviour mirrors the web
// app's own screens: see cus-reporting/src/app/api/**.
//
// Both admins and employees sign in with an httpOnly session cookie (`admin_session`
// / `employee_session`). React Native's networking stack keeps cookies in the OS
// cookie jar, so we only need to send requests with credentials included.

import { API_NOT_CONFIGURED_MESSAGE, API_URL, REQUEST_TIMEOUT_MS } from './config';

export type AttendanceStatus = 'ON_TIME' | 'LATE' | 'OUT_OF_LOCATION';

/** An employee as the admin sees them. */
export interface Employee {
  _id: string;
  name: string;
  /** Missing for employees added before accounts existed. */
  email?: string | null;
  /** Set once the employee has chosen a password; until then they're only invited. */
  passwordSetAt?: string | null;
}

/** The signed-in employee. */
export interface EmployeeProfile {
  id: string;
  name: string;
  email: string | null;
}

export interface AttendanceRecord {
  _id: string;
  /** Populated employee, or null if the employee was deleted. */
  userId: Employee | null;
  checkInTime: string;
  latitude: number;
  longitude: number;
  status: AttendanceStatus;
  distanceFromOffice: number;
  checkOutTime?: string | null;
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

// Registered by the admin / employee sessions so an expired session (401) signs
// the user out everywhere, instead of each screen handling it separately.
let onAdminUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onAdminUnauthorized = handler;
}

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
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
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

const adminRequest = <T>(method: Method, path: string, body?: unknown) =>
  sessionRequest<T>(() => onAdminUnauthorized, 'Admin sign-in required.', method, path, body);

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
  return employeeRequest<{ employee: EmployeeProfile; attendance: DayAttendance | null }>(
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

// -------------------------------------------------------------------- Admin

export async function adminLogin(id: string, password: string): Promise<void> {
  const res = await rawRequest('POST', '/api/admin/login', { id, password });
  if (!res.ok) {
    throw new ApiError(res.data?.error ?? `Sign-in failed (error ${res.status}).`, res.status);
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await rawRequest('POST', '/api/admin/logout');
  } catch {
    // Signing out locally still proceeds if the request couldn't be sent.
  }
}

export async function fetchAttendance(dateKey: string): Promise<AttendanceRecord[]> {
  const data = await adminRequest<{ records: AttendanceRecord[] }>(
    'GET',
    `/api/attendance?date=${encodeURIComponent(dateKey)}`
  );
  return data.records;
}

export async function fetchEmployees(): Promise<Employee[]> {
  const data = await adminRequest<{ employees: Employee[] }>('GET', '/api/employees');
  return data.employees;
}

export async function addEmployee(name: string, email: string): Promise<Employee> {
  const data = await adminRequest<{ employee: Employee }>('POST', '/api/employees', { name, email });
  return data.employee;
}

/**
 * Send only the fields that changed. Changing the email clears the employee's
 * password and sessions: they set a new one with a code emailed to the new address.
 */
export async function updateEmployee(
  id: string,
  changes: { name?: string; email?: string }
): Promise<Employee> {
  const data = await adminRequest<{ employee: Employee }>('PATCH', `/api/employees/${id}`, changes);
  return data.employee;
}

export async function deleteEmployee(id: string): Promise<void> {
  await adminRequest('DELETE', `/api/employees/${id}`);
}
