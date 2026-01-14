"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SimulatorState,
  UserState,
  UserProgress,
  Lesson,
  TmuxSession,
  TmuxWindow,
  TmuxPane,
  VimBuffer,
  VimMode,
  LessonStep,
} from "./types";
import { validateState } from "./validateState";
import { vim, tmux, createDefaultVimState, createDefaultBuffer as createSimulatorBuffer } from "./simulator";

// ============================================================================
// DEFAULT STATE CREATORS
// ============================================================================

const createDefaultPane = (id: string, isActive = true): TmuxPane => ({
  id,
  width: 100,
  height: 100,
  x: 0,
  y: 0,
  content: ["$ "],
  cursorX: 2,
  cursorY: 0,
  isActive,
  isZoomed: false,
  title: "bash",
  scrollback: [],
  scrollbackPosition: 0,
  alternateScreen: null,
  synchronizeInput: false,
});

const createDefaultWindow = (id: string, name: string, index: number): TmuxWindow => ({
  id,
  name,
  panes: [createDefaultPane(`${id}-pane-0`)],
  activePaneId: `${id}-pane-0`,
  isActive: index === 0,
  index,
  layout: "even-horizontal",
  lastActivePaneId: null,
});

const createDefaultSession = (id: string, name: string): TmuxSession => ({
  id,
  name,
  windows: [createDefaultWindow(`${id}-win-0`, "main", 0)],
  activeWindowId: `${id}-win-0`,
  lastActiveWindowId: null,
  createdAt: Date.now(),
  attached: true,
});

const sampleCode = [
  "// Welcome to the tmux & Neovim simulator!",
  "// Try these commands:",
  "//",
  "// VIM MOTIONS: h j k l w b e 0 $ gg G",
  "// OPERATORS: d y c (combine with motions: dw, dd, yy)",
  "// INSERT: i I a A o O",
  "// VISUAL: v V Ctrl-v",
  "// COMMANDS: :w :q :wq",
  "//",
  "// TMUX: Ctrl-a then:",
  "//   - (split horiz)  _ (split vert)",
  "//   h/j/k/l (navigate panes)",
  "//   c (new window)  0-9 (switch window)",
  "//   z (zoom)  x (close pane)",
  "",
  "function fibonacci(n) {",
  "  if (n <= 1) return n;",
  "  return fibonacci(n - 1) + fibonacci(n - 2);",
  "}",
  "",
  "const numbers = [1, 2, 3, 4, 5];",
  "const doubled = numbers.map(n => n * 2);",
  "",
  "class Calculator {",
  "  constructor() {",
  "    this.result = 0;",
  "  }",
  "",
  "  add(x) {",
  "    this.result += x;",
  "    return this;",
  "  }",
  "",
  "  subtract(x) {",
  "    this.result -= x;",
  "    return this;",
  "  }",
  "}",
  "",
  "const calc = new Calculator();",
  "calc.add(10).subtract(3);",
  'console.log("Result:", calc.result);',
  "",
  "// Practice editing this code!",
  "// Try: ciw, daw, yy, p, dd, o, A",
];

const createDefaultBuffer = (): VimBuffer => ({
  id: "buffer-0",
  filename: "practice.js",
  content: [...sampleCode],
  cursorLine: 0,
  cursorCol: 0,
  mode: "normal",
  modified: false,
  readonly: false,
  marks: {},
  folds: [],
  syntaxHighlighting: true,
  filetype: "javascript",
  undoStack: [],
  redoStack: [],
  changelistPosition: 0,
});

const createInitialVimState = () => {
  const defaultVimState = createDefaultVimState();
  const customBuffer = createDefaultBuffer();
  return {
    ...defaultVimState,
    buffers: [customBuffer],
    activeBufferId: customBuffer.id,
  };
};

