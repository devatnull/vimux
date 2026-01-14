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
} from "./types";

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
  title: "bash",
});

const createDefaultWindow = (id: string, name: string, index: number): TmuxWindow => ({
  id,
  name,
  panes: [createDefaultPane(`${id}-pane-0`)],
  activePaneId: `${id}-pane-0`,
  isActive: index === 0,
  index,
});

const createDefaultSession = (id: string, name: string): TmuxSession => ({
  id,
  name,
  windows: [createDefaultWindow(`${id}-win-0`, "main", 0)],
  activeWindowId: `${id}-win-0`,
  createdAt: Date.now(),
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
});

const initialSimulatorState: SimulatorState = {
  tmux: {
    sessions: [createDefaultSession("session-0", "main")],
    activeSessionId: "session-0",
    prefixActive: false,
    copyMode: false,
    mouseMode: true,
  },
  vim: {
    buffers: [createDefaultBuffer()],
    activeBufferId: "buffer-0",
    commandLine: "",
    commandMode: false,
    registers: { '"': "" },
    pendingOperator: null,
    count: undefined,
  },
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
  setFeedback: (feedback: { type: "success" | "error"; message: string } | null) => void;
  showMessage: (msg: string, type?: "info" | "warning" | "error") => void;

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
  executeOperator: (op: "d" | "y" | "c", motion: string) => void;
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

    // Validate lesson step
    if (currentLesson) {
      const currentStep = currentLesson.steps[currentStepIndex];
      if (currentStep) {
        const expectedKey = currentStep.expectedKeys[0];
        if (keyRepr === expectedKey || key === expectedKey) {
          set({ feedback: { type: "success", message: currentStep.successMessage } });
          setTimeout(() => {
            get().nextStep();
            set({ feedback: null });
          }, 600);
        }
      }
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
      if (key === "Escape") {
        get().setMode("normal");
        get().moveCursor("left");
      } else if (key === "Backspace") {
        set((s) => {
          const b = s.state.vim.buffers.find((x) => x.id === s.state.vim.activeBufferId);
          if (!b || b.cursorCol === 0) {
            // Join with previous line
            if (b && b.cursorLine > 0) {
              const prevLine = b.content[b.cursorLine - 1];
              const currLine = b.content[b.cursorLine];
              const newContent = [...b.content];
              newContent[b.cursorLine - 1] = prevLine + currLine;
              newContent.splice(b.cursorLine, 1);
              return {
                state: {
                  ...s.state,
                  vim: {
                    ...s.state.vim,
                    buffers: s.state.vim.buffers.map((x) =>
                      x.id === b.id ? { ...x, content: newContent, cursorLine: b.cursorLine - 1, cursorCol: prevLine.length, modified: true } : x
                    ),
                  },
                },
              };
            }
            return s;
          }
          const line = b.content[b.cursorLine];
          const newLine = line.slice(0, b.cursorCol - 1) + line.slice(b.cursorCol);
          const newContent = [...b.content];
          newContent[b.cursorLine] = newLine;
          return {
            state: {
              ...s.state,
              vim: {
                ...s.state.vim,
                buffers: s.state.vim.buffers.map((x) =>
                  x.id === b.id ? { ...x, content: newContent, cursorCol: b.cursorCol - 1, modified: true } : x
                ),
              },
            },
          };
        });
      } else if (key === "Enter") {
        set((s) => {
          const b = s.state.vim.buffers.find((x) => x.id === s.state.vim.activeBufferId);
          if (!b) return s;
          const line = b.content[b.cursorLine];
          const before = line.slice(0, b.cursorCol);
          const after = line.slice(b.cursorCol);
          const newContent = [...b.content];
          newContent[b.cursorLine] = before;
          newContent.splice(b.cursorLine + 1, 0, after);
          return {
            state: {
              ...s.state,
              vim: {
                ...s.state.vim,
                buffers: s.state.vim.buffers.map((x) =>
                  x.id === b.id ? { ...x, content: newContent, cursorLine: b.cursorLine + 1, cursorCol: 0, modified: true } : x
                ),
              },
            },
          };
        });
      } else if (key === "Tab") {
        get().insertChar("  ");
      } else if (key.length === 1) {
        get().insertChar(key);
      }
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
          state: { ...s.state, vim: { ...s.state.vim, pendingOperator: null, message: undefined } },
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
        state: { ...s.state, vim: { ...s.state.vim, message: undefined } },
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
    set({ currentLesson: lesson, currentStepIndex: 0, feedback: null });
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

  setFeedback: (feedback) => set({ feedback }),

  // ===========================================================================
  // TMUX ACTIONS
  // ===========================================================================
  splitPane: (direction) => {
    set((s) => {
      const session = s.state.tmux.sessions.find((x) => x.id === s.state.tmux.activeSessionId);
      if (!session) return s;
      const window = session.windows.find((x) => x.id === session.activeWindowId);
      if (!window) return s;

      const newPaneId = `${window.id}-pane-${window.panes.length}`;
      const newPane = createDefaultPane(newPaneId, true);

      return {
        state: {
          ...s.state,
          tmux: {
            ...s.state.tmux,
            sessions: s.state.tmux.sessions.map((sess) =>
              sess.id === session.id
                ? {
                    ...sess,
                    windows: sess.windows.map((win) =>
                      win.id === window.id
                        ? {
                            ...win,
                            panes: [...win.panes.map((p) => ({ ...p, isActive: false })), newPane],
                            activePaneId: newPaneId,
                          }
                        : win
                    ),
                  }
                : sess
            ),
          },
          lastAction: `Split ${direction}`,
        },
      };
    });
    get().showMessage(`Split ${direction}`, "info");
  },

  navigatePane: (direction) => {
    set((s) => {
      const session = s.state.tmux.sessions.find((x) => x.id === s.state.tmux.activeSessionId);
      if (!session) return s;
      const window = session.windows.find((x) => x.id === session.activeWindowId);
      if (!window || window.panes.length <= 1) return s;

      const currentIndex = window.panes.findIndex((p) => p.id === window.activePaneId);
      let newIndex = currentIndex;

      if (direction === "left" || direction === "up") {
        newIndex = (currentIndex - 1 + window.panes.length) % window.panes.length;
      } else {
        newIndex = (currentIndex + 1) % window.panes.length;
      }

      const newPaneId = window.panes[newIndex].id;

      return {
        state: {
          ...s.state,
          tmux: {
            ...s.state.tmux,
            sessions: s.state.tmux.sessions.map((sess) =>
              sess.id === session.id
                ? {
                    ...sess,
                    windows: sess.windows.map((win) =>
                      win.id === window.id
                        ? {
                            ...win,
                            panes: win.panes.map((p) => ({ ...p, isActive: p.id === newPaneId })),
                            activePaneId: newPaneId,
                          }
                        : win
                    ),
                  }
                : sess
            ),
          },
        },
      };
    });
  },

  resizePane: (direction) => {
    get().showMessage(`Resize ${direction}`, "info");
  },

  createWindow: () => {
    set((s) => {
      const session = s.state.tmux.sessions.find((x) => x.id === s.state.tmux.activeSessionId);
      if (!session) return s;

      const newIndex = session.windows.length;
      const newWindowId = `${session.id}-win-${newIndex}`;
      const newWindow = createDefaultWindow(newWindowId, `window-${newIndex}`, newIndex);

      return {
        state: {
          ...s.state,
          tmux: {
            ...s.state.tmux,
            sessions: s.state.tmux.sessions.map((sess) =>
              sess.id === session.id
                ? {
                    ...sess,
                    windows: [...sess.windows.map((w) => ({ ...w, isActive: false })), { ...newWindow, isActive: true }],
                    activeWindowId: newWindowId,
                  }
                : sess
            ),
          },
        },
      };
    });
    get().showMessage("New window created", "info");
  },

  switchWindow: (index) => {
    set((s) => {
      const session = s.state.tmux.sessions.find((x) => x.id === s.state.tmux.activeSessionId);
      if (!session) return s;

      const targetWindow = session.windows[index];
      if (!targetWindow) return s;

      return {
        state: {
          ...s.state,
          tmux: {
            ...s.state.tmux,
            sessions: s.state.tmux.sessions.map((sess) =>
              sess.id === session.id
                ? {
                    ...sess,
                    windows: sess.windows.map((w) => ({ ...w, isActive: w.id === targetWindow.id })),
                    activeWindowId: targetWindow.id,
                  }
                : sess
            ),
          },
        },
      };
    });
    get().showMessage(`Window ${index}`, "info");
  },

  closePane: () => {
    set((s) => {
      const session = s.state.tmux.sessions.find((x) => x.id === s.state.tmux.activeSessionId);
      if (!session) return s;
      const window = session.windows.find((x) => x.id === session.activeWindowId);
      if (!window || window.panes.length <= 1) return s;

      const currentIndex = window.panes.findIndex((p) => p.id === window.activePaneId);
      const newPanes = window.panes.filter((p) => p.id !== window.activePaneId);
      const newActiveIndex = Math.min(currentIndex, newPanes.length - 1);
      newPanes[newActiveIndex].isActive = true;

      return {
        state: {
          ...s.state,
          tmux: {
            ...s.state.tmux,
            sessions: s.state.tmux.sessions.map((sess) =>
              sess.id === session.id
                ? {
                    ...sess,
                    windows: sess.windows.map((win) =>
                      win.id === window.id ? { ...win, panes: newPanes, activePaneId: newPanes[newActiveIndex].id } : win
                    ),
                  }
                : sess
            ),
          },
        },
      };
    });
    get().showMessage("Pane closed", "info");
  },

  toggleZoom: () => {
    get().showMessage("Zoom toggled", "info");
  },

  swapPane: (direction) => {
    get().showMessage(`Swap pane ${direction}`, "info");
  },

  renameWindow: (name) => {
    get().showMessage(`Renamed to ${name}`, "info");
  },

  toggleCopyMode: () => {
    set((s) => ({
      state: { ...s.state, tmux: { ...s.state.tmux, copyMode: !s.state.tmux.copyMode } },
    }));
    get().showMessage(get().state.tmux.copyMode ? "Copy mode ON" : "Copy mode OFF", "info");
  },

  toggleMouseMode: () => {
    set((s) => ({
      state: { ...s.state, tmux: { ...s.state.tmux, mouseMode: !s.state.tmux.mouseMode } },
    }));
    get().showMessage(get().state.tmux.mouseMode ? "Mouse ON" : "Mouse OFF", "info");
  },

  // ===========================================================================
  // VIM ACTIONS
  // ===========================================================================
  moveCursor: (direction) => {
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      let newLine = buf.cursorLine;
      let newCol = buf.cursorCol;
      const lineLen = buf.content[buf.cursorLine]?.length || 0;

      switch (direction) {
        case "left": newCol = Math.max(0, buf.cursorCol - 1); break;
        case "right": newCol = Math.min(Math.max(0, lineLen - 1), buf.cursorCol + 1); break;
        case "up": newLine = Math.max(0, buf.cursorLine - 1); break;
        case "down": newLine = Math.min(buf.content.length - 1, buf.cursorLine + 1); break;
      }

      const newLineLen = buf.content[newLine]?.length || 0;
      newCol = Math.min(newCol, Math.max(0, newLineLen - 1));

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, cursorLine: newLine, cursorCol: Math.max(0, newCol) } : b
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

      const line = buf.content[buf.cursorLine] || "";
      let newCol = buf.cursorCol;
      let newLine = buf.cursorLine;

      if (direction === "forward") {
        // Skip current word
        while (newCol < line.length && !/\s/.test(line[newCol])) newCol++;
        // Skip whitespace
        while (newCol < line.length && /\s/.test(line[newCol])) newCol++;
        // If at end, go to next line
        if (newCol >= line.length && newLine < buf.content.length - 1) {
          newLine++;
          newCol = 0;
        }
      } else if (direction === "back") {
        if (newCol === 0 && newLine > 0) {
          newLine--;
          newCol = Math.max(0, (buf.content[newLine]?.length || 1) - 1);
        } else {
          newCol--;
          const l = buf.content[newLine] || "";
          while (newCol > 0 && /\s/.test(l[newCol])) newCol--;
          while (newCol > 0 && !/\s/.test(l[newCol - 1])) newCol--;
        }
      } else if (direction === "end") {
        newCol++;
        while (newCol < line.length && /\s/.test(line[newCol])) newCol++;
        while (newCol < line.length - 1 && !/\s/.test(line[newCol + 1])) newCol++;
      }

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, cursorLine: newLine, cursorCol: Math.max(0, newCol) } : b
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

      const line = buf.content[buf.cursorLine] || "";
      let newCol = 0;

      if (position === "start") {
        newCol = 0;
      } else if (position === "firstChar") {
        while (newCol < line.length && /\s/.test(line[newCol])) newCol++;
      } else if (position === "end") {
        newCol = Math.max(0, line.length - 1);
      }

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, cursorCol: newCol } : b
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

      const newLine = position === "top" ? 0 : buf.content.length - 1;

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, cursorLine: newLine, cursorCol: 0 } : b
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

      let newLine = buf.cursorLine;

      if (direction === "forward") {
        while (newLine < buf.content.length - 1 && buf.content[newLine].trim() !== "") newLine++;
        while (newLine < buf.content.length - 1 && buf.content[newLine].trim() === "") newLine++;
      } else {
        while (newLine > 0 && buf.content[newLine].trim() === "") newLine--;
        while (newLine > 0 && buf.content[newLine].trim() !== "") newLine--;
      }

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, cursorLine: newLine, cursorCol: 0 } : b
            ),
          },
        },
      };
    });
  },

  scrollPage: (direction, amount) => {
    const lines = amount === "half" ? 10 : 20;
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      const delta = direction === "down" ? lines : -lines;
      const newLine = Math.max(0, Math.min(buf.content.length - 1, buf.cursorLine + delta));

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, cursorLine: newLine } : b
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
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      const line = buf.content[buf.cursorLine] || "";
      const newLine = line.slice(0, buf.cursorCol) + char + line.slice(buf.cursorCol);
      const newContent = [...buf.content];
      newContent[buf.cursorLine] = newLine;

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, content: newContent, cursorCol: buf.cursorCol + char.length, modified: true } : b
            ),
          },
        },
      };
    });
  },

  deleteChar: () => {
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      const line = buf.content[buf.cursorLine] || "";
      if (line.length === 0) return s;

      const deleted = line[buf.cursorCol] || "";
      const newLine = line.slice(0, buf.cursorCol) + line.slice(buf.cursorCol + 1);
      const newContent = [...buf.content];
      newContent[buf.cursorLine] = newLine;

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            registers: { ...s.state.vim.registers, '"': deleted },
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, content: newContent, cursorCol: Math.min(buf.cursorCol, Math.max(0, newLine.length - 1)), modified: true } : b
            ),
          },
        },
      };
    });
  },

  deleteLine: () => {
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      const yanked = buf.content[buf.cursorLine];
      const newContent = buf.content.filter((_, i) => i !== buf.cursorLine);
      if (newContent.length === 0) newContent.push("");

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            registers: { ...s.state.vim.registers, '"': yanked },
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id
                ? { ...b, content: newContent, cursorLine: Math.min(buf.cursorLine, newContent.length - 1), cursorCol: 0, modified: true }
                : b
            ),
          },
        },
      };
    });
    get().showMessage("1 line deleted", "info");
  },

  yankLine: () => {
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            registers: { ...s.state.vim.registers, '"': buf.content[buf.cursorLine] },
          },
        },
      };
    });
    get().showMessage("1 line yanked", "info");
  },

  putText: (before) => {
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      const text = s.state.vim.registers['"'] || "";
      if (!text) return s;

      const newContent = [...buf.content];
      const insertLine = before ? buf.cursorLine : buf.cursorLine + 1;
      newContent.splice(insertLine, 0, text);

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, content: newContent, cursorLine: insertLine, cursorCol: 0, modified: true } : b
            ),
          },
        },
      };
    });
    get().showMessage("Pasted", "info");
  },

  joinLines: () => {
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf || buf.cursorLine >= buf.content.length - 1) return s;

      const current = buf.content[buf.cursorLine];
      const next = buf.content[buf.cursorLine + 1];
      const newContent = [...buf.content];
      newContent[buf.cursorLine] = current + " " + next.trimStart();
      newContent.splice(buf.cursorLine + 1, 1);

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, content: newContent, cursorCol: current.length, modified: true } : b
            ),
          },
        },
      };
    });
  },

  toggleCase: () => {
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      const line = buf.content[buf.cursorLine] || "";
      const char = line[buf.cursorCol];
      if (!char) return s;

      const toggled = char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase();
      const newContent = [...buf.content];
      newContent[buf.cursorLine] = line.slice(0, buf.cursorCol) + toggled + line.slice(buf.cursorCol + 1);

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, content: newContent, cursorCol: Math.min(buf.cursorCol + 1, line.length - 1), modified: true } : b
            ),
          },
        },
      };
    });
  },

  indent: (direction) => {
    set((s) => {
      const buf = s.state.vim.buffers.find((b) => b.id === s.state.vim.activeBufferId);
      if (!buf) return s;

      const line = buf.content[buf.cursorLine] || "";
      const newContent = [...buf.content];

      if (direction === "right") {
        newContent[buf.cursorLine] = "  " + line;
      } else {
        newContent[buf.cursorLine] = line.replace(/^  /, "");
      }

      return {
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, content: newContent, modified: true } : b
            ),
          },
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
    const buf = get().state.vim.buffers.find((b) => b.id === get().state.vim.activeBufferId);
    if (!buf) return;

    // Clear pending operator
    set((s) => ({ state: { ...s.state, vim: { ...s.state.vim, pendingOperator: null } } }));

    // Handle motions
    if (motion === op) {
      // dd, yy, cc - operate on line
      if (op === "d") get().deleteLine();
      else if (op === "y") get().yankLine();
      else if (op === "c") { get().deleteLine(); get().setMode("insert"); }
      return;
    }

    if (motion === "w" || motion === "e") {
      // dw, yw, cw - word
      const line = buf.content[buf.cursorLine] || "";
      let endCol = buf.cursorCol;
      while (endCol < line.length && !/\s/.test(line[endCol])) endCol++;
      while (endCol < line.length && /\s/.test(line[endCol])) endCol++;

      const deleted = line.slice(buf.cursorCol, endCol);
      const newLine = line.slice(0, buf.cursorCol) + line.slice(endCol);

      set((s) => ({
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            registers: { ...s.state.vim.registers, '"': deleted },
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, content: [...b.content.slice(0, buf.cursorLine), newLine, ...b.content.slice(buf.cursorLine + 1)], modified: op !== "y" } : b
            ),
          },
        },
      }));

      if (op === "c") get().setMode("insert");
      get().showMessage(`${op}${motion}`, "info");
      return;
    }

    if (motion === "b") {
      const line = buf.content[buf.cursorLine] || "";
      let startCol = buf.cursorCol - 1;
      while (startCol > 0 && /\s/.test(line[startCol])) startCol--;
      while (startCol > 0 && !/\s/.test(line[startCol - 1])) startCol--;
      startCol = Math.max(0, startCol);

      const deleted = line.slice(startCol, buf.cursorCol);
      const newLine = line.slice(0, startCol) + line.slice(buf.cursorCol);

      set((s) => ({
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            registers: { ...s.state.vim.registers, '"': deleted },
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, content: [...b.content.slice(0, buf.cursorLine), newLine, ...b.content.slice(buf.cursorLine + 1)], cursorCol: startCol, modified: op !== "y" } : b
            ),
          },
        },
      }));

      if (op === "c") get().setMode("insert");
      return;
    }

    if (motion === "$") {
      const line = buf.content[buf.cursorLine] || "";
      const deleted = line.slice(buf.cursorCol);
      const newLine = line.slice(0, buf.cursorCol);

      set((s) => ({
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            registers: { ...s.state.vim.registers, '"': deleted },
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, content: [...b.content.slice(0, buf.cursorLine), newLine, ...b.content.slice(buf.cursorLine + 1)], modified: op !== "y" } : b
            ),
          },
        },
      }));

      if (op === "c") get().setMode("insert");
      return;
    }

    if (motion === "0" || motion === "^") {
      const line = buf.content[buf.cursorLine] || "";
      const deleted = line.slice(0, buf.cursorCol);
      const newLine = line.slice(buf.cursorCol);

      set((s) => ({
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            registers: { ...s.state.vim.registers, '"': deleted },
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, content: [...b.content.slice(0, buf.cursorLine), newLine, ...b.content.slice(buf.cursorLine + 1)], cursorCol: 0, modified: op !== "y" } : b
            ),
          },
        },
      }));

      if (op === "c") get().setMode("insert");
      return;
    }

    if (motion === "j") {
      // dj - delete current and next line
      const yanked = buf.content.slice(buf.cursorLine, Math.min(buf.cursorLine + 2, buf.content.length)).join("\n");
      const newContent = [...buf.content];
      newContent.splice(buf.cursorLine, 2);
      if (newContent.length === 0) newContent.push("");

      set((s) => ({
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            registers: { ...s.state.vim.registers, '"': yanked },
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, content: newContent, cursorLine: Math.min(buf.cursorLine, newContent.length - 1), modified: op !== "y" } : b
            ),
          },
        },
      }));

      if (op === "c") get().setMode("insert");
      return;
    }

    if (motion === "k") {
      const startLine = Math.max(0, buf.cursorLine - 1);
      const yanked = buf.content.slice(startLine, buf.cursorLine + 1).join("\n");
      const newContent = [...buf.content];
      newContent.splice(startLine, 2);
      if (newContent.length === 0) newContent.push("");

      set((s) => ({
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            registers: { ...s.state.vim.registers, '"': yanked },
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, content: newContent, cursorLine: startLine, modified: op !== "y" } : b
            ),
          },
        },
      }));

      if (op === "c") get().setMode("insert");
      return;
    }

    if (motion === "G") {
      const yanked = buf.content.slice(buf.cursorLine).join("\n");
      const newContent = buf.content.slice(0, buf.cursorLine);
      if (newContent.length === 0) newContent.push("");

      set((s) => ({
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            registers: { ...s.state.vim.registers, '"': yanked },
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, content: newContent, cursorLine: Math.max(0, newContent.length - 1), modified: op !== "y" } : b
            ),
          },
        },
      }));

      if (op === "c") get().setMode("insert");
      return;
    }

    if (motion === "g") {
      const yanked = buf.content.slice(0, buf.cursorLine + 1).join("\n");
      const newContent = buf.content.slice(buf.cursorLine + 1);
      if (newContent.length === 0) newContent.push("");

      set((s) => ({
        state: {
          ...s.state,
          vim: {
            ...s.state.vim,
            registers: { ...s.state.vim.registers, '"': yanked },
            buffers: s.state.vim.buffers.map((b) =>
              b.id === buf.id ? { ...b, content: newContent, cursorLine: 0, modified: op !== "y" } : b
            ),
          },
        },
      }));

      if (op === "c") get().setMode("insert");
      return;
    }

    // iw - inner word, aw - a word (simplified)
    if (motion === "i" || motion === "a") {
      get().showMessage(`${op}${motion}... (press w, ", ', (, {, etc.)`, "info");
      // Would need another key press for text objects
      return;
    }

    // Cancel on Escape or unknown
    if (motion === "Escape") return;

    get().showMessage(`Unknown: ${op}${motion}`, "warning");
  },

  undo: () => {
    get().showMessage("Undo (history not implemented)", "warning");
  },

  redo: () => {
    get().showMessage("Redo (history not implemented)", "warning");
  },

  searchForward: () => {
    get().setMode("command");
  },

  searchBackward: () => {
    get().setMode("command");
  },

  repeatLastChange: () => {
    get().showMessage("Repeat last change", "info");
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
