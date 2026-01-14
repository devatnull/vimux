import type {
  VimBuffer,
  VimState,
  VimRegisterContent,
  BufferSnapshot,
  CursorPosition,
} from "../types";
import { getActiveBuffer as getActiveBufferMaybe } from "./motions";

export interface InsertModeResult {
  state: VimState;
  action?: string;
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

function updateActiveBuffer(state: VimState, buffer: VimBuffer): VimState {
  return {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? buffer : b)),
  };
}

/**
 * Enter insert mode before cursor (i)
 */
export function enterInsertMode(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "insert",
    lastInsertPosition: { line: buffer.cursorLine, col: buffer.cursorCol },
  };
  
  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    insertModeStartCol: buffer.cursorCol,
    lastInsertedText: "",
  };
  
  return { state: newState, action: "enter-insert" };
}

/**
 * Enter insert mode after cursor (a)
 */
export function enterInsertModeAfter(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  const newCol = Math.min(buffer.cursorCol + 1, line.length);
  
  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "insert",
    cursorCol: newCol,
    lastInsertPosition: { line: buffer.cursorLine, col: newCol },
  };
  
  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    insertModeStartCol: newCol,
    lastInsertedText: "",
  };
  
  return { state: newState, action: "enter-insert-after" };
}

/**
 * Enter insert mode at first non-whitespace (I)
 */
export function enterInsertModeLineStart(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  const match = line.match(/^\s*/);
  const firstNonWhitespace = match ? match[0].length : 0;
  
  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "insert",
    cursorCol: firstNonWhitespace,
    lastInsertPosition: { line: buffer.cursorLine, col: firstNonWhitespace },
  };
  
  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    insertModeStartCol: firstNonWhitespace,
    lastInsertedText: "",
  };
  
  return { state: newState, action: "enter-insert-line-start" };
}

/**
 * Enter insert mode at end of line (A)
 */
export function enterInsertModeLineEnd(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  const endCol = line.length;
  
  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "insert",
    cursorCol: endCol,
    lastInsertPosition: { line: buffer.cursorLine, col: endCol },
  };
  
  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    insertModeStartCol: endCol,
    lastInsertedText: "",
  };
  
  return { state: newState, action: "enter-insert-line-end" };
}

/**
 * Open new line below and enter insert (o)
 */
export function openLineBelow(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  const currentLine = buffer.content[buffer.cursorLine] || "";
  
  // Calculate indentation based on current line
  let indent = "";
  if (state.settings.autoindent) {
    const match = currentLine.match(/^(\s*)/);
    indent = match ? match[1] : "";
  }
  
  const newContent = [...buffer.content];
  newContent.splice(buffer.cursorLine + 1, 0, indent);
  
  const updatedBuffer: VimBuffer = {
    ...pushToUndoStack(buffer),
    mode: "insert",
    content: newContent,
    cursorLine: buffer.cursorLine + 1,
    cursorCol: indent.length,
    modified: true,
    lastInsertPosition: { line: buffer.cursorLine + 1, col: indent.length },
  };
  
  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    insertModeStartCol: indent.length,
    lastInsertedText: "",
  };
  
  return { state: newState, action: "open-line-below" };
}

/**
 * Open new line above and enter insert (O)
 */
export function openLineAbove(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  const currentLine = buffer.content[buffer.cursorLine] || "";
  
  // Calculate indentation based on current line
  let indent = "";
  if (state.settings.autoindent) {
    const match = currentLine.match(/^(\s*)/);
    indent = match ? match[1] : "";
  }
  
  const newContent = [...buffer.content];
  newContent.splice(buffer.cursorLine, 0, indent);
  
  const updatedBuffer: VimBuffer = {
    ...pushToUndoStack(buffer),
    mode: "insert",
    content: newContent,
    cursorLine: buffer.cursorLine,
    cursorCol: indent.length,
    modified: true,
    lastInsertPosition: { line: buffer.cursorLine, col: indent.length },
  };
  
  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    insertModeStartCol: indent.length,
    lastInsertedText: "",
  };
  
  return { state: newState, action: "open-line-above" };
}

/**
 * Go to last insert position and enter insert (gi)
 */
