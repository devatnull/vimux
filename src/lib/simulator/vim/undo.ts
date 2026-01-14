import type {
  VimBuffer,
  VimState,
  VimOperator,
  BufferSnapshot,
  CursorPosition,
} from "../types";
import { getActiveBuffer } from "./motions";
import { executeOperatorWithMotion, deleteCharUnderCursor, deleteCharBeforeCursor, deleteWholeLine, yankWholeLine } from "./operators";
import { executeInsertCommand, handleInsertModeKey } from "./insertMode";

export interface UndoTreeNode {
  id: number;
  snapshot: BufferSnapshot;
  timestamp: number;
  children: number[];
  parent: number | null;
  sequenceNumber: number;
}

export interface UndoTree {
  nodes: Map<number, UndoTreeNode>;
  currentNodeId: number;
  nextId: number;
  sequenceCounter: number;
}

export interface UndoResult {
  state: VimState;
  success: boolean;
  message?: string;
}

export interface RepeatableCommand {
  type: "operator" | "insert" | "simple" | "change";
  operator?: VimOperator;
  motion?: string;
  motionChar?: string;
  count?: number;
  insertCommand?: string;
  insertedText?: string;
  simpleCommand?: string;
}

export interface DotRepeatResult {
  state: VimState;
  success: boolean;
  error?: string;
}

function updateActiveBuffer(state: VimState, buffer: VimBuffer): VimState {
  return {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? buffer : b)),
  };
}

export function undo(state: VimState, count: number = 1): UndoResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state, success: false, message: "No buffer" };
  }
  
  if (buffer.undoStack.length === 0) {
    return { 
      state: { ...state, message: "Already at oldest change", messageType: "error" },
      success: false,
      message: "Already at oldest change" 
    };
  }
  
  let currentBuffer = buffer;
  let actualCount = 0;
  
  for (let i = 0; i < count && currentBuffer.undoStack.length > 0; i++) {
    const currentSnapshot: BufferSnapshot = {
      content: [...currentBuffer.content],
      cursorLine: currentBuffer.cursorLine,
      cursorCol: currentBuffer.cursorCol,
      timestamp: Date.now(),
    };
    
    const prevSnapshot = currentBuffer.undoStack[currentBuffer.undoStack.length - 1];
    
    currentBuffer = {
      ...currentBuffer,
      content: [...prevSnapshot.content],
      cursorLine: prevSnapshot.cursorLine,
      cursorCol: prevSnapshot.cursorCol,
      undoStack: currentBuffer.undoStack.slice(0, -1),
      redoStack: [...currentBuffer.redoStack, currentSnapshot],
      modified: currentBuffer.undoStack.length > 1,
    };
    actualCount++;
  }
  
  const newState = updateActiveBuffer(state, currentBuffer);
  
  return {
    state: { ...newState, message: `${actualCount} change(s) undone`, messageType: "info" },
    success: true,
    message: `${actualCount} change(s) undone`,
  };
}

export function redo(state: VimState, count: number = 1): UndoResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state, success: false, message: "No buffer" };
  }
  
  if (buffer.redoStack.length === 0) {
    return {
      state: { ...state, message: "Already at newest change", messageType: "error" },
      success: false,
      message: "Already at newest change",
    };
  }
  
  let currentBuffer = buffer;
  let actualCount = 0;
  
  for (let i = 0; i < count && currentBuffer.redoStack.length > 0; i++) {
    const currentSnapshot: BufferSnapshot = {
      content: [...currentBuffer.content],
      cursorLine: currentBuffer.cursorLine,
      cursorCol: currentBuffer.cursorCol,
      timestamp: Date.now(),
    };
    
    const nextSnapshot = currentBuffer.redoStack[currentBuffer.redoStack.length - 1];
    
    currentBuffer = {
      ...currentBuffer,
      content: [...nextSnapshot.content],
      cursorLine: nextSnapshot.cursorLine,
      cursorCol: nextSnapshot.cursorCol,
      undoStack: [...currentBuffer.undoStack, currentSnapshot],
      redoStack: currentBuffer.redoStack.slice(0, -1),
      modified: true,
    };
    actualCount++;
  }
  
  const newState = updateActiveBuffer(state, currentBuffer);
  
  return {
    state: { ...newState, message: `${actualCount} change(s) redone`, messageType: "info" },
    success: true,
    message: `${actualCount} change(s) redone`,
  };
}

