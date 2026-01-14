import type {
  VimState,
  VimBuffer,
  VimSettings,
  TmuxState,
  TmuxSession,
  TmuxWindow,
  TmuxPane,
  TmuxCopyModeState,
  SimulatorState,
  VimRegisterContent,
} from "./types";

export const DEFAULT_VIM_SETTINGS: VimSettings = {
  number: true,
  relativenumber: false,
  wrap: true,
  expandtab: true,
  tabstop: 4,
  shiftwidth: 4,
  autoindent: true,
  smartindent: true,
  ignorecase: false,
  smartcase: true,
  incsearch: true,
  hlsearch: true,
  cursorline: true,
  scrolloff: 8,
  sidescrolloff: 8,
  showmode: true,
  showcmd: true,
  ruler: true,
  laststatus: 2,
  clipboard: "",
};

export const DEFAULT_TERMINAL_WIDTH = 120;
export const DEFAULT_TERMINAL_HEIGHT = 40;
export const DEFAULT_SCROLLBACK_LINES = 10000;
export const TMUX_PREFIX_TIMEOUT_MS = 2000;

export const DEFAULT_SAMPLE_CONTENT = [
  "// Welcome to the Tmux + Neovim Simulator!",
  "// Try using vim motions and commands.",
  "",
  "function greet(name: string): string {",
  "  const greeting = `Hello, ${name}!`;",
  "  return greeting;",
  "}",
  "",
  "const users = [",
  '  { name: "Alice", age: 30 },',
  '  { name: "Bob", age: 25 },',
  '  { name: "Charlie", age: 35 },',
  "];",
  "",
  "for (const user of users) {",
  "  console.log(greet(user.name));",
  "}",
  "",
  "// End of file",
];

export function createDefaultBuffer(
  id: string = "buffer-1",
  filename: string = "main.ts",
  content: string[] = DEFAULT_SAMPLE_CONTENT
): VimBuffer {
  return {
    id,
    filename,
    content: [...content],
    cursorLine: 0,
    cursorCol: 0,
    mode: "normal",
    modified: false,
    readonly: false,
    marks: {},
    folds: [],
    syntaxHighlighting: true,
    filetype: getFiletype(filename),
    undoStack: [],
    redoStack: [],
    changelistPosition: -1,
  };
}

export function getFiletype(filename: string): string | undefined {
  const extension = filename.split(".").pop()?.toLowerCase();
  const filetypeMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescriptreact",
    js: "javascript",
    jsx: "javascriptreact",
    json: "json",
    md: "markdown",
    py: "python",
    rs: "rust",
    go: "go",
    rb: "ruby",
    sh: "bash",
    zsh: "zsh",
    fish: "fish",
    vim: "vim",
    lua: "lua",
    html: "html",
    css: "css",
    scss: "scss",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
  };
  return extension ? filetypeMap[extension] : undefined;
}

export function createEmptyRegister(): VimRegisterContent {
  return {
    content: "",
    type: "char",
    timestamp: Date.now(),
  };
}

export function createDefaultVimState(): VimState {
  const defaultBuffer = createDefaultBuffer();
  return {
    buffers: [defaultBuffer],
    activeBufferId: defaultBuffer.id,
    commandLine: "",
    commandLineHistory: [],
    commandLineHistoryIndex: -1,
    searchHistory: [],
    searchHistoryIndex: -1,

    pendingOperator: null,
    pendingCount: null,
    pendingRegister: null,
    operatorCount: null,

    lastCommand: null,
    lastOperatorMotion: null,
    lastInsertedText: null,

    searchState: null,
    lastSearchPattern: null,
    lastSearchDirection: "forward",

    visualSelection: null,
    lastVisualSelection: null,

    globalMarks: {},
    namedRegisters: {},
    numberedRegisters: Array(10)
      .fill(null)
      .map(() => createEmptyRegister()),
    unnamedRegister: null,
    smallDeleteRegister: null,
    lastInsertRegister: null,
    lastCommandRegister: null,
    expressionRegister: null,
    searchRegister: null,
    readOnlyRegisters: {
      filename: null,
      alternateFilename: null,
      lastInsertedText: null,
      lastCommandLine: null,
      currentWord: null,
      currentWORD: null,
    },
    clipboardRegister: null,
    selectionRegister: null,
    blackHoleRegister: false,

    recordingMacro: null,
    macros: {},
    lastPlayedMacro: null,

    jumplist: [],
    jumplistPosition: -1,
    changelist: [],
    changelistPosition: -1,

    lastFindMotion: null,

    message: null,
    messageType: null,

    insertModeStartCol: null,

    leaderActive: false,
    leaderKeySequence: [],
    leaderTimeoutAt: null,

    settings: { ...DEFAULT_VIM_SETTINGS },
  };
}