export function goToInsertPosition(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  const lastPos = buffer.lastInsertPosition || { line: 0, col: 0 };
  
  // Clamp to valid position
  const line = clamp(lastPos.line, 0, Math.max(0, buffer.content.length - 1));
  const col = clamp(lastPos.col, 0, (buffer.content[line] || "").length);
  
  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "insert",
    cursorLine: line,
    cursorCol: col,
    lastInsertPosition: { line, col },
  };
  
  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    insertModeStartCol: col,
    lastInsertedText: "",
  };
  
  return { state: newState, action: "goto-insert-position" };
}

/**
 * Enter insert at column 0 (gI)
 */
export function enterInsertModeColumn0(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  
  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "insert",
    cursorCol: 0,
    lastInsertPosition: { line: buffer.cursorLine, col: 0 },
  };
  
  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    insertModeStartCol: 0,
    lastInsertedText: "",
  };
  
  return { state: newState, action: "enter-insert-column0" };
}

/**
 * Exit insert mode (Escape or Ctrl-[)
 */
export function exitInsertMode(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  
  // Move cursor left one if not at start of line
  const newCol = buffer.cursorCol > 0 ? buffer.cursorCol - 1 : 0;
  
  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
    cursorCol: newCol,
  };
  
  // Store last inserted text in register
  const lastInsertedText = state.lastInsertedText || "";
  let newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    insertModeStartCol: null,
    lastInsertRegister: lastInsertedText
      ? {
          content: lastInsertedText,
          type: "char",
          timestamp: Date.now(),
        }
      : state.lastInsertRegister,
  };
  
  // Update read-only register for last inserted text
  newState = {
    ...newState,
    readOnlyRegisters: {
      ...newState.readOnlyRegisters,
      lastInsertedText: lastInsertedText || null,
    },
  };
  
  return { state: newState, action: "exit-insert" };
}

/**
 * Insert character at cursor position
 */
export function insertCharacter(state: VimState, char: string): InsertModeResult {
  const buffer = getActiveBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  
  const newLine =
    line.substring(0, buffer.cursorCol) + char + line.substring(buffer.cursorCol);
  const newContent = [...buffer.content];
  newContent[buffer.cursorLine] = newLine;
  
  const updatedBuffer: VimBuffer = {
    ...buffer,
    content: newContent,
    cursorCol: buffer.cursorCol + char.length,
    modified: true,
  };
  
  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    lastInsertedText: (state.lastInsertedText || "") + char,
  };
  
  return { state: newState, action: "insert-char" };
}

/**
 * Handle backspace in insert mode
 */
export function insertBackspace(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  
  if (buffer.cursorCol > 0) {
    // Delete character before cursor
    const newLine =
      line.substring(0, buffer.cursorCol - 1) + line.substring(buffer.cursorCol);
    const newContent = [...buffer.content];
    newContent[buffer.cursorLine] = newLine;
    
    const updatedBuffer: VimBuffer = {
      ...buffer,
      content: newContent,
      cursorCol: buffer.cursorCol - 1,
      modified: true,
    };
    
    // Update lastInsertedText by removing last char
    const lastInserted = state.lastInsertedText || "";
    const newLastInserted = lastInserted.length > 0 
      ? lastInserted.substring(0, lastInserted.length - 1) 
      : "";
    
    const newState: VimState = {
      ...updateActiveBuffer(state, updatedBuffer),
      lastInsertedText: newLastInserted,
    };
    
    return { state: newState, action: "backspace" };
  } else if (buffer.cursorLine > 0) {
    // Join with previous line
    const prevLine = buffer.content[buffer.cursorLine - 1] || "";
    const prevLineLength = prevLine.length;
    const newLine = prevLine + line;
    
    const newContent = [...buffer.content];
    newContent[buffer.cursorLine - 1] = newLine;
    newContent.splice(buffer.cursorLine, 1);
    
    const updatedBuffer: VimBuffer = {
      ...buffer,
      content: newContent,
      cursorLine: buffer.cursorLine - 1,
      cursorCol: prevLineLength,
      modified: true,
    };
    
    const newState: VimState = {
      ...updateActiveBuffer(state, updatedBuffer),
    };
    
    return { state: newState, action: "backspace-join" };
  }
  
  return { state, action: "backspace-noop" };
}

/**
 * Handle Enter in insert mode
 */
