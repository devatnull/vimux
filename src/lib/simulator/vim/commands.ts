import type {
  VimBuffer,
  VimState,
  VimSettings,
  BufferSnapshot,
} from "../types";
import { getActiveBuffer as getActiveBufferMaybe } from "./motions";
import { createDefaultBuffer } from "../constants";

export interface CommandResult {
  state: VimState;
  action?: string;
  shouldQuit?: boolean;
}

function getActiveBuffer(state: VimState): VimBuffer {
  const buffer = getActiveBufferMaybe(state);
  if (!buffer) {
    throw new Error(`Active buffer not found: ${state.activeBufferId}`);
  }
  return buffer;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function updateActiveBuffer(state: VimState, buffer: VimBuffer): VimState {
  return {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? buffer : b)),
  };
}

function saveBufferSnapshot(buffer: VimBuffer): BufferSnapshot {
  return {
    content: [...buffer.content],
    cursorLine: buffer.cursorLine,
    cursorCol: buffer.cursorCol,
    timestamp: Date.now(),
  };
}

function pushToUndoStack(buffer: VimBuffer): VimBuffer {
  const snapshot = saveBufferSnapshot(buffer);
  return {
    ...buffer,
    undoStack: [...buffer.undoStack, snapshot],
    redoStack: [],
  };
}

/**
 * Enter command mode (:)
 */
export function enterCommandMode(state: VimState): CommandResult {
  const buffer = getActiveBuffer(state);
  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "command",
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    commandLine: "",
    commandLineHistoryIndex: -1,
  };

  return { state: newState, action: "enter-command-mode" };
}

/**
 * Exit command mode (Escape)
 */
export function exitCommandMode(state: VimState): CommandResult {
  const buffer = getActiveBuffer(state);
  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    commandLine: "",
    commandLineHistoryIndex: -1,
  };

  return { state: newState, action: "exit-command-mode" };
}

/**
 * Handle key input in command mode
 */
export function handleCommandModeKey(
  state: VimState,
  key: string
): CommandResult {
  if (key === "Escape") {
    return exitCommandMode(state);
  }

  if (key === "Enter") {
    return executeCommand(state, state.commandLine);
  }

  if (key === "Backspace") {
    if (state.commandLine.length === 0) {
      return exitCommandMode(state);
    }
    const newState: VimState = {
      ...state,
      commandLine: state.commandLine.slice(0, -1),
    };
    return { state: newState };
  }

  if (key === "ArrowUp") {
    return navigateCommandHistory(state, "up");
  }

  if (key === "ArrowDown") {
    return navigateCommandHistory(state, "down");
  }

  if (key === "Tab") {
    return tabCompleteCommand(state);
  }

  // Regular character input
  if (key.length === 1) {
    const newState: VimState = {
      ...state,
      commandLine: state.commandLine + key,
    };
    return { state: newState };
  }

  return { state };
}

/**
 * Navigate command history with up/down arrows
 */
function navigateCommandHistory(
  state: VimState,
  direction: "up" | "down"
): CommandResult {
  const history = state.commandLineHistory;
  if (history.length === 0) {
    return { state };
  }

  let newIndex = state.commandLineHistoryIndex;

  if (direction === "up") {
    if (newIndex === -1) {
      newIndex = history.length - 1;
    } else if (newIndex > 0) {
      newIndex--;
    }
  } else {
    if (newIndex === -1) {
      return { state };
    }
    if (newIndex < history.length - 1) {
      newIndex++;
    } else {
      newIndex = -1;
    }
  }

  const newCommandLine = newIndex === -1 ? "" : history[newIndex];

  const newState: VimState = {
    ...state,
    commandLine: newCommandLine,
    commandLineHistoryIndex: newIndex,
  };

  return { state: newState };
}

/**
 * Tab completion for commands
 */
