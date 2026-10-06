import {
  clearLocalDatabase,
  readSnapshot,
  writeSnapshot,
} from '../db/schoolDb';
import type { AppState } from '../types/core';
import { createDemoState, createEmptyState, createInitialState } from './seed';

const LEGACY_STORAGE_KEY = 'school-grades-v6';
const FORCE_EMPTY_FLAG = 'school-force-empty-20260829';
const LEGACY_KEYS = [
  'school-grades-v2',
  'school-grades-v3',
  'school-grades-v4',
  'school-grades-v5',
  'school-grades-v6',
];

type Listener = () => void;

function removeLegacyKeys() {
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

function normalizeState(parsed: AppState): AppState {
  return {
    ...parsed,
    config: {
      republicTitle: 'جمهورية العراق',
      ministryTitle: 'وزارة التربية',
      directorate: '',
      ...parsed.config,
    },
    students: parsed.students ?? [],
    scores: parsed.scores ?? [],
    grades: parsed.grades ?? [],
    sections: parsed.sections ?? [],
    templates: parsed.templates ?? [],
  };
}

function readLegacyLocalStorage(): AppState | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw) as AppState);
  } catch {
    return null;
  }
}

class AppStore {
  private state: AppState = createEmptyState();
  private listeners = new Set<Listener>();
  private ready = false;
  private readyPromise: Promise<void>;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.readyPromise = this.init();
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  isReady(): boolean {
    return this.ready;
  }

  private async init() {
    try {
      // مرة واحدة: مسح legacy إن لزم
      if (!localStorage.getItem(FORCE_EMPTY_FLAG)) {
        removeLegacyKeys();
        localStorage.setItem(FORCE_EMPTY_FLAG, '1');
        const empty = createEmptyState();
        await writeSnapshot(empty);
        this.state = empty;
        this.ready = true;
        this.emit();
        return;
      }

      const fromDb = await readSnapshot();
      if (fromDb) {
        this.state = normalizeState(fromDb);
        this.ready = true;
        this.emit();
        return;
      }

      // ترحيل من localStorage القديم إلى IndexedDB
      const legacy = readLegacyLocalStorage();
      if (legacy) {
        this.state = legacy;
        await writeSnapshot(legacy);
        try {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        this.ready = true;
        this.emit();
        return;
      }

      this.state = createInitialState();
      await writeSnapshot(this.state);
    } catch {
      // fallback: localStorage إن فشل IndexedDB
      const legacy = readLegacyLocalStorage();
      this.state = legacy ?? createInitialState();
    }

    this.ready = true;
    this.emit();
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      void this.persist();
    }, 80);
  }

  private async persist() {
    try {
      await writeSnapshot(this.state);
    } catch {
      // احتياطي: localStorage إن امتلأت أو تعطلت IndexedDB
      try {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(this.state));
      } catch {
        /* ignore */
      }
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): AppState {
    return this.state;
  }

  setState(updater: (prev: AppState) => AppState) {
    this.state = updater(this.state);
    this.scheduleSave();
    this.emit();
  }

  /** تصفير كامل للطلاب والدرجات */
  clearData() {
    const config = this.state.config;
    removeLegacyKeys();
    localStorage.setItem(FORCE_EMPTY_FLAG, '1');
    this.state = {
      ...createEmptyState(),
      config,
    };
    void clearLocalDatabase().then(() => this.persist());
    this.emit();
  }

  resetDemo() {
    this.state = createDemoState();
    this.scheduleSave();
    this.emit();
  }

  /** استبدال كامل للحالة (استيراد نسخة احتياطية) */
  replaceState(next: AppState) {
    this.state = normalizeState(next);
    this.scheduleSave();
    this.emit();
  }

  reset() {
    this.clearData();
  }
}

export const store = new AppStore();