export function undoOlderState(state: VimState): UndoResult {
  return undo(state, 1);
}

export function undoNewerState(state: VimState): UndoResult {
  return redo(state, 1);
}

function parseTimeString(timeStr: string): number | null {
  const match = timeStr.match(/^(\d+)(s|m|h|d)?$/);
  if (!match) return null;
  
  const value = parseInt(match[1], 10);
  const unit = match[2] || "s";
  
  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: return value * 1000;
  }
}

export function earlier(state: VimState, timeArg: string): UndoResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state, success: false, message: "No buffer" };
  }
  
  const countMatch = timeArg.match(/^(\d+)$/);
  if (countMatch) {
    const count = parseInt(countMatch[1], 10);
    return undo(state, count);
  }
  
  const timeMs = parseTimeString(timeArg);
  if (timeMs === null) {
    return {
      state: { ...state, message: `Invalid time: ${timeArg}`, messageType: "error" },
      success: false,
      message: `Invalid time: ${timeArg}`,
    };
  }
  
  const targetTime = Date.now() - timeMs;
  let currentBuffer = buffer;
  let changesMade = 0;
  
  while (currentBuffer.undoStack.length > 0) {
    const snapshot = currentBuffer.undoStack[currentBuffer.undoStack.length - 1];
    if (snapshot.timestamp < targetTime) {
      break;
    }
    
    const currentSnapshot: BufferSnapshot = {
      content: [...currentBuffer.content],
      cursorLine: currentBuffer.cursorLine,
      cursorCol: currentBuffer.cursorCol,
      timestamp: Date.now(),
    };
    
    currentBuffer = {
      ...currentBuffer,
      content: [...snapshot.content],
      cursorLine: snapshot.cursorLine,
      cursorCol: snapshot.cursorCol,
      undoStack: currentBuffer.undoStack.slice(0, -1),
      redoStack: [...currentBuffer.redoStack, currentSnapshot],
    };
    changesMade++;
  }
  
  if (changesMade === 0) {
    return {
      state: { ...state, message: "Already at oldest change", messageType: "info" },
      success: false,
      message: "Already at oldest change",
    };
  }
  
  const newState = updateActiveBuffer(state, currentBuffer);
  return {
    state: { ...newState, message: `${changesMade} change(s) undone`, messageType: "info" },
    success: true,
    message: `${changesMade} change(s) undone`,
  };
}

export function later(state: VimState, timeArg: string): UndoResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state, success: false, message: "No buffer" };
  }
  
  const countMatch = timeArg.match(/^(\d+)$/);
  if (countMatch) {
    const count = parseInt(countMatch[1], 10);
    return redo(state, count);
  }
  
  const timeMs = parseTimeString(timeArg);
  if (timeMs === null) {
    return {
      state: { ...state, message: `Invalid time: ${timeArg}`, messageType: "error" },
      success: false,
      message: `Invalid time: ${timeArg}`,
    };
  }
  
  const targetTime = Date.now() + timeMs;
  let currentBuffer = buffer;
  let changesMade = 0;
  
  while (currentBuffer.redoStack.length > 0) {
    const snapshot = currentBuffer.redoStack[currentBuffer.redoStack.length - 1];
    if (snapshot.timestamp > targetTime) {
      break;
    }
    
    const currentSnapshot: BufferSnapshot = {
      content: [...currentBuffer.content],
      cursorLine: currentBuffer.cursorLine,
      cursorCol: currentBuffer.cursorCol,
      timestamp: Date.now(),
    };
    
    currentBuffer = {
      ...currentBuffer,
      content: [...snapshot.content],
      cursorLine: snapshot.cursorLine,
      cursorCol: snapshot.cursorCol,
      undoStack: [...currentBuffer.undoStack, currentSnapshot],
      redoStack: currentBuffer.redoStack.slice(0, -1),
    };
    changesMade++;
  }
  
  if (changesMade === 0) {
    return {
      state: { ...state, message: "Already at newest change", messageType: "info" },
      success: false,
      message: "Already at newest change",
    };
  }
  
  const newState = updateActiveBuffer(state, currentBuffer);
  return {
    state: { ...newState, message: `${changesMade} change(s) redone`, messageType: "info" },
    success: true,
    message: `${changesMade} change(s) redone`,
  };
}

