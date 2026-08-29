import type { AppState } from '../types/core';
import { createDemoState, createEmptyState, createInitialState } from './seed';

const STORAGE_KEY = 'school-grades-v6';
const FORCE_EMPTY_FLAG = 'school-force-empty-20260829';
const LEGACY_KEYS = [
  'school-grades-v2',
  'school-grades-v3',
  'school-grades-v4',
  'school-grades-v5',
  'school-grades-v6',
];

type Listener = () => void;

function removeAllSchoolKeys() {
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

class AppStore {
  private state: AppState;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = this.load();
  }

  private load(): AppState {
    // مرة واحدة: مسح كل البيانات القديمة المحفوظة بالمتصفح
    try {
      if (!localStorage.getItem(FORCE_EMPTY_FLAG)) {
        removeAllSchoolKeys();
        localStorage.setItem(FORCE_EMPTY_FLAG, '1');
        const empty = createEmptyState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
        return empty;
      }
    } catch {
      /* ignore */
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        parsed.config = {
          republicTitle: 'جمهورية العراق',
          ministryTitle: 'وزارة التربية',
          directorate: '',
          ...parsed.config,
        };
        parsed.students = parsed.students ?? [];
        parsed.scores = parsed.scores ?? [];
        return parsed;
      }
    } catch {
      /* ignore */
    }
    return createInitialState();
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.listeners.forEach((l) => l());
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
    this.save();
  }

  /** تصفير كامل للطلاب والدرجات */
  clearData() {
    const config = this.state.config;
    removeAllSchoolKeys();
    localStorage.setItem(FORCE_EMPTY_FLAG, '1');
    this.state = {
      ...createEmptyState(),
      config,
    };
    this.save();
    this.listeners.forEach((l) => l());
  }

  resetDemo() {
    this.state = createDemoState();
    this.save();
  }

  reset() {
    this.clearData();
  }
}

export const store = new AppStore();
