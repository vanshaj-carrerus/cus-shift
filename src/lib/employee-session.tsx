import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import {
  employeeActivate,
  employeeLogin,
  employeeLogout,
  fetchMe,
  setEmployeeUnauthorizedHandler,
  type DayAttendance,
  type EmployeeProfile,
  type Schedule,
} from './api';
import { clearSchedule, saveSchedule } from './alarm-state';
import { startTracking, stopTracking } from './tracking';

type SessionStatus = 'checking' | 'signedIn' | 'signedOut';

interface EmployeeSession {
  status: SessionStatus;
  /** The signed-in employee; null unless status is 'signedIn'. */
  employee: EmployeeProfile | null;
  /** Today's attendance row; null until the employee has checked in. */
  attendance: DayAttendance | null;
  /** Their shift, today's break windows, the office area and alarm rules. */
  schedule: Schedule | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Set or reset the password, proving it's you with the code emailed to `email`. */
  activate: (email: string, code: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-read today's attendance from the server (e.g. a new day started). */
  refresh: () => Promise<void>;
  /** Use a row the server just returned, without another round trip. */
  setAttendance: (attendance: DayAttendance) => void;
}

const EmployeeSessionContext = createContext<EmployeeSession | null>(null);

export function EmployeeSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('checking');
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [attendance, setAttendance] = useState<DayAttendance | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);

  const load = useCallback(async () => {
    const me = await fetchMe();
    setEmployee(me.employee);
    setAttendance(me.attendance);
    setSchedule(me.schedule);
    saveSchedule(me.schedule);
    setStatus('signedIn');
  }, []);

  const clear = useCallback(() => {
    setEmployee(null);
    setAttendance(null);
    setSchedule(null);
    clearSchedule();
    stopTracking();
    setStatus('signedOut');
  }, []);

  // The session cookie lives in the OS cookie jar and survives app restarts, so
  // ask the server whether it's still valid.
  useEffect(() => {
    let cancelled = false;
    fetchMe().then(
      (me) => {
        if (cancelled) return;
        setEmployee(me.employee);
        setAttendance(me.attendance);
        setSchedule(me.schedule);
        saveSchedule(me.schedule);
        setStatus('signedIn');
      },
      () => !cancelled && setStatus('signedOut')
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Track location (for break alarms) exactly while the employee is checked in on a
  // shift: start when they check in, stop when they check out or the shift is over.
  const onShift = Boolean(
    attendance && !attendance.checkOutTime && schedule?.shift?.start && schedule.shift.end
  );
  useEffect(() => {
    if (status !== 'signedIn') return;
    if (onShift) startTracking();
    else stopTracking();
  }, [status, onShift, attendance?._id]);

  // Any employee request that comes back 401 means the session ended (expired,
  // or the employee was removed).
  useEffect(() => {
    setEmployeeUnauthorizedHandler(clear);
    return () => setEmployeeUnauthorizedHandler(null);
  }, [clear]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await employeeLogin(email, password);
      await load();
    },
    [load]
  );

  const activate = useCallback(
    async (email: string, code: string, password: string) => {
      await employeeActivate(email, code, password);
      await load();
    },
    [load]
  );

  const signOut = useCallback(async () => {
    await employeeLogout();
    clear();
  }, [clear]);

  const refresh = useCallback(async () => {
    try {
      await load();
    } catch {
      // Keep showing what we have; a 401 has already signed the user out.
    }
  }, [load]);

  return (
    <EmployeeSessionContext.Provider
      value={{ status, employee, attendance, schedule, signIn, activate, signOut, refresh, setAttendance }}>
      {children}
    </EmployeeSessionContext.Provider>
  );
}

export function useEmployeeSession(): EmployeeSession {
  const ctx = useContext(EmployeeSessionContext);
  if (!ctx) throw new Error('useEmployeeSession must be used inside EmployeeSessionProvider');
  return ctx;
}
