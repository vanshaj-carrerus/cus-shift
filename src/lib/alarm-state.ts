// State shared between the background location task (which has no UI) and the
// screens, kept in AsyncStorage so both see the same thing.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Schedule } from './api';

const SCHEDULE_KEY = 'cus.schedule';
const PRESENCE_KEY = 'cus.presence';
const ALARM_KEY = 'cus.alarm';

/** Where the phone has been seen, with a little debouncing against GPS jitter. */
export interface PresenceMemory {
  /** First reading outside the office in the current stretch (ms), or null while inside. */
  firstOutsideAt: number | null;
  /** Consecutive readings outside. Two are needed before we call it "outside". */
  outsideStreak: number;
  /** When the "you're outside during work time" notice was last shown (ms). */
  lastWarnAt: number | null;
}

/** The break-over alarm for one overstayed break. */
export interface AlarmMemory {
  /** The end of the break that was overstayed (ms) — identifies this alarm. */
  overrunSince: number;
  /** How many times it has rung. */
  rings: number;
  lastRingAt: number;
  /** The employee silenced it (only possible after enough rings). */
  silenced: boolean;
}

async function read<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is best-effort; the next tick will rebuild the state.
  }
}

export const loadSchedule = () => read<Schedule>(SCHEDULE_KEY);
export const saveSchedule = (schedule: Schedule) => write(SCHEDULE_KEY, schedule);
export const clearSchedule = () => AsyncStorage.removeItem(SCHEDULE_KEY).catch(() => {});

export const EMPTY_PRESENCE: PresenceMemory = { firstOutsideAt: null, outsideStreak: 0, lastWarnAt: null };
export const loadPresence = async () => (await read<PresenceMemory>(PRESENCE_KEY)) ?? { ...EMPTY_PRESENCE };
export const savePresence = (memory: PresenceMemory) => write(PRESENCE_KEY, memory);

export const loadAlarm = () => read<AlarmMemory>(ALARM_KEY);
export const saveAlarm = (alarm: AlarmMemory) => write(ALARM_KEY, alarm);
export const clearAlarm = () => AsyncStorage.removeItem(ALARM_KEY).catch(() => {});

/** Forget everything about the current shift (check-out, sign-out, shift over). */
export async function clearShiftMemory(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(PRESENCE_KEY).catch(() => {}),
    AsyncStorage.removeItem(ALARM_KEY).catch(() => {}),
  ]);
}
