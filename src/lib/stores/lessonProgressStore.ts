"use client";

import { create } from "zustand";
import type { Lesson } from "../types";

interface Feedback {
  type: "success" | "error" | "info";
  message: string;
}

interface LessonProgressState {
  currentLesson: Lesson | null;
  currentStepIndex: number;
  feedback: Feedback | null;
  stepKeyProgressIndex: number;

  setLesson: (lesson: Lesson | null) => void;
  resetLesson: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipStep: () => void;
  setFeedback: (feedback: Feedback | null) => void;
  handleLessonKey: (key: string) => boolean;
}

export const useLessonProgressStore = create<LessonProgressState>((set, get) => ({
  currentLesson: null,
  currentStepIndex: 0,
  feedback: null,
  stepKeyProgressIndex: 0,

  setLesson: (lesson) =>
    set({
      currentLesson: lesson,
      currentStepIndex: 0,
      feedback: null,
      stepKeyProgressIndex: 0,
    }),

  resetLesson: () =>
    set({
      currentStepIndex: 0,
      feedback: null,
      stepKeyProgressIndex: 0,
    }),

  nextStep: () =>
    set((state) => {
      const lesson = state.currentLesson;
      if (!lesson) return state;
      const nextIndex = state.currentStepIndex + 1;
      if (nextIndex >= lesson.steps.length) {
        return {
          ...state,
          feedback: { type: "success", message: "Lesson complete!" },
        };
      }
      return {
        currentStepIndex: nextIndex,
        feedback: null,
        stepKeyProgressIndex: 0,
      };
    }),

  prevStep: () =>
    set((state) => ({
      currentStepIndex: Math.max(0, state.currentStepIndex - 1),
      feedback: null,
      stepKeyProgressIndex: 0,
    })),

  skipStep: () => {
    get().nextStep();
  },

  setFeedback: (feedback) => set({ feedback }),

  handleLessonKey: (key) => {
    const state = get();
    const { currentLesson, currentStepIndex, stepKeyProgressIndex } = state;

    if (!currentLesson) return false;

    const step = currentLesson.steps[currentStepIndex];
    if (!step?.expectedKeys?.length) return false;

    const expectedKey = step.expectedKeys[stepKeyProgressIndex];

    if (key === expectedKey) {
      const isLastKey = stepKeyProgressIndex === step.expectedKeys.length - 1;

      if (isLastKey) {
        set({
          feedback: { type: "success", message: step.successMessage },
        });
        setTimeout(() => get().nextStep(), 600);
      } else {
        set({ stepKeyProgressIndex: stepKeyProgressIndex + 1 });
      }
      return true;
    }

    set({
      feedback: { type: "error", message: `Expected: ${expectedKey}` },
      stepKeyProgressIndex: 0,
    });
    return false;
  },
}));