export function getUndoList(state: VimState): string {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return "No buffer";
  }
  
  const lines: string[] = ["number  changes  when               saved"];
  
  for (let i = 0; i < buffer.undoStack.length; i++) {
    const snapshot = buffer.undoStack[i];
    const date = new Date(snapshot.timestamp);
    const timeStr = date.toLocaleTimeString();
    lines.push(`${String(i + 1).padStart(6)}  ${String(1).padStart(7)}  ${timeStr}         `);
  }
  
  if (buffer.undoStack.length === 0) {
    lines.push("(no undo history)");
  }
  
  return lines.join("\n");
}

export function undoLineChanges(state: VimState): UndoResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state, success: false, message: "No buffer" };
  }
  
  if (buffer.undoStack.length === 0) {
    return {
      state: { ...state, message: "No changes to undo", messageType: "info" },
      success: false,
      message: "No changes to undo",
    };
  }
  
  const currentLine = buffer.cursorLine;
  let targetSnapshot: BufferSnapshot | null = null;
  let undoCount = 0;
  
  for (let i = buffer.undoStack.length - 1; i >= 0; i--) {
    const snapshot = buffer.undoStack[i];
    if (snapshot.cursorLine === currentLine) {
      targetSnapshot = snapshot;
      undoCount = buffer.undoStack.length - i;
      break;
    }
  }
  
  if (!targetSnapshot) {
    const firstSnapshot = buffer.undoStack[0];
    if (firstSnapshot && currentLine < firstSnapshot.content.length) {
      const originalLine = firstSnapshot.content[currentLine];
      const newContent = [...buffer.content];
      newContent[currentLine] = originalLine;
      
      const currentSnapshot: BufferSnapshot = {
        content: [...buffer.content],
        cursorLine: buffer.cursorLine,
        cursorCol: buffer.cursorCol,
        timestamp: Date.now(),
      };
      
      const newBuffer: VimBuffer = {
        ...buffer,
        content: newContent,
        undoStack: [...buffer.undoStack, currentSnapshot],
        redoStack: [],
        modified: true,
      };
      
      return {
        state: updateActiveBuffer(state, newBuffer),
        success: true,
        message: "Line restored",
      };
    }
    
    return {
      state: { ...state, message: "No line changes to undo", messageType: "info" },
      success: false,
      message: "No line changes to undo",
    };
  }
  
  return undo(state, undoCount);
}

export function recordOperatorMotionCommand(
  state: VimState,
  operator: VimOperator,
  motion: string,
  count: number = 1,
  motionChar?: string
): VimState {
  const command: RepeatableCommand = {
    type: "operator",
    operator,
    motion,
    motionChar,
    count,
  };
  
  return {
    ...state,
    lastCommand: JSON.stringify(command),
  };
}

export function recordChangeCommand(
  state: VimState,
  operator: VimOperator,
  motion: string,
  insertedText: string,
  count: number = 1,
  motionChar?: string
): VimState {
  const command: RepeatableCommand = {
    type: "change",
    operator,
    motion,
    motionChar,
    count,
    insertedText,
  };
  
  return {
    ...state,
    lastCommand: JSON.stringify(command),
  };
}

export function recordInsertCommand(
  state: VimState,
  insertCommand: string,
  insertedText: string
): VimState {
  const command: RepeatableCommand = {
    type: "insert",
    insertCommand,
    insertedText,
  };
  
  return {
    ...state,
    lastCommand: JSON.stringify(command),
  };
}

export function recordSimpleCommand(
  state: VimState,
  simpleCommand: string,
  count: number = 1
): VimState {
  const command: RepeatableCommand = {
    type: "simple",
    simpleCommand,
    count,
  };
  
  return {
    ...state,
    lastCommand: JSON.stringify(command),
  };
}

function parseRepeatableCommand(commandStr: string): RepeatableCommand | null {
  try {
    return JSON.parse(commandStr) as RepeatableCommand;
  } catch {
    return null;
  }
}