function tabCompleteCommand(state: VimState): CommandResult {
  const input = state.commandLine.trim();
  const commands = [
    "w",
    "write",
    "q",
    "quit",
    "wq",
    "x",
    "e",
    "edit",
    "sp",
    "split",
    "vs",
    "vsplit",
    "noh",
    "nohlsearch",
    "set",
    "s",
    "substitute",
    "bn",
    "bnext",
    "bp",
    "bprevious",
    "bd",
    "bdelete",
    "ls",
    "buffers",
    "b",
    "buffer",
    "marks",
    "delmarks",
    "reg",
    "registers",
  ];

  const matches = commands.filter((cmd) => cmd.startsWith(input));
  if (matches.length === 1) {
    const newState: VimState = {
      ...state,
      commandLine: matches[0],
    };
    return { state: newState };
  }

  return { state };
}

/**
 * Execute a command
 */
export function executeCommand(
  state: VimState,
  command: string
): CommandResult {
  const trimmed = command.trim();

  // Add to history if not empty
  let newHistory = state.commandLineHistory;
  if (trimmed && newHistory[newHistory.length - 1] !== trimmed) {
    newHistory = [...newHistory, trimmed];
    // Keep history at reasonable size
    if (newHistory.length > 100) {
      newHistory = newHistory.slice(-100);
    }
  }

  // Check for line number command (:{number})
  const lineNumberMatch = trimmed.match(/^(\d+)$/);
  if (lineNumberMatch) {
    return goToLine(state, parseInt(lineNumberMatch[1], 10), newHistory);
  }

  // Check for range substitute command
  const substituteMatch = trimmed.match(
    /^(%)?(?:'<,'>)?s\/((?:[^\/\\]|\\.)*)\/((?:[^\/\\]|\\.)*)\/?(g)?$/
  );
  if (substituteMatch) {
    const [, range, pattern, replacement, globalFlag] = substituteMatch;
    const isGlobal = globalFlag === "g";
    const isWholeFile = range === "%";
    const isVisualRange = trimmed.startsWith("'<,'>");
    return substituteCommand(
      state,
      pattern,
      replacement,
      isGlobal,
      isWholeFile,
      isVisualRange,
      newHistory
    );
  }

  // Parse command and arguments
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  switch (cmd) {
    case "w":
    case "write":
      return writeCommand(state, args, newHistory);

    case "q":
    case "quit":
      return quitCommand(state, false, newHistory);

    case "q!":
      return quitCommand(state, true, newHistory);

    case "wq":
    case "x":
      return writeQuitCommand(state, newHistory);

    case "e":
    case "edit":
      return editCommand(state, args, newHistory);

    case "sp":
    case "split":
      return splitCommand(state, "horizontal", args, newHistory);

    case "vs":
    case "vsplit":
      return splitCommand(state, "vertical", args, newHistory);

    case "noh":
    case "nohlsearch":
      return noHighlightCommand(state, newHistory);

    case "set":
      return setCommand(state, args, newHistory);

    case "bn":
    case "bnext":
      return bufferNextCommand(state, newHistory);

    case "bp":
    case "bprevious":
      return bufferPreviousCommand(state, newHistory);

    case "bd":
    case "bdelete":
      return bufferDeleteCommand(state, false, newHistory);

    case "bd!":
      return bufferDeleteCommand(state, true, newHistory);

    case "ls":
    case "buffers":
      return listBuffersCommand(state, newHistory);

    case "b":
    case "buffer":
      return switchBufferCommand(state, args, newHistory);

    case "marks":
      return showMarksCommand(state, newHistory);

    case "delmarks":
      return deleteMarksCommand(state, args, newHistory);

    default:
      // Unknown command
      return exitWithError(state, `Unknown command: ${cmd}`, newHistory);
  }
}

/**
 * Go to specific line number
 */
function goToLine(
  state: VimState,
  lineNumber: number,
  history: string[]
): CommandResult {
  const buffer = getActiveBuffer(state);
  const targetLine = clamp(lineNumber - 1, 0, buffer.content.length - 1);
  const line = buffer.content[targetLine] || "";

  // Find first non-whitespace
  let col = 0;
  while (col < line.length && (line[col] === " " || line[col] === "\t")) {
    col++;
  }
  if (col >= line.length && line.length > 0) {
    col = line.length - 1;
  }

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
    cursorLine: targetLine,
    cursorCol: col,
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
  };

  return { state: newState, action: "goto-line" };
}

