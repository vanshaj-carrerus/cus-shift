// All attendance times are Indian Standard Time (Asia/Kolkata, UTC+05:30).
// IST has no daylight saving, so a fixed offset is exact. Timestamps stay in
// UTC on the server; only day boundaries and display use IST. Formatting is
// done by hand (not Intl) so it never depends on the phone's own timezone or
// on the JS engine's Intl support.

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** "YYYY-MM-DD" of the IST calendar day containing `date`. */
export function istDateKey(date: Date = new Date()): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Parses "YYYY-MM-DD"; returns null if it isn't a real calendar date. */
export function parseDateKey(key: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const d = new Date(`${key}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== key ? null : key;
}

/** The date key one day before/after `key`. */
export function shiftDateKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A Date whose *local* calendar day is `key` (for the native date picker). */
export function dateKeyToLocalDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The "YYYY-MM-DD" for a Date's *local* calendar day (from the native date picker). */
export function localDateToDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function istFields(value: Date | string) {
  const d = new Date(new Date(value).getTime() + IST_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
    seconds: d.getUTCSeconds(),
  };
}

/** e.g. "08:59:42 AM" */
export function formatIstTime(value: Date | string): string {
  const { hours, minutes, seconds } = istFields(value);
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${pad(h12)}:${pad(minutes)}:${pad(seconds)} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** e.g. "21 Oct 2026, 08:59:42 AM" */
export function formatIstDateTime(value: Date | string): string {
  const { year, month, day } = istFields(value);
  return `${pad(day)} ${MONTHS_SHORT[month]} ${year}, ${formatIstTime(value)}`;
}

/** e.g. "Wednesday, 21 October 2026" from a "YYYY-MM-DD" key. */
export function formatIstDate(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** e.g. "01:30 PM" (no seconds). */
export function formatIstHm(value: Date | string): string {
  const { hours, minutes } = istFields(value);
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${pad(h12)}:${pad(minutes)} ${hours < 12 ? 'AM' : 'PM'}`;
}
