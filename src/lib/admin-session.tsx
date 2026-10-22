import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { adminLogin, adminLogout, fetchEmployees, setUnauthorizedHandler } from './api';

type SessionStatus = 'checking' | 'signedIn' | 'signedOut';

interface AdminSession {
  status: SessionStatus;
  signIn: (id: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSession | null>(null);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('checking');

  // The session cookie lives in the OS cookie jar and survives app restarts
  // (up to the server's 8h expiry), so ask the server whether it's still valid.
  useEffect(() => {
    let cancelled = false;
    fetchEmployees()
      .then(() => !cancelled && setStatus('signedIn'))
      .catch(() => !cancelled && setStatus('signedOut'));
    return () => {
      cancelled = true;
    };
  }, []);

  // Any admin request that comes back 401 means the session expired.
  useEffect(() => {
    setUnauthorizedHandler(() => setStatus('signedOut'));
    return () => setUnauthorizedHandler(null);
  }, []);

  const signIn = useCallback(async (id: string, password: string) => {
    await adminLogin(id, password);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    await adminLogout();
    setStatus('signedOut');
  }, []);

  return (
    <AdminSessionContext.Provider value={{ status, signIn, signOut }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession(): AdminSession {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error('useAdminSession must be used inside AdminSessionProvider');
  return ctx;
}
