import { useEffect, useState } from 'react';
import { store } from '../store';
import type { AppState } from '../types/core';

export function useStore(): AppState {
  const [state, setState] = useState(store.getState());
  useEffect(() => {
    const unsub = store.subscribe(() => setState(store.getState()));
    return () => {
      unsub();
    };
  }, []);
  return state;
}

export function useStoreSelector<T>(selector: (s: AppState) => T): T {
  const state = useStore();
  return selector(state);
}
