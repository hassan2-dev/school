import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const config = {
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
  authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
  projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
  storageBucket: String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
  messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
};

export const isFirebaseConfigured = Boolean(
  config.apiKey &&
    config.projectId &&
    config.appId &&
    config.apiKey !== 'demo' &&
    !config.apiKey.includes('your-'),
);

/** للتشخيص في الواجهة — بدون كشف المفاتيح */
export function firebaseConfigStatus() {
  return {
    ready: isFirebaseConfigured,
    projectId: config.projectId || null,
    hasApiKey: Boolean(config.apiKey && config.apiKey !== 'demo'),
    hasAppId: Boolean(config.appId),
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