/**
 * :w - Write/save file (simulated)
 */
function writeCommand(
  state: VimState,
  args: string[],
  history: string[]
): CommandResult {
  const buffer = getActiveBuffer(state);

  // If filename provided, update it
  const filename = args.length > 0 ? args.join(" ") : buffer.filename;

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
    modified: false,
    filename,
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
    message: `"${filename}" written`,
    messageType: "info",
  };

  return { state: newState, action: "write" };
}

/**
 * :q - Quit (simulated)
 */
function quitCommand(
  state: VimState,
  force: boolean,
  history: string[]
): CommandResult {
  const buffer = getActiveBuffer(state);

  if (!force && buffer.modified) {
    return exitWithError(
      state,
      "No write since last change (add ! to override)",
      history
    );
  }

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
    message: "Would quit (simulated)",
    messageType: "info",
  };

  return { state: newState, action: "quit", shouldQuit: true };
}

/**
 * :wq / :x - Write and quit (simulated)
 */
function writeQuitCommand(state: VimState, history: string[]): CommandResult {
  const buffer = getActiveBuffer(state);

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
    modified: false,
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
    message: `"${buffer.filename}" written, would quit (simulated)`,
    messageType: "info",
  };

  return { state: newState, action: "write-quit", shouldQuit: true };
}

/**
 * :e {file} - Edit/open file (simulated with new buffer)
 */
function editCommand(
  state: VimState,
  args: string[],
  history: string[]
): CommandResult {
  if (args.length === 0) {
    return exitWithError(state, "No file name", history);
  }

  const filename = args.join(" ");
  const buffer = getActiveBuffer(state);

  // Check if buffer already exists
  const existingBuffer = state.buffers.find((b) => b.filename === filename);
  if (existingBuffer) {
    const updatedCurrentBuffer: VimBuffer = {
      ...buffer,
      mode: "normal",
    };
    
    const newState: VimState = {
      ...updateActiveBuffer(state, updatedCurrentBuffer),
      activeBufferId: existingBuffer.id,
      commandLine: "",
      commandLineHistory: history,
      commandLineHistoryIndex: -1,
      message: `"${filename}" already open`,
      messageType: "info",
    };
    return { state: newState, action: "switch-buffer" };
  }

  // Create new buffer
  const newBuffer = createDefaultBuffer();
  newBuffer.filename = filename;
  newBuffer.content = [""];
  newBuffer.mode = "normal";

  const updatedCurrentBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
  };

  const newState: VimState = {
    ...state,
    buffers: [
      ...state.buffers.map((b) =>
        b.id === buffer.id ? updatedCurrentBuffer : b
      ),
      newBuffer,
    ],
    activeBufferId: newBuffer.id,
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
    message: `"${filename}" [New File]`,
    messageType: "info",
  };

  return { state: newState, action: "edit" };
}

/**
 * :sp / :vs - Split window (integrate with tmux panes)
 */
function splitCommand(
  state: VimState,
  direction: "horizontal" | "vertical",
  args: string[],
  history: string[]
): CommandResult {
  const buffer = getActiveBuffer(state);

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
    message: `Would create ${direction} split (simulated)`,
    messageType: "info",
  };

  return { state: newState, action: `split-${direction}` };
}

/**
 * :noh - Clear search highlighting
 */
function noHighlightCommand(
  state: VimState,
  history: string[]
): CommandResult {
  const buffer = getActiveBuffer(state);

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
  };

  const newSearchState = state.searchState
    ? { ...state.searchState, highlightEnabled: false }
    : null;

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    searchState: newSearchState,
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
  };

  return { state: newState, action: "nohighlight" };
}

/**
 * :set - Show or toggle settings
 */
