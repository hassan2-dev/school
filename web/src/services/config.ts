import { store } from '../store';
import type { SchoolConfig } from '../types/core';

export const configService = {
  get(): SchoolConfig {
    return store.getState().config;
  },

  update(patch: Partial<SchoolConfig>) {
    store.setState((s) => ({
      ...s,
      config: { ...s.config, ...patch },
    }));
  },
};
