import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

/**
 * إعدادات مشروع school-grades-cac89
 * مفاتيح الويب تظهر في المتصفح أصلاً — الحماية الحقيقية بقواعد Firestore.
 * إن وُجدت VITE_* في .env أو Vercel تُستخدم أولاً.
 */
const FALLBACK = {
  apiKey: 'AIzaSyAaNnCCt5ImsKUj4qgqTVUUZz92ZvzcYUY',
  authDomain: 'school-grades-cac89.firebaseapp.com',
  projectId: 'school-grades-cac89',
  storageBucket: 'school-grades-cac89.firebasestorage.app',
  messagingSenderId: '630849220220',
  appId: '1:630849220220:web:4424b68427998f9cb423f9',
};

function envOr(key: keyof typeof FALLBACK, envName: string): string {
  const fromEnv = String(import.meta.env[envName] || '').trim();
  if (fromEnv && fromEnv !== 'demo' && !fromEnv.includes('your-')) return fromEnv;
  return FALLBACK[key];
}

const config = {
  apiKey: envOr('apiKey', 'VITE_FIREBASE_API_KEY'),
  authDomain: envOr('authDomain', 'VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: envOr('projectId', 'VITE_FIREBASE_PROJECT_ID'),
  storageBucket: envOr('storageBucket', 'VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: envOr('messagingSenderId', 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: envOr('appId', 'VITE_FIREBASE_APP_ID'),
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

/** للتشخيص في الواجهة — بدون كشف المفاتيح */
export function firebaseConfigStatus() {
  return {
    ready: isFirebaseConfigured,
    projectId: config.projectId || null,
    hasApiKey: Boolean(config.apiKey),
    hasAppId: Boolean(config.appId),
    mode: import.meta.env.MODE,
    host: typeof window !== 'undefined' ? window.location.host : '',
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