function setCommand(
  state: VimState,
  args: string[],
  history: string[]
): CommandResult {
  const buffer = getActiveBuffer(state);

  if (args.length === 0) {
    // Show current settings
    const settings = state.settings;
    const settingsList = Object.entries(settings)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ");

    const updatedBuffer: VimBuffer = {
      ...buffer,
      mode: "normal",
    };

    const newState: VimState = {
      ...updateActiveBuffer(state, updatedBuffer),
      commandLine: "",
      commandLineHistory: history,
      commandLineHistoryIndex: -1,
      message: settingsList,
      messageType: "info",
    };

    return { state: newState, action: "show-settings" };
  }

  // Parse setting
  const setting = args[0];
  let newSettings: VimSettings = { ...state.settings };

  // Helper to set a boolean setting
  const setBooleanSetting = (key: keyof VimSettings, value: boolean): void => {
    if (key === "number") newSettings = { ...newSettings, number: value };
    else if (key === "relativenumber") newSettings = { ...newSettings, relativenumber: value };
    else if (key === "wrap") newSettings = { ...newSettings, wrap: value };
    else if (key === "expandtab") newSettings = { ...newSettings, expandtab: value };
    else if (key === "autoindent") newSettings = { ...newSettings, autoindent: value };
    else if (key === "smartindent") newSettings = { ...newSettings, smartindent: value };
    else if (key === "ignorecase") newSettings = { ...newSettings, ignorecase: value };
    else if (key === "smartcase") newSettings = { ...newSettings, smartcase: value };
    else if (key === "incsearch") newSettings = { ...newSettings, incsearch: value };
    else if (key === "hlsearch") newSettings = { ...newSettings, hlsearch: value };
    else if (key === "cursorline") newSettings = { ...newSettings, cursorline: value };
    else if (key === "showmode") newSettings = { ...newSettings, showmode: value };
    else if (key === "showcmd") newSettings = { ...newSettings, showcmd: value };
    else if (key === "ruler") newSettings = { ...newSettings, ruler: value };
  };

  // Helper to set a numeric setting
  const setNumericSetting = (key: string, value: number): void => {
    if (key === "tabstop") newSettings = { ...newSettings, tabstop: value };
    else if (key === "shiftwidth") newSettings = { ...newSettings, shiftwidth: value };
    else if (key === "scrolloff") newSettings = { ...newSettings, scrolloff: value };
    else if (key === "sidescrolloff") newSettings = { ...newSettings, sidescrolloff: value };
    else if (key === "laststatus") newSettings = { ...newSettings, laststatus: value };
  };

  // Handle boolean toggles (e.g., "number", "nonumber")
  if (setting.startsWith("no")) {
    const key = setting.slice(2) as keyof VimSettings;
    if (key in newSettings && typeof newSettings[key] === "boolean") {
      setBooleanSetting(key, false);
    }
  } else if (setting.includes("=")) {
    // Handle value assignment (e.g., "tabstop=4")
    const [key, value] = setting.split("=");
    if (key in newSettings) {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        setNumericSetting(key, numValue);
      } else if (key === "clipboard") {
        if (value === "unnamed" || value === "unnamedplus" || value === "") {
          newSettings = { ...newSettings, clipboard: value };
        }
      }
    }
  } else if (setting.endsWith("?")) {
    // Query setting value (e.g., "number?")
    const key = setting.slice(0, -1) as keyof VimSettings;
    if (key in newSettings) {
      const value = newSettings[key];
      const updatedBuffer: VimBuffer = {
        ...buffer,
        mode: "normal",
      };
      const newState: VimState = {
        ...updateActiveBuffer(state, updatedBuffer),
        commandLine: "",
        commandLineHistory: history,
        commandLineHistoryIndex: -1,
        message: `${key}=${value}`,
        messageType: "info",
      };
      return { state: newState, action: "query-setting" };
    }
  } else {
    // Toggle boolean or show error
    const key = setting as keyof VimSettings;
    if (key in newSettings && typeof newSettings[key] === "boolean") {
      setBooleanSetting(key, true);
    }
  }

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    settings: newSettings,
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
  };

  return { state: newState, action: "set-setting" };
}

/**
 * Substitute command :s/old/new/[g]
 */
