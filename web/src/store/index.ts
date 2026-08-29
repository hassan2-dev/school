import type { AppState } from '../types/core';
import { createInitialState } from './seed';

const STORAGE_KEY = 'school-grades-v4';

type Listener = () => void;

class AppStore {
  private state: AppState;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = this.load();
  }

  private load(): AppState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        // دمج حقول الرأس الجديدة إن كانت ناقصة في بيانات قديمة
        parsed.config = {
          republicTitle: 'جمهورية العراق',
          ministryTitle: 'وزارة التربية',
          directorate: '',
          ...parsed.config,
        };
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

  reset() {
    this.state = createInitialState();
    this.save();
  }
}

export const store = new AppStore();
