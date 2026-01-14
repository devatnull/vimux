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

export interface LessonStep {
  id: string;
  instruction: string;
  expectedKeys?: string[];
  hint?: string;
  successMessage: string;
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
