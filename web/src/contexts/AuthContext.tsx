import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { nowIso } from '../lib/normalize';
import type { AppUser } from '../types/models';
import { localStore } from '../services/localStore';

interface AuthContextValue {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  enterDemo: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser || !db) {
        setUser(null);
        setLoading(false);
        return;
      }
      const snap = await getDoc(doc(db, 'users', fbUser.uid));
      if (snap.exists()) {
        setUser({ id: snap.id, ...snap.data() } as AppUser);
      } else {
        const t = nowIso();
        const profile: AppUser = {
          id: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email || 'مستخدم',
          role: 'viewer',
          schoolIds: [],
          createdAt: t,
          updatedAt: t,
        };
        await setDoc(doc(db, 'users', fbUser.uid), profile);
        setUser(profile);
      }
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      loading,
      isDemo: !isFirebaseConfigured,
      async login(email, password) {
        if (!isFirebaseConfigured || !auth) {
          enterDemoInternal(email);
          return;
        }
        await signInWithEmailAndPassword(auth, email, password);
      },
      async register(email, password, displayName) {
        if (!isFirebaseConfigured || !auth || !db) {
          enterDemoInternal(email, displayName);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const t = nowIso();
        const profile: AppUser = {
          id: cred.user.uid,
          email,
          displayName,
          role: 'schoolAdmin',
          schoolIds: [],
          createdAt: t,
          updatedAt: t,
        };
        await setDoc(doc(db, 'users', cred.user.uid), profile);
      },
      async logout() {
        if (isFirebaseConfigured && auth) await signOut(auth);
        localStore.sessionUser = null;
        setUser(null);
        setFirebaseUser(null);
      },
      enterDemo() {
        enterDemoInternal();
      },
    }),
    [user, firebaseUser, loading],
  );

  function enterDemoInternal(email = 'admin@school.local', displayName = 'مدير النظام') {
    const demo = localStore.users[0] || {
      id: 'demo-admin',
      email,
      displayName,
      role: 'admin' as const,
      schoolIds: localStore.schools.map((s) => s.id),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    localStore.sessionUser = demo;
    setUser(demo);
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
