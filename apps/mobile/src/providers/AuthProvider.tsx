import React, { createContext, useContext, useEffect } from 'react';
import type { UserRole } from '@fitcore/types';
import { useAuthStore } from '../store/authStore';
import { sessionManager } from '../services/auth/sessionManager';

interface AuthContextValue {
  isAuthenticated: boolean;
  userId: string | null;
  role: UserRole | null;
  isLoading: boolean;
}

const AuthReactContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, userId, role, isLoading, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;
    const initializeAuth = async () => {
      setLoading(true);
      try {
        await sessionManager.initSession();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();
    return () => {
      mounted = false;
    };
  }, [setLoading]);

  const value: AuthContextValue = {
    isAuthenticated,
    userId,
    role,
    isLoading,
  };

  return <AuthReactContext.Provider value={value}>{children}</AuthReactContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthReactContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