export function insertEnter(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  
  // Split line at cursor
  const beforeCursor = line.substring(0, buffer.cursorCol);
  const afterCursor = line.substring(buffer.cursorCol);
  
  // Calculate auto-indent
  let indent = "";
  if (state.settings.autoindent) {
    const match = beforeCursor.match(/^(\s*)/);
    indent = match ? match[1] : "";
    
    // Smart indent: add extra indent after { or :
    if (state.settings.smartindent) {
      const trimmedBefore = beforeCursor.trimEnd();
      if (trimmedBefore.endsWith("{") || trimmedBefore.endsWith(":")) {
        const indentStr = state.settings.expandtab
          ? " ".repeat(state.settings.shiftwidth)
          : "\t";
        indent += indentStr;
      }
    }
  }
  
  const newContent = [...buffer.content];
  newContent[buffer.cursorLine] = beforeCursor;
  newContent.splice(buffer.cursorLine + 1, 0, indent + afterCursor);
  
  const updatedBuffer: VimBuffer = {
    ...buffer,
    content: newContent,
    cursorLine: buffer.cursorLine + 1,
    cursorCol: indent.length,
    modified: true,
    lastInsertPosition: { line: buffer.cursorLine + 1, col: indent.length },
  };
  
  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    lastInsertedText: (state.lastInsertedText || "") + "\n",
  };
  
  return { state: newState, action: "enter" };
}

/**
 * Handle Tab in insert mode
 */
export function insertTab(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  
  const tabStr = state.settings.expandtab
    ? " ".repeat(state.settings.tabstop)
    : "\t";
  
  return insertCharacter(state, tabStr);
}

/**
 * Delete word before cursor (Ctrl-w)
 */
export function insertDeleteWord(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  
  if (buffer.cursorCol === 0) {
    return { state, action: "delete-word-noop" };
  }
  
  const beforeCursor = line.substring(0, buffer.cursorCol);
  
  // Find start of word
  let wordStart = buffer.cursorCol;
  
  // Skip trailing whitespace
  while (wordStart > 0 && /\s/.test(beforeCursor[wordStart - 1])) {
    wordStart--;
  }
  
  // Skip word characters
  while (wordStart > 0 && !/\s/.test(beforeCursor[wordStart - 1])) {
    wordStart--;
  }
  
  const newLine = line.substring(0, wordStart) + line.substring(buffer.cursorCol);
  const newContent = [...buffer.content];
  newContent[buffer.cursorLine] = newLine;
  
  const updatedBuffer: VimBuffer = {
    ...buffer,
    content: newContent,
    cursorCol: wordStart,
    modified: true,
  };
  
  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
  };
  
  return { state: newState, action: "delete-word" };
}

/**
 * Delete to start of line (Ctrl-u)
 */
export function insertDeleteToLineStart(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  
  if (buffer.cursorCol === 0) {
    return { state, action: "delete-to-start-noop" };
  }
  
  const newLine = line.substring(buffer.cursorCol);
  const newContent = [...buffer.content];
  newContent[buffer.cursorLine] = newLine;
  
  const updatedBuffer: VimBuffer = {
    ...buffer,
    content: newContent,
    cursorCol: 0,
    modified: true,
  };
  
  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
  };
  
  return { state: newState, action: "delete-to-start" };
}

/**
 * Indent current line (Ctrl-t)
 */
export function insertIndent(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  
  const indentStr = state.settings.expandtab
    ? " ".repeat(state.settings.shiftwidth)
    : "\t";
  
  const newLine = indentStr + line;
  const newContent = [...buffer.content];
  newContent[buffer.cursorLine] = newLine;
  
  const updatedBuffer: VimBuffer = {
    ...buffer,
    content: newContent,
    cursorCol: buffer.cursorCol + indentStr.length,
    modified: true,
  };
  
  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
  };
  
  return { state: newState, action: "indent" };
}

/**
 * Dedent current line (Ctrl-d)
 */
export function insertDedent(state: VimState): InsertModeResult {
  const buffer = getActiveBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  
  const shiftwidth = state.settings.shiftwidth;
  let removeCount = 0;
  
  // Calculate how much indentation to remove
  if (line.startsWith("\t")) {
    removeCount = 1;
  } else {
    // Remove up to shiftwidth spaces
    for (let i = 0; i < shiftwidth && i < line.length; i++) {
      if (line[i] === " ") {
        removeCount++;
      } else {
        break;
      }
    }
  }
  
  if (removeCount === 0) {
    return { state, action: "dedent-noop" };
  }
  
  const newLine = line.substring(removeCount);
  const newContent = [...buffer.content];
  newContent[buffer.cursorLine] = newLine;
  
  const updatedBuffer: VimBuffer = {
    ...buffer,
    content: newContent,
    cursorCol: Math.max(0, buffer.cursorCol - removeCount),
    modified: true,
  };
  
  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
  };
  
  return { state: newState, action: "dedent" };
}

