import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

const firestoreDbId =
  import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
  firebaseConfigJson.firestoreDatabaseId ||
  '(default)';

// Initialize Firebase App instance safely (singleton pattern)
export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore: Firestore =
  firestoreDbId && firestoreDbId !== '(default)'
    ? getFirestore(app, firestoreDbId)
    : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface FirestoreUserProfile {
  uid: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  authProvider: 'google' | 'password';
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

/**
 * Format Firebase Auth and Firestore errors into friendly, polished user-facing messages.
 */
export function formatAuthError(err: any): string {
  const code = err?.code || '';
  const message = err?.message || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'Account not found. Please check your email or sign up.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please log in.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 8 characters with letters and numbers.';
    case 'auth/too-many-requests':
      return 'Too many login attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Unable to connect. Please check your network connection.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase Console. Using secure local authentication fallback.';
    case 'auth/popup-closed-by-user':
      return 'Sign in window was closed before completion.';
    case 'auth/popup-blocked':
      return 'Sign in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    default:
      if (message.includes('USERNAME_TAKEN')) {
        return 'Username is already taken. Please choose another username.';
      }
      return message || 'An unexpected error occurred during authentication.';
  }
}

/**
 * Check if a username is available.
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const clean = username.trim().toLowerCase();
  if (!clean) return false;
  try {
    const userDocRef = doc(firestore, 'usernames', clean);
    const snap = await getDoc(userDocRef);
    return !snap.exists();
  } catch (err) {
    console.warn('[Firebase] Error checking username availability:', err);
    // If permission or network error, fallback to true or let creation transaction handle it
    return true;
  }
}

/**
 * Create or sync a Firestore profile document for a user.
 */
export async function syncUserProfile(
  user: FirebaseUser,
  customUsername?: string,
  authProvider: 'google' | 'password' = 'password'
): Promise<FirestoreUserProfile> {
  const uid = user.uid;
  const email = (user.email || '').toLowerCase().trim();
  const userRef = doc(firestore, 'users', uid);

  // Check if profile exists
  let existingProfile: FirestoreUserProfile | null = null;
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      existingProfile = snap.data() as FirestoreUserProfile;
    }
  } catch (e) {
    console.warn('[Firebase] Could not fetch existing user profile:', e);
  }

  const now = new Date().toISOString();

  if (existingProfile) {
    const updated: FirestoreUserProfile = {
      ...existingProfile,
      displayName: user.displayName || existingProfile.displayName || existingProfile.username,
      avatar: user.photoURL || existingProfile.avatar,
      updatedAt: now,
    };
    try {
      await setDoc(userRef, updated, { merge: true });
    } catch (e) {
      console.warn('[Firebase] Error updating user profile:', e);
    }
    return updated;
  }

  // Determine initial username
  let finalUsername = (customUsername || '').trim().toLowerCase();
  if (!finalUsername) {
    const prefix = email ? email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') : 'user';
    finalUsername = `${prefix}_${Math.random().toString(36).substring(2, 6)}`.toLowerCase();
  }

  const newProfile: FirestoreUserProfile = {
    uid,
    username: finalUsername,
    email,
    displayName: user.displayName || customUsername || email.split('@')[0] || 'User',
    avatar: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(finalUsername)}`,
    authProvider,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  try {
    // Transaction to atomically reserve username and create profile
    await runTransaction(firestore, async (transaction) => {
      const usernameRef = doc(firestore, 'usernames', finalUsername);
      const usernameSnap = await transaction.get(usernameRef);
      if (usernameSnap.exists() && usernameSnap.data()?.uid !== uid) {
        throw new Error('USERNAME_TAKEN');
      }
      transaction.set(usernameRef, { uid, createdAt: now });
      transaction.set(userRef, newProfile);
    });
  } catch (err: any) {
    if (err.message === 'USERNAME_TAKEN') {
      throw err;
    }
    // If transaction failed due to network or rules, attempt direct write
    console.warn('[Firebase] Transaction failed, trying direct setDoc:', err);
    await setDoc(userRef, newProfile, { merge: true });
  }

  return newProfile;
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  firebaseSendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
};
