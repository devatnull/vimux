// Re-export simulator types for compatibility
export type {
  VimMode,
  VimBuffer,
  VimState,
  TmuxPane,
  TmuxWindow,
  TmuxSession,
  TmuxState,
  SimulatorState as FullSimulatorState,
  CursorPosition,
  VisualSelection,
  SearchState,
} from "./simulator/types";

// SimulatorState for the store - uses full types to support simulator module integration
export interface SimulatorState {
  tmux: import("./simulator/types").TmuxState;
  vim: import("./simulator/types").VimState;
  keySequence: string[];
  lastAction?: string;
}

export interface Shortcut {
  id: string;
  keys: string[];
  description: string;
  category: string;
  context?: "tmux" | "neovim" | "both";
  subcategory?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  category: "tmux" | "neovim" | "workflow";
  difficulty: "beginner" | "intermediate" | "advanced";
  steps: LessonStep[];
  prerequisites?: string[];
  estimatedMinutes: number;
}

export interface LessonStepValidation {
  cursorPosition?: { line: number; col: number };
  cursorLine?: number;
  cursorCol?: number;
  mode?: import("./simulator/types").VimMode;
  bufferContent?: string[] | ((content: string[]) => boolean);
  bufferContains?: string;
  paneCount?: number;
  windowCount?: number;
  prefixActive?: boolean;
  custom?: (state: SimulatorState) => boolean;
}

export interface LessonStep {
  id: string;
  instruction: string;
  expectedKeys?: string[];
  validation?: LessonStepValidation;
  hint?: string;
  successMessage: string;
  setupState?: Partial<SimulatorState>;
  context?: "tmux" | "vim";
}

export interface UserProgress {
  lessonId: string;
  completed: boolean;
  currentStep: number;
  startedAt: number;
  completedAt?: number;
  attempts: number;
}

export interface UserState {
  progress: Record<string, UserProgress>;
  preferences: {
    showHints: boolean;
    keyboardLayout: "qwerty" | "dvorak" | "colemak";
    soundEnabled: boolean;
    animationsEnabled: boolean;
  };
  stats: {
    totalLessonsCompleted: number;
    totalTimeSpent: number;
    currentStreak: number;
    lastPracticeDate?: string;
  };
}
