"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProgress, UserState } from "../types";

const initialUserState: UserState = {
  progress: {},
  preferences: {
    showHints: true,
    keyboardLayout: "qwerty",
    soundEnabled: false,
    animationsEnabled: true,
  },
  stats: {
    totalLessonsCompleted: 0,
    totalTimeSpent: 0,
    currentStreak: 0,
  },
};

interface UserStore {
  user: UserState;
  updateProgress: (lessonId: string, progress: Partial<UserProgress>) => void;
  markLessonComplete: (lessonId: string) => void;
  isLessonCompleted: (lessonId: string) => boolean;
  getCompletedLessonIds: () => string[];
  updatePreferences: (prefs: Partial<UserState["preferences"]>) => void;
  resetProgress: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: initialUserState,

      updateProgress: (lessonId, progress) => {
        set((s) => ({
          user: {
            ...s.user,
            progress: {
              ...s.user.progress,
              [lessonId]: {
                ...(s.user.progress[lessonId] || {
                  lessonId,
                  completed: false,
                  currentStep: 0,
                  startedAt: Date.now(),
                  attempts: 0,
                }),
                ...progress,
              },
            },
          },
        }));
      },

      markLessonComplete: (lessonId) => {
        set((s) => ({
          user: {
            ...s.user,
            progress: {
              ...s.user.progress,
              [lessonId]: {
                ...(s.user.progress[lessonId] || {
                  lessonId,
                  currentStep: 0,
                  startedAt: Date.now(),
                  attempts: 0,
                }),
                completed: true,
                completedAt: Date.now(),
              },
            },
            stats: {
              ...s.user.stats,
              totalLessonsCompleted: s.user.stats.totalLessonsCompleted + 1,
            },
          },
        }));
      },

      isLessonCompleted: (lessonId) => {
        return get().user.progress[lessonId]?.completed ?? false;
      },

      getCompletedLessonIds: () => {
        const progress = get().user.progress;
        return Object.keys(progress).filter((id) => progress[id].completed);
      },

      updatePreferences: (prefs) => {
        set((s) => ({
          user: { ...s.user, preferences: { ...s.user.preferences, ...prefs } },
        }));
      },

      resetProgress: () => {
        set({ user: initialUserState });
      },
    }),
    { name: "vimux-user-progress" }
  )
);