/**
 * Trigger completion (Ctrl-n / Ctrl-p) - shows message in simulator
 */
export function insertCompletion(state: VimState, direction: "next" | "prev"): InsertModeResult {
  const newState: VimState = {
    ...state,
    message: `Completion ${direction === "next" ? "next" : "previous"} (simulated)`,
    messageType: "info",
  };
  
  return { state: newState, action: `completion-${direction}` };
}

/**
 * Insert register contents (Ctrl-r{register})
 */
export function insertFromRegister(state: VimState, register: string): InsertModeResult {
  let content: string | null = null;
  
  // Named registers a-z
  if (/^[a-z]$/.test(register)) {
    content = state.namedRegisters[register]?.content ?? null;
  }
  // Numbered registers 0-9
  else if (/^[0-9]$/.test(register)) {
    const idx = parseInt(register, 10);
    content = state.numberedRegisters[idx]?.content ?? null;
  }
  // Unnamed register "
  else if (register === '"') {
    content = state.unnamedRegister?.content ?? null;
  }
  // Clipboard registers + and *
  else if (register === "+" || register === "*") {
    content = state.clipboardRegister?.content ?? null;
  }
  // Last insert register .
  else if (register === ".") {
    content = state.readOnlyRegisters.lastInsertedText ?? null;
  }
  // Last command register :
  else if (register === ":") {
    content = state.readOnlyRegisters.lastCommandLine ?? null;
  }
  // Filename register %
  else if (register === "%") {
    const buffer = getActiveBuffer(state);
    content = buffer.filename;
  }
  // Search register /
  else if (register === "/") {
    content = state.lastSearchPattern ?? null;
  }
  
  if (content) {
    // Insert content character by character (simplified)
    let newState = state;
    for (const char of content) {
      if (char === "\n") {
        const result = insertEnter(newState);
        newState = result.state;
      } else {
        const result = insertCharacter(newState, char);
        newState = result.state;
      }
    }
    return { state: newState, action: `insert-register-${register}` };
  }
  
  return { state, action: `insert-register-empty` };
}

/**
 * Main entry point for handling insert mode keys
 */
export function handleInsertModeKey(
  state: VimState,
  key: string,
  ctrl: boolean = false
): InsertModeResult {
  const buffer = getActiveBuffer(state);
  
  if (buffer.mode !== "insert") {
    return { state, action: "not-in-insert-mode" };
  }
  
  // Escape or Ctrl-[ exits insert mode
  if (key === "Escape" || (ctrl && key === "[")) {
    return exitInsertMode(state);
  }
  
  // Ctrl key combinations
  if (ctrl) {
    switch (key) {
      case "w":
        return insertDeleteWord(state);
      case "u":
        return insertDeleteToLineStart(state);
      case "t":
        return insertIndent(state);
      case "d":
        return insertDedent(state);
      case "n":
        return insertCompletion(state, "next");
      case "p":
        return insertCompletion(state, "prev");
      default:
        return { state, action: `ctrl-${key}-unhandled` };
    }
  }
  
  // Special keys
  switch (key) {
    case "Backspace":
      return insertBackspace(state);
    case "Enter":
      return insertEnter(state);
    case "Tab":
      return insertTab(state);
    default:
      // Regular character input
      if (key.length === 1) {
        return insertCharacter(state, key);
      }
      return { state, action: `key-unhandled-${key}` };
  }
}

/**
 * Execute insert mode entry command
 */
export function executeInsertCommand(
  state: VimState,
  command: string
): InsertModeResult {
  switch (command) {
    case "i":
      return enterInsertMode(state);
    case "a":
      return enterInsertModeAfter(state);
    case "I":
      return enterInsertModeLineStart(state);
    case "A":
      return enterInsertModeLineEnd(state);
    case "o":
      return openLineBelow(state);
    case "O":
      return openLineAbove(state);
    case "gi":
      return goToInsertPosition(state);
    case "gI":
      return enterInsertModeColumn0(state);
    default:
      return { state, action: `unknown-insert-command-${command}` };
  }
}
