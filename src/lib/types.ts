export type VimMode = "normal" | "insert" | "visual" | "command";

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
  expectedKeys: string[];
  hint?: string;
  successMessage: string;
  setupState?: Partial<SimulatorState>;
  validateState?: (state: SimulatorState) => boolean;
}

export interface TmuxPane {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  content: string[];
  cursorX: number;
  cursorY: number;
  isActive: boolean;
  title?: string;
}

export interface TmuxWindow {
  id: string;
  name: string;
  panes: TmuxPane[];
  activePaneId: string;
  isActive: boolean;
  index: number;
}

export interface TmuxSession {
  id: string;
  name: string;
  windows: TmuxWindow[];
  activeWindowId: string;
  createdAt: number;
}

export interface VimBuffer {
  id: string;
  filename: string;
  content: string[];
  cursorLine: number;
  cursorCol: number;
  mode: VimMode;
  modified: boolean;
  readonly?: boolean;
}

export interface VimState {
  buffers: VimBuffer[];
  activeBufferId: string;
  commandLine: string;
  commandMode: boolean;
  visualStart?: { line: number; col: number };
  registers: Record<string, string>;
  searchPattern?: string;
  lastCommand?: string;
  message?: string;
  messageType?: "info" | "error" | "warning";
  pendingOperator?: "d" | "y" | "c" | null;
  count?: number;
}

export interface SimulatorState {
  tmux: {
    sessions: TmuxSession[];
    activeSessionId: string;
    prefixActive: boolean;
    copyMode: boolean;
    mouseMode: boolean;
  };
  vim: VimState;
  keySequence: string[];
  lastAction?: string;
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