export function createDefaultPane(
  id: string = "pane-1",
  width: number = DEFAULT_TERMINAL_WIDTH,
  height: number = DEFAULT_TERMINAL_HEIGHT
): TmuxPane {
  return {
    id,
    width,
    height,
    x: 0,
    y: 0,
    content: Array(height).fill(""),
    cursorX: 0,
    cursorY: 0,
    isActive: true,
    isZoomed: false,
    title: "",
    scrollback: [],
    scrollbackPosition: 0,
    alternateScreen: null,
    synchronizeInput: false,
  };
}

export function createDefaultWindow(
  id: string = "window-1",
  name: string = "main",
  index: number = 0
): TmuxWindow {
  const defaultPane = createDefaultPane();
  return {
    id,
    name,
    panes: [defaultPane],
    activePaneId: defaultPane.id,
    isActive: true,
    index,
    layout: "even-horizontal",
    lastActivePaneId: null,
  };
}

export function createDefaultSession(
  id: string = "session-1",
  name: string = "main"
): TmuxSession {
  const defaultWindow = createDefaultWindow();
  return {
    id,
    name,
    windows: [defaultWindow],
    activeWindowId: defaultWindow.id,
    lastActiveWindowId: null,
    createdAt: Date.now(),
    attached: true,
  };
}

export function createDefaultCopyModeState(): TmuxCopyModeState {
  return {
    enabled: false,
    selectionStart: null,
    selectionEnd: null,
    rectangleSelect: false,
    searchPattern: null,
    searchDirection: "forward",
  };
}

export function createDefaultTmuxState(): TmuxState {
  const defaultSession = createDefaultSession();
  return {
    sessions: [defaultSession],
    activeSessionId: defaultSession.id,
    prefixActive: false,
    prefixTimeout: null,
    copyMode: createDefaultCopyModeState(),
    mouseMode: true,
    pasteBuffer: [],
    pasteBufferIndex: 0,
    commandPrompt: null,
    commandPromptHistory: [],
    message: null,
    messageType: null,
  };
}

export function createDefaultSimulatorState(): SimulatorState {
  return {
    tmux: createDefaultTmuxState(),
    vim: createDefaultVimState(),
    keySequence: [],
    lastAction: null,
    context: "vim",
    focused: true,
  };
}

export const BRACKET_PAIRS: Record<string, string> = {
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "<": ">",
  ">": "<",
};

export const OPENING_BRACKETS = ["(", "[", "{", "<"];
export const CLOSING_BRACKETS = [")", "]", "}", ">"];

export const WORD_SEPARATORS = " \t\n.,;:!?\"'`()[]{}/<>@#$%^&*-+=~|\\";

export const VIM_SPECIAL_KEYS: Record<string, string> = {
  Escape: "<Esc>",
  Enter: "<CR>",
  Tab: "<Tab>",
  Backspace: "<BS>",
  Delete: "<Del>",
  ArrowUp: "<Up>",
  ArrowDown: "<Down>",
  ArrowLeft: "<Left>",
  ArrowRight: "<Right>",
  Home: "<Home>",
  End: "<End>",
  PageUp: "<PageUp>",
  PageDown: "<PageDown>",
  Insert: "<Insert>",
  " ": "<Space>",
};

export const LEADER_KEY = " ";
export const TMUX_PREFIX_KEY = "b";

export const ALPHANUMERIC_REGISTERS = "abcdefghijklmnopqrstuvwxyz";
export const NUMERIC_REGISTERS = "0123456789";
export const SPECIAL_REGISTERS = '"+*-_.%#:/=';