const initialSimulatorState: SimulatorState = {
  tmux: {
    sessions: [createDefaultSession("session-0", "main")],
    activeSessionId: "session-0",
    prefixActive: false,
    prefixTimeout: null,
    copyMode: {
      enabled: false,
      selectionStart: null,
      selectionEnd: null,
      rectangleSelect: false,
      searchPattern: null,
      searchDirection: "forward",
    },
    mouseMode: true,
    pasteBuffer: [],
    pasteBufferIndex: 0,
    commandPrompt: null,
    commandPromptHistory: [],
    message: null,
    messageType: null,
  },
  vim: createInitialVimState(),
  keySequence: [],
  lastAction: undefined,
};

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

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface SimulatorStore {
  state: SimulatorState;
  currentLesson: Lesson | null;
  currentStepIndex: number;
  feedback: { type: "success" | "error"; message: string } | null;
  leaderActive: boolean;
  leaderSequence: string[];

  handleKeyPress: (key: string, modifiers: { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean }) => void;
  resetSimulator: () => void;
  setLesson: (lesson: Lesson | null) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipStep: () => void;
  resetLesson: () => void;
  validateCurrentStep: () => boolean;
  setFeedback: (feedback: { type: "success" | "error"; message: string } | null) => void;
  showMessage: (msg: string, type?: "info" | "warning" | "error") => void;
  initialLessonState: SimulatorState | null;

  // Tmux actions
  splitPane: (direction: "horizontal" | "vertical") => void;
  navigatePane: (direction: "left" | "right" | "up" | "down") => void;
  resizePane: (direction: "left" | "right" | "up" | "down") => void;
  createWindow: () => void;
  switchWindow: (index: number) => void;
  closePane: () => void;
  toggleZoom: () => void;
  swapPane: (direction: "next" | "prev") => void;
  renameWindow: (name: string) => void;
  toggleCopyMode: () => void;
  toggleMouseMode: () => void;

  // Vim actions
  moveCursor: (direction: "left" | "right" | "up" | "down") => void;
  moveCursorWord: (direction: "forward" | "back" | "end") => void;
  moveCursorLine: (position: "start" | "firstChar" | "end") => void;
  moveCursorFile: (position: "top" | "bottom") => void;
  moveCursorParagraph: (direction: "forward" | "back") => void;
  scrollPage: (direction: "up" | "down", amount: "half" | "full") => void;
  centerScreen: (position: "center" | "top" | "bottom") => void;
  setMode: (mode: VimMode) => void;
  insertChar: (char: string) => void;
  deleteChar: () => void;
  deleteLine: () => void;
  yankLine: () => void;
  putText: (before: boolean) => void;
  joinLines: () => void;
  toggleCase: () => void;
  indent: (direction: "left" | "right") => void;
  executeCommand: (command: string) => void;
  executeOperator: (op: import("./simulator/types").VimOperator, motion: string) => void;
  undo: () => void;
  redo: () => void;
  searchForward: () => void;
  searchBackward: () => void;
  repeatLastChange: () => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useSimulatorStore = create<SimulatorStore>((set, get) => ({
  state: initialSimulatorState,
  currentLesson: null,
  currentStepIndex: 0,
  feedback: null,
  leaderActive: false,
  leaderSequence: [],
  initialLessonState: null,

  // ===========================================================================
  // MAIN KEY HANDLER
  // ===========================================================================
  handleKeyPress: (key, modifiers) => {
    const { state, currentLesson, currentStepIndex, leaderActive, leaderSequence } = get();

    // Build key representation for lesson validation
    let keyRepr = "";
    if (modifiers.ctrl) keyRepr += "Ctrl-";
    if (modifiers.alt) keyRepr += "Alt-";
    if (modifiers.shift && key.length > 1) keyRepr += "Shift-";
    if (modifiers.meta) keyRepr += "Meta-";
    keyRepr += key;

    // Add to sequence
    const newSequence = [...state.keySequence, keyRepr].slice(-10);
    set((s) => ({
      state: { ...s.state, keySequence: newSequence },
    }));

    // Validate lesson step (defer to after state changes)
    if (currentLesson) {
      setTimeout(() => {
        const { state: newState, currentStepIndex: stepIdx } = get();
        const currentStep = currentLesson.steps[stepIdx];
        if (currentStep) {
          let stepPassed = false;
          
          if (currentStep.expectedKeys?.length) {
            const expectedKey = currentStep.expectedKeys[0];
            if (keyRepr === expectedKey || key === expectedKey) {
              stepPassed = true;
            }
          }
          
          if (currentStep.validation && !stepPassed) {
            if (validateState(newState, currentStep.validation)) {
              stepPassed = true;
            }
          }
          
          if (stepPassed) {
            set({ feedback: { type: "success", message: currentStep.successMessage } });
            setTimeout(() => {
              get().nextStep();
              set({ feedback: null });
            }, 600);
          }
        }
      }, 10);
    }

    const buf = state.vim.buffers.find((b) => b.id === state.vim.activeBufferId);
    if (!buf) return;

    // =========================================================================
    // LEADER KEY HANDLING (Space)
    // =========================================================================
    if (key === " " && !modifiers.ctrl && buf.mode === "normal" && !state.tmux.prefixActive) {
      set({ leaderActive: true, leaderSequence: [] });
      get().showMessage("LEADER", "info");
      setTimeout(() => {
        set({ leaderActive: false, leaderSequence: [] });
      }, 2000);
      return;
    }

    if (leaderActive && buf.mode === "normal") {
      const newLeaderSeq = [...leaderSequence, key];
      set({ leaderSequence: newLeaderSeq });
      const seq = newLeaderSeq.join("");

      // Leader key commands
      const leaderCommands: Record<string, () => void> = {
        " ": () => get().showMessage("Find files (Space Space)", "info"),
        "/": () => get().showMessage("Grep search (Space /)", "info"),
        ",": () => get().showMessage("Buffers (Space ,)", "info"),
        ":": () => get().showMessage("Command history (Space :)", "info"),
        "e": () => get().showMessage("File explorer (Space e)", "info"),
        "q": () => get().showMessage("Diagnostic loclist (Space q)", "info"),
        "z": () => get().showMessage("Zen mode toggle (Space z)", "info"),
        "Z": () => get().showMessage("Zoom toggle (Space Z)", "info"),
        ".": () => get().showMessage("Scratch buffer (Space .)", "info"),
        "n": () => get().showMessage("Notification history (Space n)", "info"),
        // File
        "ff": () => get().showMessage("Find files", "info"),
        "fg": () => get().showMessage("Find git files", "info"),
        "fr": () => get().showMessage("Recent files", "info"),
        "fc": () => get().showMessage("Find config files", "info"),
        "fb": () => get().showMessage("Find buffers", "info"),
        "fp": () => get().showMessage("Projects", "info"),
        // Git
        "gb": () => get().showMessage("Git branches", "info"),
        "gl": () => get().showMessage("Git log", "info"),
        "gs": () => get().showMessage("Git status", "info"),
        "gd": () => get().showMessage("Git diff", "info"),
        "gg": () => get().showMessage("Lazygit", "info"),
        "gB": () => get().showMessage("Git browse", "info"),
        // Search
        "sb": () => get().showMessage("Buffer lines", "info"),
        "sg": () => get().showMessage("Grep in project", "info"),
        "sw": () => get().showMessage("Grep word", "info"),
        "sh": () => get().showMessage("Help pages", "info"),
        "sk": () => get().showMessage("Keymaps", "info"),
        "sm": () => get().showMessage("Marks", "info"),
        "sR": () => get().showMessage("Resume last search", "info"),
        // LSP
        "ss": () => get().showMessage("LSP symbols", "info"),
        "re": () => get().showMessage("Rename symbol", "info"),
        "vv": () => get().showMessage("Format code", "info"),
        "ca": () => get().showMessage("Code action", "info"),
        // Window resize
        "rh": () => get().showMessage("Resize left", "info"),
        "rj": () => get().showMessage("Resize down", "info"),
        "rk": () => get().showMessage("Resize up", "info"),
        "rl": () => get().showMessage("Resize right", "info"),
        // Terminal
        "tf": () => get().showMessage("Float terminal", "info"),
        "tb": () => get().showMessage("Bottom terminal", "info"),
        // Buffer
        "bd": () => get().showMessage("Delete buffer", "info"),
        "tt": () => get().showMessage("Pick tab", "info"),
        // Toggles
        "us": () => get().showMessage("Toggle spelling", "info"),
        "uw": () => get().showMessage("Toggle wrap", "info"),
        "ul": () => get().showMessage("Toggle line numbers", "info"),
        "ud": () => get().showMessage("Toggle diagnostics", "info"),
        "uL": () => get().showMessage("Toggle relative numbers", "info"),
        "un": () => get().showMessage("Dismiss notifications", "info"),
        // AI
        "oa": () => get().showMessage("Ask opencode", "info"),
        "ox": () => get().showMessage("Opencode action menu", "info"),
        "ot": () => get().showMessage("Toggle opencode terminal", "info"),
      };

      if (leaderCommands[seq]) {
        leaderCommands[seq]();
        set({ leaderActive: false, leaderSequence: [] });
        return;
      }

      // Check if any command starts with this sequence
      const hasPrefix = Object.keys(leaderCommands).some((cmd) => cmd.startsWith(seq) && cmd !== seq);
      if (!hasPrefix) {
        set({ leaderActive: false, leaderSequence: [] });
      }
      return;
    }

    // =========================================================================
    // TMUX PREFIX HANDLING (Ctrl-a or Ctrl-b)
    // =========================================================================
    if (modifiers.ctrl && (key === "a" || key === "b") && !state.tmux.prefixActive) {
      set((s) => ({
        state: { ...s.state, tmux: { ...s.state.tmux, prefixActive: true } },
      }));
      get().showMessage("PREFIX", "info");
      setTimeout(() => {
        set((s) => ({
          state: { ...s.state, tmux: { ...s.state.tmux, prefixActive: false } },
        }));
      }, 2000);
      return;
    }

    // TMUX PREFIX COMMANDS
    if (state.tmux.prefixActive) {
      set((s) => ({
        state: { ...s.state, tmux: { ...s.state.tmux, prefixActive: false } },
      }));

      const tmuxCommands: Record<string, () => void> = {
        // Splits
        "-": () => get().splitPane("horizontal"),
        "_": () => get().splitPane("vertical"),
        // Pane navigation
        "h": () => get().navigatePane("left"),
        "j": () => get().navigatePane("down"),
        "k": () => get().navigatePane("up"),
        "l": () => get().navigatePane("right"),
        "o": () => get().navigatePane("right"), // next pane
        ";": () => get().showMessage("Last pane", "info"),
        // Pane resize
        "H": () => get().resizePane("left"),
        "J": () => get().resizePane("down"),
        "K": () => get().resizePane("up"),
        "L": () => get().resizePane("right"),
        // Pane management
        "x": () => get().closePane(),
        "z": () => get().toggleZoom(),
        ">": () => get().swapPane("next"),
        "<": () => get().swapPane("prev"),
        "+": () => get().toggleZoom(),
        "!": () => get().showMessage("Break pane to window", "info"),
        "q": () => get().showMessage("Show pane numbers", "info"),
        // Windows
        "c": () => get().createWindow(),
        "&": () => get().showMessage("Kill window", "warning"),
        ",": () => get().showMessage("Rename window", "info"),
        ".": () => get().showMessage("Move window", "info"),
        "w": () => get().showMessage("List windows", "info"),
        "Tab": () => get().showMessage("Last window", "info"),
        // Sessions
        "$": () => get().showMessage("Rename session", "info"),
        "d": () => get().showMessage("Detach client", "warning"),
        "D": () => get().showMessage("Choose client to detach", "info"),
        // Copy mode
        "Enter": () => get().toggleCopyMode(),
        "[": () => get().toggleCopyMode(),
        "]": () => get().showMessage("Paste buffer", "info"),
        "b": () => get().showMessage("List buffers", "info"),
        "p": () => get().showMessage("Paste", "info"),
        "P": () => get().showMessage("Choose buffer", "info"),
        // Utility
        "e": () => get().showMessage("Edit config", "info"),
        "r": () => get().showMessage("Reload config", "info"),
        "m": () => get().toggleMouseMode(),
        "t": () => get().showMessage("Clock", "info"),
        "?": () => get().showMessage("List keybindings", "info"),
        ":": () => get().showMessage("Command prompt", "info"),
        "~": () => get().showMessage("Show messages", "info"),
        "f": () => get().showMessage("Find window", "info"),
        "i": () => get().showMessage("Display info", "info"),
        "I": () => get().showMessage("Install plugins (TPM)", "info"),
        "u": () => get().showMessage("Update plugins (TPM)", "info"),
      };

      // Window numbers
      for (let i = 0; i <= 9; i++) {
        tmuxCommands[i.toString()] = () => get().switchWindow(i);
      }

      // Ctrl- combinations after prefix
      if (modifiers.ctrl) {
        const ctrlCommands: Record<string, () => void> = {
          "h": () => get().showMessage("Previous window", "info"),
          "l": () => get().showMessage("Next window", "info"),
          "c": () => get().showMessage("New session", "info"),
          "f": () => get().showMessage("Find session", "info"),
        };
        if (ctrlCommands[key]) {
          ctrlCommands[key]();
          return;
        }
      }

      if (tmuxCommands[key]) {
        tmuxCommands[key]();
        return;
      }

      return;
    }

    // =========================================================================
    // VIM WINDOW NAVIGATION (Ctrl-h/j/k/l)
    // =========================================================================
    if (modifiers.ctrl && ["h", "j", "k", "l"].includes(key)) {
      const direction = { h: "left", j: "down", k: "up", l: "right" }[key] as "left" | "right" | "up" | "down";
      get().navigatePane(direction);
      get().showMessage(`Window ${direction}`, "info");
      return;
    }

    // =========================================================================
    // VIM SCROLL (Ctrl-d/u/f/b)
    // =========================================================================
    if (modifiers.ctrl && ["d", "u", "f", "b"].includes(key) && buf.mode === "normal") {
      if (key === "d") get().scrollPage("down", "half");
      if (key === "u") get().scrollPage("up", "half");
      if (key === "f") get().scrollPage("down", "full");
      if (key === "b") get().scrollPage("up", "full");
      return;
    }

    // =========================================================================
    // VIM MODE HANDLING
    // =========================================================================
    const pendingOp = state.vim.pendingOperator;

    // COMMAND MODE
    if (buf.mode === "command") {
      if (key === "Escape") {
        get().setMode("normal");
        set((s) => ({ state: { ...s.state, vim: { ...s.state.vim, commandLine: "" } } }));
      } else if (key === "Enter") {
        get().executeCommand(state.vim.commandLine);
        get().setMode("normal");
        set((s) => ({ state: { ...s.state, vim: { ...s.state.vim, commandLine: "" } } }));
      } else if (key === "Backspace") {
        set((s) => ({
          state: { ...s.state, vim: { ...s.state.vim, commandLine: s.state.vim.commandLine.slice(0, -1) } },
        }));
      } else if (key.length === 1) {
        set((s) => ({
          state: { ...s.state, vim: { ...s.state.vim, commandLine: s.state.vim.commandLine + key } },
        }));
      }
      return;
    }

    // INSERT MODE
    if (buf.mode === "insert") {
      set((s) => {
        const result = vim.handleInsertModeKey(s.state.vim, key, modifiers.ctrl);
        return {
          state: {
            ...s.state,
            vim: result.state,
          },
        };
      });
      return;
    }

    // VISUAL MODE
    if (buf.mode === "visual") {
      if (key === "Escape" || key === "v" || key === "V") {
        get().setMode("normal");
      } else if (["h", "j", "k", "l"].includes(key)) {
        get().moveCursor(key === "h" ? "left" : key === "j" ? "down" : key === "k" ? "up" : "right");
      } else if (key === "w") {
        get().moveCursorWord("forward");
      } else if (key === "b") {
        get().moveCursorWord("back");
      } else if (key === "e") {
        get().moveCursorWord("end");
      } else if (key === "d" || key === "x") {
        get().showMessage("Deleted selection", "info");
        get().setMode("normal");
      } else if (key === "y") {
        get().showMessage("Yanked selection", "info");
        get().setMode("normal");
      } else if (key === "c") {
        get().showMessage("Changed selection", "info");
        get().setMode("insert");
      }
      return;
    }

    // NORMAL MODE - OPERATOR PENDING
    if (pendingOp) {
      get().executeOperator(pendingOp, key);
      return;
    }

    // NORMAL MODE
    const normalCommands: Record<string, () => void> = {
      // Movement
      "h": () => get().moveCursor("left"),
      "j": () => get().moveCursor("down"),
      "k": () => get().moveCursor("up"),
      "l": () => get().moveCursor("right"),
      "w": () => get().moveCursorWord("forward"),
      "W": () => get().moveCursorWord("forward"),
      "b": () => get().moveCursorWord("back"),
      "B": () => get().moveCursorWord("back"),
      "e": () => get().moveCursorWord("end"),
      "E": () => get().moveCursorWord("end"),
      "0": () => get().moveCursorLine("start"),
      "^": () => get().moveCursorLine("firstChar"),
      "$": () => get().moveCursorLine("end"),
      "g": () => get().moveCursorFile("top"), // gg simplified
      "G": () => get().moveCursorFile("bottom"),
      "{": () => get().moveCursorParagraph("back"),
      "}": () => get().moveCursorParagraph("forward"),
      // Screen positioning (zz simplified - handled separately)
      // Mode changes
      "i": () => get().setMode("insert"),
      "I": () => { get().moveCursorLine("firstChar"); get().setMode("insert"); },
      "a": () => { get().moveCursor("right"); get().setMode("insert"); },
      "A": () => { get().moveCursorLine("end"); get().moveCursor("right"); get().setMode("insert"); },
      "o": () => {
        set((s) => {
          const b = s.state.vim.buffers.find((x) => x.id === s.state.vim.activeBufferId);
          if (!b) return s;
          const newContent = [...b.content];
          newContent.splice(b.cursorLine + 1, 0, "");
          return {
            state: {
              ...s.state,
              vim: {
                ...s.state.vim,
                buffers: s.state.vim.buffers.map((x) =>
                  x.id === b.id ? { ...x, content: newContent, cursorLine: b.cursorLine + 1, cursorCol: 0, mode: "insert", modified: true } : x
                ),
              },
            },
          };
        });
      },
      "O": () => {
        set((s) => {
          const b = s.state.vim.buffers.find((x) => x.id === s.state.vim.activeBufferId);
          if (!b) return s;
          const newContent = [...b.content];
          newContent.splice(b.cursorLine, 0, "");
          return {
            state: {
              ...s.state,
              vim: {
                ...s.state.vim,
                buffers: s.state.vim.buffers.map((x) =>
                  x.id === b.id ? { ...x, content: newContent, cursorCol: 0, mode: "insert", modified: true } : x
                ),
              },
            },
          };
        });
      },
      "v": () => get().setMode("visual"),
      "V": () => get().setMode("visual"),
      ":": () => get().setMode("command"),
      "/": () => { get().setMode("command"); get().showMessage("Search forward", "info"); },
      "?": () => { get().setMode("command"); get().showMessage("Search backward", "info"); },
      // Operators (set pending)
      "d": () => set((s) => ({ state: { ...s.state, vim: { ...s.state.vim, pendingOperator: "d" } } })),
      "y": () => set((s) => ({ state: { ...s.state, vim: { ...s.state.vim, pendingOperator: "y" } } })),
      "c": () => set((s) => ({ state: { ...s.state, vim: { ...s.state.vim, pendingOperator: "c" } } })),
      // Quick operators
      "x": () => get().deleteChar(),
      "X": () => { get().moveCursor("left"); get().deleteChar(); },
      "s": () => { get().deleteChar(); get().setMode("insert"); },
      "S": () => { get().deleteLine(); get().setMode("insert"); },
      "D": () => get().executeOperator("d", "$"),
      "C": () => { get().executeOperator("d", "$"); get().setMode("insert"); },
      "Y": () => get().yankLine(),
      // Put
      "p": () => get().putText(false),
      "P": () => get().putText(true),
      // Edit
      "J": () => get().joinLines(),
      "~": () => get().toggleCase(),
      "u": () => get().undo(),
      "r": () => get().showMessage("Replace char (press next key)", "info"),
      ".": () => get().repeatLastChange(),
      // Indent
      ">": () => get().indent("right"),
      "<": () => get().indent("left"),
      // Misc
      "Escape": () => {
        set((s) => ({
          state: { ...s.state, vim: { ...s.state.vim, pendingOperator: null, message: null } },
        }));
      },
      "n": () => get().showMessage("Next search match", "info"),
      "N": () => get().showMessage("Previous search match", "info"),
      "*": () => get().showMessage("Search word forward", "info"),
      "#": () => get().showMessage("Search word backward", "info"),
      // Marks
      "m": () => get().showMessage("Set mark (press letter)", "info"),
      "'": () => get().showMessage("Jump to mark (press letter)", "info"),
      "`": () => get().showMessage("Jump to mark exact (press letter)", "info"),
      // Macros
      "q": () => get().showMessage("Record macro (press letter)", "info"),
      "@": () => get().showMessage("Play macro (press letter)", "info"),
      // Folding
      "z": () => get().showMessage("Fold command (za/zc/zo/zM/zR)", "info"),
      // LSP-like
      "K": () => get().showMessage("Hover documentation", "info"),
      // Number increment/decrement
      "+": () => get().showMessage("Increment number", "info"),
      "-": () => get().showMessage("Decrement number", "info"),
    };

    // gX commands
    if (key === "g") {
      // Simplified: just go to top
      get().moveCursorFile("top");
      return;
    }

    if (normalCommands[key]) {
      normalCommands[key]();
      return;
    }

    // F-keys
    if (key === "F7") get().showMessage("Toggle outline (aerial)", "info");
    if (key === "F8") get().showMessage("Git status float", "info");
    if (key === "F9") get().showMessage("Toggle file explorer", "info");
  },

  // ===========================================================================
  // MESSAGE HELPER
  // ===========================================================================
  showMessage: (msg, type = "info") => {
    set((s) => ({
      state: {
        ...s.state,
        vim: { ...s.state.vim, message: msg, messageType: type },
        lastAction: msg,
      },
    }));
    setTimeout(() => {
      set((s) => ({
        state: { ...s.state, vim: { ...s.state.vim, message: null } },
      }));
    }, 1500);
  },

  // ===========================================================================
  // LESSON MANAGEMENT
  // ===========================================================================
  resetSimulator: () => {
    set({
      state: { ...initialSimulatorState, vim: { ...initialSimulatorState.vim, buffers: [createDefaultBuffer()] } },
      currentStepIndex: 0,
      feedback: null,
      leaderActive: false,
      leaderSequence: [],
    });
  },

  setLesson: (lesson) => {
    const { state } = get();
    set({ 
      currentLesson: lesson, 
      currentStepIndex: 0, 
      feedback: null,
      initialLessonState: JSON.parse(JSON.stringify(state)),
    });
  },

  nextStep: () => {
    const { currentLesson, currentStepIndex } = get();
    if (!currentLesson) return;
    if (currentStepIndex < currentLesson.steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  skipStep: () => {
    const { currentLesson, currentStepIndex } = get();
    if (!currentLesson) return;
    if (currentStepIndex < currentLesson.steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1, feedback: null });
    }
  },

  resetLesson: () => {
    const { initialLessonState } = get();
    if (initialLessonState) {
      set({ 
        state: JSON.parse(JSON.stringify(initialLessonState)),
        currentStepIndex: 0, 
        feedback: null,
      });
    }
  },

  validateCurrentStep: () => {
    const { state, currentLesson, currentStepIndex } = get();
    if (!currentLesson) return false;
    const currentStep = currentLesson.steps[currentStepIndex];
    if (!currentStep?.validation) return false;
    return validateState(state, currentStep.validation);
  },

  setFeedback: (feedback) => set({ feedback }),

  // ===========================================================================
  // TMUX ACTIONS (using simulator modules)
  // ===========================================================================
  splitPane: (direction) => {
    set((s) => {
      const result = direction === "horizontal" 
        ? tmux.splitHorizontal(s.state.tmux)
        : tmux.splitVertical(s.state.tmux);
      return {
        state: {
          ...s.state,
          tmux: result.state,
          lastAction: result.message || `Split ${direction}`,
        },
      };
    });
    get().showMessage(`Split ${direction}`, "info");
  },

  navigatePane: (direction) => {
    set((s) => {
      let result;
      switch (direction) {
        case "left": result = tmux.navigateLeft(s.state.tmux); break;
        case "right": result = tmux.navigateRight(s.state.tmux); break;
        case "up": result = tmux.navigateUp(s.state.tmux); break;
        case "down": result = tmux.navigateDown(s.state.tmux); break;
        default: return s;
      }
      return {
        state: {
          ...s.state,
          tmux: result.state,
        },
      };
    });
  },

  resizePane: (direction) => {
    set((s) => {
      const result = tmux.resizePane(s.state.tmux, direction, 5);
      return {
        state: {
          ...s.state,
          tmux: result.state,
        },
      };
    });
    get().showMessage(`Resize ${direction}`, "info");
  },

  createWindow: () => {
    set((s) => {
      const result = tmux.createWindow(s.state.tmux);
      return {
        state: {
          ...s.state,
          tmux: result.state,
        },
      };
    });
    get().showMessage("New window created", "info");
  },

  switchWindow: (index) => {
    set((s) => {
      const result = tmux.switchToWindow(s.state.tmux, index);
      return {
        state: {
          ...s.state,
          tmux: result.state,
        },
      };
    });
    get().showMessage(`Window ${index}`, "info");
  },

  closePane: () => {
    set((s) => {
      const result = tmux.closePane(s.state.tmux);
      return {
        state: {
          ...s.state,
          tmux: result.state,
        },
      };
    });
    get().showMessage("Pane closed", "info");
  },

  toggleZoom: () => {
    set((s) => {
      const result = tmux.toggleZoom(s.state.tmux);
      return {
        state: {
          ...s.state,
          tmux: result.state,
        },
      };
    });
    get().showMessage("Zoom toggled", "info");
  },

  swapPane: (direction) => {
    set((s) => {
      const result = direction === "next"
        ? tmux.swapWithNext(s.state.tmux)
        : tmux.swapWithPrevious(s.state.tmux);
      return {
        state: {
          ...s.state,
          tmux: result.state,
        },
      };
    });
    get().showMessage(`Swap pane ${direction}`, "info");
  },

  renameWindow: (name) => {
    set((s) => {
      const result = tmux.renameWindow(s.state.tmux, name);
      return {
        state: {
          ...s.state,
          tmux: result.state,
        },
      };
    });
    get().showMessage(`Renamed to ${name}`, "info");
  },

  toggleCopyMode: () => {
    set((s) => {
      const result = s.state.tmux.copyMode.enabled 
        ? tmux.exitCopyMode(s.state.tmux)
        : tmux.enterCopyMode(s.state.tmux);
      return {
        state: {
          ...s.state,
          tmux: result.state,
        },
      };
    });
    get().showMessage(get().state.tmux.copyMode.enabled ? "Copy mode ON" : "Copy mode OFF", "info");
  },

  toggleMouseMode: () => {
    set((s) => {
      const result = tmux.toggleMouseMode(s.state.tmux);
      return {
        state: {
          ...s.state,
          tmux: result.state,
        },
      };
    });
    get().showMessage(get().state.tmux.mouseMode ? "Mouse ON" : "Mouse OFF", "info");
  },

  // ===========================================================================
  // VIM ACTIONS (using simulator modules)
  // ===========================================================================
  moveCursor: (direction) => {
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      let result;
      switch (direction) {
        case "left": result = vim.motionH(buf); break;
        case "right": result = vim.motionL(buf); break;
        case "up": result = vim.motionK(buf); break;
        case "down": result = vim.motionJ(buf); break;
        default: return s;
      }

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, cursorLine: result.line, cursorCol: result.col } : b
            ),
          },
        },
      };
    });
  },

  moveCursorWord: (direction) => {
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      let result;
      switch (direction) {
        case "forward": result = vim.motionW(buf); break;
        case "back": result = vim.motionB(buf); break;
        case "end": result = vim.motionE(buf); break;
        default: return s;
      }

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, cursorLine: result.line, cursorCol: result.col } : b
            ),
          },
        },
      };
    });
  },

  moveCursorLine: (position) => {
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      let result;
      switch (position) {
        case "start": result = vim.motion0(buf); break;
        case "firstChar": result = vim.motionCaret(buf); break;
        case "end": result = vim.motionDollar(buf); break;
        default: return s;
      }

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, cursorLine: result.line, cursorCol: result.col } : b
            ),
          },
        },
      };
    });
  },

  moveCursorFile: (position) => {
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      const result = position === "top" ? vim.motionGG(buf) : vim.motionG(buf);

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, cursorLine: result.line, cursorCol: result.col } : b
            ),
          },
        },
      };
    });
  },

  moveCursorParagraph: (direction) => {
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      const result = direction === "forward" 
        ? vim.motionParagraphForward(buf) 
        : vim.motionParagraphBackward(buf);

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, cursorLine: result.line, cursorCol: result.col } : b
            ),
          },
        },
      };
    });
  },

  scrollPage: (direction, amount) => {
    const visibleLines = 20;
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      let result;
      if (amount === "half") {
        result = direction === "down" 
          ? vim.motionCtrlD(buf, visibleLines) 
          : vim.motionCtrlU(buf, visibleLines);
      } else {
        result = direction === "down" 
          ? vim.motionCtrlF(buf, visibleLines) 
          : vim.motionCtrlB(buf, visibleLines);
      }

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, cursorLine: result.line, cursorCol: result.col } : b
            ),
          },
        },
      };
    });
  },

  centerScreen: (position) => {
    get().showMessage(`Screen ${position}`, "info");
  },

  setMode: (mode) => {
    set((s) => ({
      state: {
        ...s.state,
        vim: {
          ...s.state.vim,
          buffers: s.state.vim.buffers.map((b) =>
            b.id === s.state.vim.activeBufferId ? { ...b, mode } : b
          ),
          commandMode: mode === "command",
          pendingOperator: null,
        },
      },
    }));
  },

  insertChar: (char) => {
    set((s) => {
      const result = vim.insertCharacter(s.state.vim, char);
      return {
        state: {
          ...s.state,
          vim: result.state,
        },
      };
    });
  },

  deleteChar: () => {
    set((s) => {
      const result = vim.deleteCharUnderCursor(s.state.vim);
      return {
        state: {
          ...s.state,
          vim: result.state,
        },
      };
    });
  },

  deleteLine: () => {
    set((s) => {
      const result = vim.deleteWholeLine(s.state.vim);
      return {
        state: {
          ...s.state,
          vim: result.state,
        },
      };
    });
    get().showMessage("1 line deleted", "info");
  },

  yankLine: () => {
    set((s) => {
      const result = vim.yankWholeLine(s.state.vim);
      return {
        state: {
          ...s.state,
          vim: result.state,
        },
      };
    });
    get().showMessage("1 line yanked", "info");
  },

  putText: (before) => {
    set((s) => {
      const result = before ? vim.pasteBefore(s.state.vim) : vim.pasteAfter(s.state.vim);
      return {
        state: {
          ...s.state,
          vim: result,
        },
      };
    });
    get().showMessage("Pasted", "info");
  },

  joinLines: () => {
    set((s) => {
      const result = vim.joinLines(s.state.vim);
      return {
        state: {
          ...s.state,
          vim: result,
        },
      };
    });
  },

  toggleCase: () => {
    set((s) => {
      const result = vim.toggleCaseAtCursor(s.state.vim);
      return {
        state: {
          ...s.state,
          vim: result,
        },
      };
    });
  },

  indent: (direction) => {
    set((s) => {
      const result = direction === "right"
        ? vim.indentLine(s.state.vim)
        : vim.dedentLine(s.state.vim);
      return {
        state: {
          ...s.state,
          vim: result,
        },
      };
    });
  },

  executeCommand: (command) => {
    const cmd = command.trim();
    if (cmd === "w" || cmd === "write") {
      get().showMessage("File written", "info");
      set((s) => ({
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === s.state.vim.activeBufferId ? { ...b, modified: false } : b
            ),
          },
        },
      }));
    } else if (cmd === "q" || cmd === "quit") {
      get().showMessage("Cannot quit in simulator", "warning");
    } else if (cmd === "wq" || cmd === "x") {
      get().showMessage("File written, cannot quit", "info");
    } else if (cmd.startsWith("e ")) {
      get().showMessage(`Would open: ${cmd.slice(2)}`, "info");
    } else if (cmd.startsWith("sp") || cmd.startsWith("vs")) {
      get().splitPane(cmd.startsWith("vs") ? "vertical" : "horizontal");
    } else if (cmd === "noh" || cmd === "nohlsearch") {
      get().showMessage("Search cleared", "info");
    } else {
      get().showMessage(`Unknown: ${cmd}`, "warning");
    }
  },

  executeOperator: (op, motion) => {
    // Handle line operations (dd, yy, cc)
    if (motion === op) {
      if (op === "d") get().deleteLine();
      else if (op === "y") get().yankLine();
      else if (op === "c") { get().deleteLine(); get().setMode("insert"); }
      return;
    }

    // Handle text objects (i/a followed by another key)
    if (motion === "i" || motion === "a") {
      get().showMessage(`${op}${motion}... (press w, ", ', (, {, etc.)`, "info");
      return;
    }

    // Cancel on Escape
    if (motion === "Escape") {
      set((s) => ({ state: { ...s.state, vim: { ...s.state.vim, pendingOperator: null } } }));
      return;
    }

    // Use simulator's executeOperatorWithMotion for supported operators
    if (op === "d" || op === "y" || op === "c") {
      set((s) => {
        const result = vim.executeOperatorWithMotion(s.state.vim, op, motion);
        return {
          state: {
            ...s.state,
            vim: result.state,
          },
        };
      });
      get().showMessage(`${op}${motion}`, "info");
    } else {
      get().showMessage(`Unknown: ${op}${motion}`, "warning");
    }
  },

  undo: () => {
    set((s) => {
      const result = vim.undo(s.state.vim);
      return {
        state: {
          ...s.state,
          vim: result.state,
        },
      };
    });
  },

  redo: () => {
    set((s) => {
      const result = vim.redo(s.state.vim);
      return {
        state: {
          ...s.state,
          vim: result.state,
        },
      };
    });
  },

  searchForward: () => {
    get().setMode("command");
  },

  searchBackward: () => {
    get().setMode("command");
  },

  repeatLastChange: () => {
    set((s) => {
      const result = vim.executeDotRepeat(s.state.vim);
      if (!result.success && result.error) {
        return {
          state: {
            ...s.state,
            vim: { ...s.state.vim, message: result.error, messageType: "warning" },
          },
        };
      }
      return {
        state: {
          ...s.state,
          vim: result.state,
        },
      };
    });
  },
}));

// ============================================================================
// USER STORE (with persistence)
// ============================================================================

interface UserStore {
  user: UserState;
  updateProgress: (lessonId: string, progress: Partial<UserProgress>) => void;
  markLessonComplete: (lessonId: string) => void;
  updatePreferences: (prefs: Partial<UserState["preferences"]>) => void;
  resetProgress: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: initialUserState,

      updateProgress: (lessonId, progress) => {
        set((s) => ({
          user: {
            ...s.user,
            progress: {
              ...s.user.progress,
              [lessonId]: {
                ...(s.user.progress[lessonId] || { lessonId, completed: false, currentStep: 0, startedAt: Date.now(), attempts: 0 }),
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
                ...(s.user.progress[lessonId] || { lessonId, currentStep: 0, startedAt: Date.now(), attempts: 0 }),
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

      updatePreferences: (prefs) => {
        set((s) => ({
          user: { ...s.user, preferences: { ...s.user.preferences, ...prefs } },
        }));
      },

      resetProgress: () => {
        set({ user: initialUserState });
      },
    }),
    { name: "learn-tmux-nvim-progress" }
  )
);