function repeatInsertedText(state: VimState, text: string): VimState {
  let newState = state;
  for (const char of text) {
    if (char === "\n") {
      const result = handleInsertModeKey(newState, "Enter");
      newState = result.state;
    } else {
      const result = handleInsertModeKey(newState, char);
      newState = result.state;
    }
  }
  return newState;
}

function exitInsertModeIfNeeded(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer || buffer.mode !== "insert") {
    return state;
  }
  
  const result = handleInsertModeKey(state, "Escape");
  return result.state;
}

export function executeDotRepeat(state: VimState, count?: number): DotRepeatResult {
  if (!state.lastCommand) {
    return {
      state: { ...state, message: "No previous command", messageType: "error" },
      success: false,
      error: "No previous command to repeat",
    };
  }
  
  const command = parseRepeatableCommand(state.lastCommand);
  if (!command) {
    return {
      state: { ...state, message: "Invalid command", messageType: "error" },
      success: false,
      error: "Could not parse last command",
    };
  }
  
  const repeatCount = count ?? command.count ?? 1;
  let resultState = state;
  
  switch (command.type) {
    case "operator": {
      if (!command.operator || !command.motion) {
        return { state, success: false, error: "Invalid operator command" };
      }
      
      for (let i = 0; i < repeatCount; i++) {
        const result = executeOperatorWithMotion(
          resultState,
          command.operator,
          command.motion,
          1,
          command.motionChar
        );
        resultState = result.state;
      }
      break;
    }
    
    case "change": {
      if (!command.operator || !command.motion) {
        return { state, success: false, error: "Invalid change command" };
      }
      
      for (let i = 0; i < repeatCount; i++) {
        const operatorResult = executeOperatorWithMotion(
          resultState,
          command.operator,
          command.motion,
          1,
          command.motionChar
        );
        resultState = operatorResult.state;
        
        if (command.insertedText) {
          resultState = repeatInsertedText(resultState, command.insertedText);
          resultState = exitInsertModeIfNeeded(resultState);
        }
      }
      break;
    }
    
    case "insert": {
      if (!command.insertCommand) {
        return { state, success: false, error: "Invalid insert command" };
      }
      
      for (let i = 0; i < repeatCount; i++) {
        const insertResult = executeInsertCommand(resultState, command.insertCommand);
        resultState = insertResult.state;
        
        if (command.insertedText) {
          resultState = repeatInsertedText(resultState, command.insertedText);
          resultState = exitInsertModeIfNeeded(resultState);
        }
      }
      break;
    }
    
    case "simple": {
      if (!command.simpleCommand) {
        return { state, success: false, error: "Invalid simple command" };
      }
      
      for (let i = 0; i < repeatCount; i++) {
        resultState = executeSimpleCommand(resultState, command.simpleCommand);
      }
      break;
    }
    
    default:
      return { state, success: false, error: "Unknown command type" };
  }
  
  return { state: resultState, success: true };
}

function executeSimpleCommand(state: VimState, cmd: string): VimState {
  switch (cmd) {
    case "x": {
      const result = deleteCharUnderCursor(state, 1);
      return result.state;
    }
    case "X": {
      const result = deleteCharBeforeCursor(state, 1);
      return result.state;
    }
    case "dd": {
      const result = deleteWholeLine(state, 1);
      return result.state;
    }
    case "yy": {
      const result = yankWholeLine(state, 1);
      return result.state;
    }
    case "D": {
      const result = executeOperatorWithMotion(state, "d", "$", 1);
      return result.state;
    }
    case "C": {
      const result = executeOperatorWithMotion(state, "c", "$", 1);
      return result.state;
    }
    case "Y": {
      const result = yankWholeLine(state, 1);
      return result.state;
    }
    case "s": {
      const deleteResult = deleteCharUnderCursor(state, 1);
      const insertResult = executeInsertCommand(deleteResult.state, "i");
      return insertResult.state;
    }
    case "S": {
      const result = executeOperatorWithMotion(state, "c", "cc", 1);
      return result.state;
    }
    case "p": {
      const { paste } = require("./operators");
      return paste(state, true, 1);
    }
    case "P": {
      const { paste } = require("./operators");
      return paste(state, false, 1);
    }
    case "~": {
      return toggleCaseAtCursor(state);
    }
    case "r": {
      return state;
    }
    case "J": {
      return joinLines(state);
    }
    case ">>": {
      return indentLine(state);
    }
    case "<<": {
      return dedentLine(state);
    }
    default:
      return state;
  }
}

