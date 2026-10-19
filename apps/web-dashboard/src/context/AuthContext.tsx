import React, { createContext, useContext, useState, useEffect } from 'react';
import * as ApiContracts from '@accident-alarm/api-contracts';
import { api } from '../services/api';

interface AuthContextType {
  user: ApiContracts.UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isDispatcher: boolean;
  isResponder: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ApiContracts.UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const token = api.getToken();
      if (token) {
        try {
          const profile = await api.getCurrentUser();
          setUser(profile);
        } catch (err) {
          console.warn('Failed to restore session:', err);
          api.logout();
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.login(email, pass);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const isAdmin = user?.role === ApiContracts.UserRole.ADMIN;
  const isDispatcher = user?.role === ApiContracts.UserRole.DISPATCHER || isAdmin;
  const isResponder = user?.role === ApiContracts.UserRole.RESPONDER || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin,
        isDispatcher,
        isResponder
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
