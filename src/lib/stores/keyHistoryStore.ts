"use client";

import { create } from "zustand";

const MAX_KEYS = 20;

interface KeyHistoryState {
  keys: string[];
  pushKey: (key: string) => void;
  clear: () => void;
}

export const useKeyHistoryStore = create<KeyHistoryState>((set) => ({
  keys: [],

  pushKey: (key) =>
    set((state) => ({
      keys: [...state.keys, key].slice(-MAX_KEYS),
    })),

  clear: () => set({ keys: [] }),
}));