function toggleCaseAtCursor(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;
  
  const line = buffer.content[buffer.cursorLine] || "";
  if (buffer.cursorCol >= line.length) return state;
  
  const char = line[buffer.cursorCol];
  const newChar = char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase();
  
  const newLine = line.substring(0, buffer.cursorCol) + newChar + line.substring(buffer.cursorCol + 1);
  const newContent = [...buffer.content];
  newContent[buffer.cursorLine] = newLine;
  
  const newBuffer: VimBuffer = {
    ...buffer,
    content: newContent,
    cursorCol: Math.min(buffer.cursorCol + 1, newLine.length - 1),
    modified: true,
  };
  
  return {
    ...state,
    buffers: state.buffers.map(b => b.id === buffer.id ? newBuffer : b),
  };
}

function joinLines(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;
  
  if (buffer.cursorLine >= buffer.content.length - 1) {
    return state;
  }
  
  const currentLine = buffer.content[buffer.cursorLine] || "";
  const nextLine = buffer.content[buffer.cursorLine + 1] || "";
  const trimmedNextLine = nextLine.trimStart();
  
  const separator = currentLine.endsWith(" ") || trimmedNextLine === "" ? "" : " ";
  const joinedLine = currentLine + separator + trimmedNextLine;
  
  const newContent = [...buffer.content];
  newContent[buffer.cursorLine] = joinedLine;
  newContent.splice(buffer.cursorLine + 1, 1);
  
  const newBuffer: VimBuffer = {
    ...buffer,
    content: newContent,
    cursorCol: currentLine.length,
    modified: true,
  };
  
  return {
    ...state,
    buffers: state.buffers.map(b => b.id === buffer.id ? newBuffer : b),
  };
}

function indentLine(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;
  
  const line = buffer.content[buffer.cursorLine] || "";
  const indentStr = state.settings.expandtab
    ? " ".repeat(state.settings.shiftwidth)
    : "\t";
  
  const newLine = indentStr + line;
  const newContent = [...buffer.content];
  newContent[buffer.cursorLine] = newLine;
  
  const newBuffer: VimBuffer = {
    ...buffer,
    content: newContent,
    cursorCol: buffer.cursorCol + indentStr.length,
    modified: true,
  };
  
  return {
    ...state,
    buffers: state.buffers.map(b => b.id === buffer.id ? newBuffer : b),
  };
}

function dedentLine(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;
  
  const line = buffer.content[buffer.cursorLine] || "";
  const shiftwidth = state.settings.shiftwidth;
  let removeCount = 0;
  
  if (line.startsWith("\t")) {
    removeCount = 1;
  } else {
    for (let i = 0; i < shiftwidth && i < line.length; i++) {
      if (line[i] === " ") {
        removeCount++;
      } else {
        break;
      }
    }
  }
  
  if (removeCount === 0) return state;
  
  const newLine = line.substring(removeCount);
  const newContent = [...buffer.content];
  newContent[buffer.cursorLine] = newLine;
  
  const newBuffer: VimBuffer = {
    ...buffer,
    content: newContent,
    cursorCol: Math.max(0, buffer.cursorCol - removeCount),
    modified: true,
  };
  
  return {
    ...state,
    buffers: state.buffers.map(b => b.id === buffer.id ? newBuffer : b),
  };
}

export function getLastCommandDisplay(state: VimState): string | null {
  if (!state.lastCommand) return null;
  
  const command = parseRepeatableCommand(state.lastCommand);
  if (!command) return null;
  
  switch (command.type) {
    case "operator":
      return `${command.operator}${command.count ?? ""}${command.motion}${command.motionChar ?? ""}`;
    case "change":
      return `${command.operator}${command.count ?? ""}${command.motion}${command.motionChar ?? ""}...`;
    case "insert":
      return `${command.insertCommand}...`;
    case "simple":
      return command.simpleCommand ?? "";
    default:
      return null;
  }
}
