import type { AppState } from '../types/core';
import { createDemoState, createEmptyState, createInitialState } from './seed';

const STORAGE_KEY = 'school-grades-v5';

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

  /** تصفير: يحذف الطلاب والدرجات، يبقي الصفوف والشعب والقوالب */
  clearData() {
    this.state = {
      ...createEmptyState(),
      config: this.state.config,
    };
    this.save();
  }

  /** إعادة بيانات تجريبية */
  resetDemo() {
    this.state = createDemoState();
    this.save();
  }

  reset() {
    this.clearData();
  }
}

export const store = new AppStore();