function substituteCommand(
  state: VimState,
  pattern: string,
  replacement: string,
  isGlobal: boolean,
  isWholeFile: boolean,
  isVisualRange: boolean,
  history: string[]
): CommandResult {
  const buffer = getActiveBuffer(state);

  // Unescape the pattern and replacement
  const unescapedPattern = pattern.replace(/\\\//g, "/");
  const unescapedReplacement = replacement.replace(/\\\//g, "/");

  let regex: RegExp;
  try {
    regex = new RegExp(unescapedPattern, isGlobal ? "g" : "");
  } catch {
    return exitWithError(state, `Invalid pattern: ${pattern}`, history);
  }

  const bufferWithUndo = pushToUndoStack(buffer);
  const newContent = [...bufferWithUndo.content];
  let replaceCount = 0;

  // Determine line range
  let startLine = buffer.cursorLine;
  let endLine = buffer.cursorLine;

  if (isWholeFile) {
    startLine = 0;
    endLine = buffer.content.length - 1;
  } else if (isVisualRange && state.lastVisualSelection) {
    startLine = Math.min(
      state.lastVisualSelection.start.line,
      state.lastVisualSelection.end.line
    );
    endLine = Math.max(
      state.lastVisualSelection.start.line,
      state.lastVisualSelection.end.line
    );
  }

  // Perform substitution
  for (let i = startLine; i <= endLine; i++) {
    const line = newContent[i];
    const newLine = line.replace(regex, unescapedReplacement);
    if (newLine !== line) {
      newContent[i] = newLine;
      replaceCount++;
    }
  }

  const updatedBuffer: VimBuffer = {
    ...bufferWithUndo,
    mode: "normal",
    content: newContent,
    modified: replaceCount > 0 ? true : buffer.modified,
  };

  const message =
    replaceCount > 0
      ? `${replaceCount} substitution${replaceCount > 1 ? "s" : ""}`
      : "Pattern not found";

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
    message,
    messageType: replaceCount > 0 ? "info" : "warning",
  };

  return { state: newState, action: "substitute" };
}

/**
 * :bn - Go to next buffer
 */
function bufferNextCommand(state: VimState, history: string[]): CommandResult {
  const buffer = getActiveBuffer(state);
  const currentIndex = state.buffers.findIndex((b) => b.id === buffer.id);
  const nextIndex = (currentIndex + 1) % state.buffers.length;
  const nextBuffer = state.buffers[nextIndex];

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    activeBufferId: nextBuffer.id,
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
    message: `"${nextBuffer.filename}"`,
    messageType: "info",
  };

  return { state: newState, action: "buffer-next" };
}

/**
 * :bp - Go to previous buffer
 */
function bufferPreviousCommand(
  state: VimState,
  history: string[]
): CommandResult {
  const buffer = getActiveBuffer(state);
  const currentIndex = state.buffers.findIndex((b) => b.id === buffer.id);
  const prevIndex =
    (currentIndex - 1 + state.buffers.length) % state.buffers.length;
  const prevBuffer = state.buffers[prevIndex];

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    activeBufferId: prevBuffer.id,
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
    message: `"${prevBuffer.filename}"`,
    messageType: "info",
  };

  return { state: newState, action: "buffer-previous" };
}

/**
 * :bd - Delete/close buffer
 */
function bufferDeleteCommand(
  state: VimState,
  force: boolean,
  history: string[]
): CommandResult {
  const buffer = getActiveBuffer(state);

  if (!force && buffer.modified) {
    return exitWithError(
      state,
      "No write since last change (add ! to override)",
      history
    );
  }

  // If only one buffer, create empty buffer
  if (state.buffers.length === 1) {
    const newBuffer = createDefaultBuffer();
    newBuffer.filename = "[No Name]";
    newBuffer.content = [""];

    const newState: VimState = {
      ...state,
      buffers: [newBuffer],
      activeBufferId: newBuffer.id,
      commandLine: "",
      commandLineHistory: history,
      commandLineHistoryIndex: -1,
      message: "Buffer deleted",
      messageType: "info",
    };

    return { state: newState, action: "buffer-delete" };
  }

  // Switch to next buffer and remove current
  const currentIndex = state.buffers.findIndex((b) => b.id === buffer.id);
  const nextIndex =
    currentIndex === state.buffers.length - 1 ? currentIndex - 1 : currentIndex;
  const remainingBuffers = state.buffers.filter((b) => b.id !== buffer.id);
  const nextBuffer = remainingBuffers[nextIndex];

  const newState: VimState = {
    ...state,
    buffers: remainingBuffers,
    activeBufferId: nextBuffer.id,
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
    message: "Buffer deleted",
    messageType: "info",
  };

  return { state: newState, action: "buffer-delete" };
}

