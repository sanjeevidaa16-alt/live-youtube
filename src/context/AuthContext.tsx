import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types.js';
import { api, getStoredToken, setStoredToken, clearStoredToken } from '../services/api.js';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  firebaseSendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  syncUserProfile,
  isUsernameAvailable,
  formatAuthError,
  FirestoreUserProfile,
} from '../services/firebase.js';
import { User as FirebaseUser } from 'firebase/auth';

interface SignupParams {
  username: string;
  email: string;
  password: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  firestoreProfile: FirestoreUserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  signupWithEmailPassword: (params: SignupParams) => Promise<void>;
  loginWithGoogle: (fallbackProfile?: { email: string; name?: string; avatar?: string; googleId?: string }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firestoreProfile, setFirestoreProfile] = useState<FirestoreUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync state from active token or Firebase
  const refreshUser = async () => {
    const token = getStoredToken();
    if (!token) {
      if (!auth.currentUser) {
        setUser(null);
        setFirebaseUser(null);
        setFirestoreProfile(null);
        setIsLoading(false);
      }
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch (e) {
      // If token expired and no active Firebase user
      if (!auth.currentUser) {
        clearStoredToken();
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Primary Firebase Auth state change listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          // Sync profile with Firestore
          const profile = await syncUserProfile(
            fbUser,
            fbUser.displayName || undefined,
            fbUser.providerData.some((p) => p.providerId === 'google.com') ? 'google' : 'password'
          );
          setFirestoreProfile(profile);

          // Sync with server backend for session token
          const syncRes = await api.syncFirebaseUser({
            uid: fbUser.uid,
            email: fbUser.email || profile.email,
            username: profile.username,
            name: fbUser.displayName || profile.displayName || profile.username,
            avatar: fbUser.photoURL || profile.avatar,
            authProvider: profile.authProvider,
          });

          setStoredToken(syncRes.token);
          setUser(syncRes.user);
        } catch (err) {
          console.error('[AuthContext] Error syncing Firebase user:', err);
          // Fallback minimal user object if backend sync failed
          const fallbackUser: User = {
            id: fbUser.uid,
            username: fbUser.displayName || fbUser.email?.split('@')[0] || 'user',
            name: fbUser.displayName || undefined,
            email: fbUser.email || undefined,
            avatar: fbUser.photoURL || undefined,
            role: 'user',
            createdAt: new Date().toISOString(),
          };
          setUser(fallbackUser);
        } finally {
          setIsLoading(false);
        }
      } else {
        setFirebaseUser(null);
        setFirestoreProfile(null);
        // Check if there is an active admin local session
        const currentToken = getStoredToken();
        if (currentToken) {
          try {
            const data = await api.getMe();
            if (data.user && data.user.role === 'admin') {
              setUser(data.user);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            // ignore
          }
        }
        setUser(null);
        clearStoredToken();
        setIsLoading(false);
      }
    });

    const handleUnauthorized = () => {
      setUser(null);
      setFirebaseUser(null);
      setFirestoreProfile(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      unsubscribe();
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // Manual Email + Password Signup
  const signupWithEmailPassword = async ({ username, email, password, name }: SignupParams) => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    // 1. Pre-validation for username uniqueness
    const available = await isUsernameAvailable(cleanUsername);
    if (!available) {
      setIsLoading(false);
      throw new Error('Username is already taken. Please choose another username.');
    }

    try {
      // 2. Attempt Firebase Auth account creation
      let fbUser: FirebaseUser | null = null;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        fbUser = userCredential.user;

        // 3. Update Firebase display name
        await updateProfile(fbUser, {
          displayName: name?.trim() || cleanUsername,
        });

        // 4. Create Firestore user profile & reserve username
        const profile = await syncUserProfile(fbUser, cleanUsername, 'password');
        setFirestoreProfile(profile);
        setFirebaseUser(fbUser);

        // 5. Sync with server backend
        const syncRes = await api.syncFirebaseUser({
          uid: fbUser.uid,
          email: cleanEmail,
          username: cleanUsername,
          name: name?.trim() || cleanUsername,
          avatar: profile.avatar,
          authProvider: 'password',
        });

        setStoredToken(syncRes.token);
        setUser(syncRes.user);
        return;
      } catch (fbErr: any) {
        if (fbErr?.code === 'auth/operation-not-allowed' || fbErr?.message?.includes('operation-not-allowed')) {
          console.warn('[AuthContext] Firebase Email/Password not enabled in console, using secure server registration fallback.');
          const syncRes = await api.signup({
            username: cleanUsername,
            email: cleanEmail,
            password,
            name: name?.trim() || cleanUsername,
          });

          setStoredToken(syncRes.token);
          setUser(syncRes.user);
          return;
        }
        throw fbErr;
      }
    } catch (err: any) {
      console.error('[AuthContext] Signup error:', err);
      const friendlyMsg = formatAuthError(err);
      throw new Error(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual Email + Password Login
  const loginWithEmailPassword = async (email: string, password: string) => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      let fbUser: FirebaseUser | null = null;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        fbUser = userCredential.user;

        const profile = await syncUserProfile(fbUser, undefined, 'password');
        setFirestoreProfile(profile);
        setFirebaseUser(fbUser);

        const syncRes = await api.syncFirebaseUser({
          uid: fbUser.uid,
          email: cleanEmail,
          username: profile.username,
          name: fbUser.displayName || profile.displayName,
          avatar: fbUser.photoURL || profile.avatar,
          authProvider: 'password',
        });

        setStoredToken(syncRes.token);
        setUser(syncRes.user);
        return;
      } catch (fbErr: any) {
        if (
          fbErr?.code === 'auth/operation-not-allowed' ||
          fbErr?.code === 'auth/user-not-found' ||
          fbErr?.code === 'auth/invalid-credential' ||
          fbErr?.code === 'auth/invalid-email' ||
          fbErr?.message?.includes('operation-not-allowed') ||
          fbErr?.message?.includes('invalid-email')
        ) {
          console.warn('[AuthContext] Trying server-side credentials login fallback...');
          const serverRes = await api.login(cleanEmail, password);
          setStoredToken(serverRes.token);
          setUser(serverRes.user);
          return;
        }
        throw fbErr;
      }
    } catch (err: any) {
      console.error('[AuthContext] Login error:', err);
      const friendlyMsg = formatAuthError(err);
      throw new Error(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Continue with Google Login
  const loginWithGoogle = async (fallbackProfile?: { email: string; name?: string; avatar?: string; googleId?: string }) => {
    setIsLoading(true);
    try {
      let fbUser: FirebaseUser | null = null;

      try {
        // Primary: Native Firebase Google Popup
        const result = await signInWithPopup(auth, googleProvider);
        fbUser = result.user;
      } catch (popupErr: any) {
        console.warn('[AuthContext] Google Popup error, attempting fallback if provided:', popupErr);
        if (fallbackProfile && fallbackProfile.email) {
          // Fallback direct backend Google authentication
          const data = await api.loginWithGoogle(fallbackProfile);
          setStoredToken(data.token);
          setUser(data.user);
          setIsLoading(false);
          return;
        }
        throw popupErr;
      }

      if (fbUser) {
        const profile = await syncUserProfile(fbUser, undefined, 'google');
        setFirestoreProfile(profile);
        setFirebaseUser(fbUser);

        const syncRes = await api.syncFirebaseUser({
          uid: fbUser.uid,
          email: (fbUser.email || fallbackProfile?.email || '').toLowerCase(),
          username: profile.username,
          name: fbUser.displayName || fallbackProfile?.name || profile.displayName,
          avatar: fbUser.photoURL || fallbackProfile?.avatar || profile.avatar,
          authProvider: 'google',
        });

        setStoredToken(syncRes.token);
        setUser(syncRes.user);
      }
    } catch (err: any) {
      console.error('[AuthContext] Google Login error:', err);
      const friendlyMsg = formatAuthError(err);
      throw new Error(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Password Reset
  const sendPasswordReset = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    try {
      await firebaseSendPasswordResetEmail(auth, cleanEmail);
    } catch (err: any) {
      const friendlyMsg = formatAuthError(err);
      throw new Error(friendlyMsg);
    }
  };

  // Legacy / Direct Admin Login (username + password)
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      // If it looks like an email, attempt Firebase email/password first
      if (username.includes('@')) {
        await loginWithEmailPassword(username, password);
        return;
      }

      // Otherwise attempt server login (admin or legacy)
      const data = await api.login(username, password);
      setStoredToken(data.token);
      setUser(data.user);
    } catch (err: any) {
      // If server login failed, check if user tried username in Firebase
      throw new Error(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Admin Dedicated Login
  const adminLogin = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.adminLogin(username, password);
      setStoredToken(data.token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Out
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      // ignore
    }
    try {
      await api.logout();
    } catch (e) {
      // ignore
    } finally {
      clearStoredToken();
      setUser(null);
      setFirebaseUser(null);
      setFirestoreProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        firestoreProfile,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isLoading,
        loginWithEmailPassword,
        signupWithEmailPassword,
        loginWithGoogle,
        sendPasswordReset,
        login,
        adminLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
