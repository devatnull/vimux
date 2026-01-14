export type VimMode =
  | "normal"
  | "insert"
  | "visual"
  | "visual-line"
  | "visual-block"
  | "command"
  | "search"
  | "operator-pending"
  | "replace";

export type VimOperator = "d" | "y" | "c" | ">" | "<" | "=" | "g~" | "gu" | "gU" | "!" | "gq" | "gw" | "g?" | "zf";

export type SearchDirection = "forward" | "backward";

export type FindMotion = {
  type: "f" | "F" | "t" | "T";
  char: string;
};

export interface CursorPosition {
  line: number;
  col: number;
}

export interface VisualSelection {
  start: CursorPosition;
  end: CursorPosition;
  mode: "char" | "line" | "block";
}

export interface SearchState {
  pattern: string;
  direction: SearchDirection;
  matches: CursorPosition[];
  currentMatchIndex: number;
  highlightEnabled: boolean;
  incrementalMatch?: CursorPosition;
}

export interface JumplistEntry {
  bufferId: string;
  position: CursorPosition;
}

export interface ChangelistEntry {
  bufferId: string;
  position: CursorPosition;
}

export interface VimMark {
  line: number;
  col: number;
  bufferId?: string;
}

export interface Fold {
  startLine: number;
  endLine: number;
  collapsed: boolean;
}

export interface VimBuffer {
  id: string;
  filename: string;
  content: string[];
  cursorLine: number;
  cursorCol: number;
  mode: VimMode;
  modified: boolean;
  readonly: boolean;
  marks: Record<string, VimMark>;
  folds: Fold[];
  syntaxHighlighting: boolean;
  filetype?: string;
  lastInsertPosition?: CursorPosition;
  undoStack: BufferSnapshot[];
  redoStack: BufferSnapshot[];
  changelistPosition: number;
}

export interface BufferSnapshot {
  content: string[];
  cursorLine: number;
  cursorCol: number;
  timestamp: number;
}

export interface VimRegisterContent {
  content: string;
  type: "char" | "line" | "block";
  timestamp: number;
}

export interface VimState {
  buffers: VimBuffer[];
  activeBufferId: string;
  commandLine: string;
  commandLineHistory: string[];
  commandLineHistoryIndex: number;
  searchHistory: string[];
  searchHistoryIndex: number;

  pendingOperator: VimOperator | null;
  pendingCount: number | null;
  pendingRegister: string | null;
  operatorCount: number | null;

  lastCommand: string | null;
  lastOperatorMotion: string | null;
  lastInsertedText: string | null;

  searchState: SearchState | null;
  lastSearchPattern: string | null;
  lastSearchDirection: SearchDirection;

  visualSelection: VisualSelection | null;
  lastVisualSelection: VisualSelection | null;

  globalMarks: Record<string, VimMark>;
  namedRegisters: Record<string, VimRegisterContent>;
  numberedRegisters: VimRegisterContent[];
  unnamedRegister: VimRegisterContent | null;
  smallDeleteRegister: VimRegisterContent | null;
  lastInsertRegister: VimRegisterContent | null;
  lastCommandRegister: VimRegisterContent | null;
  expressionRegister: string | null;
  searchRegister: string | null;
  readOnlyRegisters: {
    filename: string | null;
    alternateFilename: string | null;
    lastInsertedText: string | null;
    lastCommandLine: string | null;
    currentWord: string | null;
    currentWORD: string | null;
  };
  clipboardRegister: VimRegisterContent | null;
  selectionRegister: VimRegisterContent | null;
  blackHoleRegister: boolean;

  recordingMacro: string | null;
  macros: Record<string, string>;
  lastPlayedMacro: string | null;

  jumplist: JumplistEntry[];
  jumplistPosition: number;
  changelist: ChangelistEntry[];
  changelistPosition: number;

  lastFindMotion: FindMotion | null;

  message: string | null;
  messageType: "info" | "error" | "warning" | null;

  insertModeStartCol: number | null;

  leaderActive: boolean;
  leaderKeySequence: string[];
  leaderTimeoutAt: number | null;

  settings: VimSettings;
}

export interface VimSettings {
  number: boolean;
  relativenumber: boolean;
  wrap: boolean;
  expandtab: boolean;
  tabstop: number;
  shiftwidth: number;
  autoindent: boolean;
  smartindent: boolean;
  ignorecase: boolean;
  smartcase: boolean;
  incsearch: boolean;
  hlsearch: boolean;
  cursorline: boolean;
  scrolloff: number;
  sidescrolloff: number;
  showmode: boolean;
  showcmd: boolean;
  ruler: boolean;
  laststatus: number;
  clipboard: "unnamed" | "unnamedplus" | "";
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
  isZoomed: boolean;
  title: string;
  scrollback: string[];
  scrollbackPosition: number;
  alternateScreen: string[] | null;
  synchronizeInput: boolean;
}

export interface TmuxWindow {
  id: string;
  name: string;
  panes: TmuxPane[];
  activePaneId: string;
  isActive: boolean;
  index: number;
  layout: TmuxLayout;
  lastActivePaneId: string | null;
}

export type TmuxLayout =
  | "even-horizontal"
  | "even-vertical"
  | "main-horizontal"
  | "main-vertical"
  | "tiled"
  | "custom";

export interface TmuxSession {
  id: string;
  name: string;
  windows: TmuxWindow[];
  activeWindowId: string;
  lastActiveWindowId: string | null;
  createdAt: number;
  attached: boolean;
}

export interface TmuxCopyModeState {
  enabled: boolean;
  selectionStart: CursorPosition | null;
  selectionEnd: CursorPosition | null;
  rectangleSelect: boolean;
  searchPattern: string | null;
  searchDirection: SearchDirection;
}

export interface TmuxState {
  sessions: TmuxSession[];
  activeSessionId: string;
  prefixActive: boolean;
  prefixTimeout: number | null;
  copyMode: TmuxCopyModeState;
  mouseMode: boolean;
  pasteBuffer: string[];
  pasteBufferIndex: number;
  commandPrompt: string | null;
  commandPromptHistory: string[];
  message: string | null;
  messageType: "info" | "error" | "warning" | null;
}

export interface SimulatorKeyEvent {
  key: string;
  code: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  timestamp: number;
}

export interface SimulatorState {
  tmux: TmuxState;
  vim: VimState;
  keySequence: SimulatorKeyEvent[];
  lastAction: string | null;
  context: "tmux" | "vim";
  focused: boolean;
}

export interface LessonStepValidation {
  cursorPosition?: CursorPosition;
  cursorLine?: number;
  cursorCol?: number;
  mode?: VimMode;
  bufferContent?: string[];
  bufferContentContains?: string;
  bufferLineContent?: { line: number; content: string };
  paneCount?: number;
  windowCount?: number;
  sessionCount?: number;
  visualSelection?: Partial<VisualSelection>;
  registerContent?: { register: string; content: string };
  message?: string;
  commandLine?: string;
}
