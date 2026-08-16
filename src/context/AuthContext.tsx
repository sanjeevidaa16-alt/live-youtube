import React, { createContext, useContext, useState } from 'react';
import { User } from '../types.js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  signupWithEmailPassword: (params: any) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Default operator identity for direct VPS control
const DEFAULT_OPERATOR: User = {
  id: 'vps-operator',
  username: 'vps_operator',
  name: 'VPS Stream Operator',
  email: 'operator@castloop.local',
  role: 'admin',
  createdAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType>({
  user: DEFAULT_OPERATOR,
  isAuthenticated: true,
  isAdmin: true,
  isLoading: false,
  loginWithEmailPassword: async () => {},
  signupWithEmailPassword: async () => {},
  loginWithGoogle: async () => {},
  sendPasswordReset: async () => {},
  login: async () => {},
  adminLogin: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user] = useState<User>(DEFAULT_OPERATOR);

  const value: AuthContextType = {
    user,
    isAuthenticated: true,
    isAdmin: true,
    isLoading: false,
    loginWithEmailPassword: async () => {},
    signupWithEmailPassword: async () => {},
    loginWithGoogle: async () => {},
    sendPasswordReset: async () => {},
    login: async () => {},
    adminLogin: async () => {},
    logout: async () => {},
    refreshUser: async () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: DEFAULT_OPERATOR,
      isAuthenticated: true,
      isAdmin: true,
      isLoading: false,
      loginWithEmailPassword: async () => {},
      signupWithEmailPassword: async () => {},
      loginWithGoogle: async () => {},
      sendPasswordReset: async () => {},
      login: async () => {},
      adminLogin: async () => {},
      logout: async () => {},
      refreshUser: async () => {},
    };
  }
  return context;
};