/**
 * :ls / :buffers - List all buffers
 */
function listBuffersCommand(state: VimState, history: string[]): CommandResult {
  const buffer = getActiveBuffer(state);
  const bufferList = state.buffers
    .map((b, i) => {
      const current = b.id === state.activeBufferId ? "%" : " ";
      const modified = b.modified ? "+" : " ";
      return `${i + 1}${current}${modified} "${b.filename}"`;
    })
    .join("\n");

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
    message: bufferList,
    messageType: "info",
  };

  return { state: newState, action: "list-buffers" };
}

/**
 * :b {number|name} - Switch to buffer
 */
function switchBufferCommand(
  state: VimState,
  args: string[],
  history: string[]
): CommandResult {
  const buffer = getActiveBuffer(state);

  if (args.length === 0) {
    return exitWithError(state, "Buffer number or name required", history);
  }

  const arg = args.join(" ");
  let targetBuffer: VimBuffer | undefined;

  // Try to match by number
  const num = parseInt(arg, 10);
  if (!isNaN(num) && num >= 1 && num <= state.buffers.length) {
    targetBuffer = state.buffers[num - 1];
  } else {
    // Try to match by name (partial match)
    targetBuffer = state.buffers.find((b) =>
      b.filename.toLowerCase().includes(arg.toLowerCase())
    );
  }

  if (!targetBuffer) {
    return exitWithError(state, `Buffer not found: ${arg}`, history);
  }

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    activeBufferId: targetBuffer.id,
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
    message: `"${targetBuffer.filename}"`,
    messageType: "info",
  };

  return { state: newState, action: "switch-buffer" };
}

/**
 * :marks - Show all marks
 */
function showMarksCommand(state: VimState, history: string[]): CommandResult {
  const buffer = getActiveBuffer(state);

  const localMarks = Object.entries(buffer.marks)
    .map(([key, mark]) => `'${key}: line ${mark.line + 1}, col ${mark.col}`)
    .join("\n");

  const globalMarks = Object.entries(state.globalMarks)
    .map(
      ([key, mark]) =>
        `'${key}: ${mark.bufferId || buffer.filename} line ${mark.line + 1}, col ${mark.col}`
    )
    .join("\n");

  const allMarks = [localMarks, globalMarks].filter(Boolean).join("\n") || "No marks set";

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
    message: allMarks,
    messageType: "info",
  };

  return { state: newState, action: "show-marks" };
}

/**
 * :delmarks {marks} - Delete specified marks
 */
function deleteMarksCommand(
  state: VimState,
  args: string[],
  history: string[]
): CommandResult {
  const buffer = getActiveBuffer(state);

  if (args.length === 0) {
    return exitWithError(state, "Mark(s) required", history);
  }

  const marksToDelete = args.join("").split("");
  const newLocalMarks = { ...buffer.marks };
  const newGlobalMarks = { ...state.globalMarks };
  let deletedCount = 0;

  for (const mark of marksToDelete) {
    if (mark >= "a" && mark <= "z" && mark in newLocalMarks) {
      delete newLocalMarks[mark];
      deletedCount++;
    } else if (mark >= "A" && mark <= "Z" && mark in newGlobalMarks) {
      delete newGlobalMarks[mark];
      deletedCount++;
    }
  }

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
    marks: newLocalMarks,
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    globalMarks: newGlobalMarks,
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
    message: deletedCount > 0 ? `${deletedCount} mark(s) deleted` : "No marks deleted",
    messageType: "info",
  };

  return { state: newState, action: "delete-marks" };
}

/**
 * Exit command mode with error message
 */
function exitWithError(
  state: VimState,
  errorMessage: string,
  history: string[]
): CommandResult {
  const buffer = getActiveBuffer(state);

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    commandLine: "",
    commandLineHistory: history,
    commandLineHistoryIndex: -1,
    message: errorMessage,
    messageType: "error",
  };

  return { state: newState };
}
