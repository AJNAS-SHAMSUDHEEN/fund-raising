'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserSession {
  name: string;
  phone: string;
  isRegistered: boolean;
}

interface UserSessionContextType {
  session: UserSession;
  saveSession: (name: string, phone: string) => void;
  clearSession: () => void;
  isPromptOpen: boolean;
  setIsPromptOpen: (open: boolean) => void;
}

const UserSessionContext = createContext<UserSessionContextType | undefined>(undefined);

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession>({
    name: '',
    phone: '',
    isRegistered: false,
  });
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('masjid_fund_user_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name && parsed.phone) {
          setSession({
            name: parsed.name,
            phone: parsed.phone,
            isRegistered: true,
          });
        } else {
          setIsPromptOpen(true);
        }
      } else {
        setIsPromptOpen(true);
      }
    } catch (e) {
      setIsPromptOpen(true);
    }
    setHasCheckedStorage(true);
  }, []);

  const saveSession = (name: string, phone: string) => {
    const newSession = {
      name: name.trim(),
      phone: phone.trim(),
      isRegistered: true,
    };
    setSession(newSession);
    try {
      localStorage.setItem('masjid_fund_user_session', JSON.stringify(newSession));
    } catch (e) {}
    setIsPromptOpen(false);
  };

  const clearSession = () => {
    setSession({ name: '', phone: '', isRegistered: false });
    try {
      localStorage.removeItem('masjid_fund_user_session');
    } catch (e) {}
    setIsPromptOpen(true);
  };

  return (
    <UserSessionContext.Provider
      value={{
        session,
        saveSession,
        clearSession,
        isPromptOpen: hasCheckedStorage ? isPromptOpen : false,
        setIsPromptOpen,
      }}
    >
      {children}
    </UserSessionContext.Provider>
  );
}

export function useUserSession() {
  const context = useContext(UserSessionContext);
  if (!context) {
    throw new Error('useUserSession must be used within a UserSessionProvider');
  }
  return context;
}
