import type {
  VimBuffer,
  VimState,
  VimOperator,
  VimRegisterContent,
  BufferSnapshot,
  CursorPosition,
  ChangelistEntry,
} from "../types";
import { type MotionResult, getActiveBuffer, executeMotion } from "./motions";

export interface OperatorResult {
  state: VimState;
  deletedText?: string;
  textType?: "char" | "line" | "block";
}

export interface TextRange {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  linewise: boolean;
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

function getTextRange(
  buffer: VimBuffer,
  motion: MotionResult
): TextRange {
  let startLine = buffer.cursorLine;
  let startCol = buffer.cursorCol;
  let endLine = motion.line;
  let endCol = motion.col;

  if (startLine > endLine || (startLine === endLine && startCol > endCol)) {
    [startLine, endLine] = [endLine, startLine];
    [startCol, endCol] = [endCol, startCol];
  }

  const linewise = motion.linewise ?? false;
  
  if (motion.inclusive && !linewise) {
    endCol = Math.min(endCol + 1, buffer.content[endLine]?.length ?? 0);
  }

  return { startLine, startCol, endLine, endCol, linewise };
}

export function extractText(
  buffer: VimBuffer,
  range: TextRange
): { text: string; type: "char" | "line" | "block" } {
  const { startLine, startCol, endLine, endCol, linewise } = range;

  if (linewise) {
    const lines = buffer.content.slice(startLine, endLine + 1);
    return { text: lines.join("\n") + "\n", type: "line" };
  }

  if (startLine === endLine) {
    const line = buffer.content[startLine] || "";
    return { text: line.substring(startCol, endCol), type: "char" };
  }

  const lines: string[] = [];
  lines.push((buffer.content[startLine] || "").substring(startCol));
  for (let i = startLine + 1; i < endLine; i++) {
    lines.push(buffer.content[i] || "");
  }
  lines.push((buffer.content[endLine] || "").substring(0, endCol));
  
  return { text: lines.join("\n"), type: "char" };
}

export function deleteRange(
  buffer: VimBuffer,
  range: TextRange
): { buffer: VimBuffer; deletedText: string; type: "char" | "line" | "block" } {
  const { startLine, startCol, endLine, endCol, linewise } = range;
  const { text, type } = extractText(buffer, range);

  let newContent: string[];
  let newCursorLine: number;
  let newCursorCol: number;

  if (linewise) {
    newContent = [
      ...buffer.content.slice(0, startLine),
      ...buffer.content.slice(endLine + 1),
    ];
    if (newContent.length === 0) {
      newContent = [""];
    }
    newCursorLine = Math.min(startLine, newContent.length - 1);
    const targetLine = newContent[newCursorLine] || "";
    newCursorCol = 0;
    for (let i = 0; i < targetLine.length; i++) {
      if (targetLine[i] !== " " && targetLine[i] !== "\t") {
        newCursorCol = i;
        break;
      }
    }
  } else if (startLine === endLine) {
    const line = buffer.content[startLine] || "";
    const newLine = line.substring(0, startCol) + line.substring(endCol);
    newContent = [...buffer.content];
    newContent[startLine] = newLine;
    newCursorLine = startLine;
    newCursorCol = Math.min(startCol, Math.max(0, newLine.length - 1));
  } else {
    const firstLine = (buffer.content[startLine] || "").substring(0, startCol);
    const lastLine = (buffer.content[endLine] || "").substring(endCol);
    const mergedLine = firstLine + lastLine;
    
    newContent = [
      ...buffer.content.slice(0, startLine),
      mergedLine,
      ...buffer.content.slice(endLine + 1),
    ];
    newCursorLine = startLine;
    newCursorCol = Math.min(startCol, Math.max(0, mergedLine.length - 1));
  }

  if (newCursorCol < 0) newCursorCol = 0;
  if (newContent[newCursorLine]?.length === 0) newCursorCol = 0;

  return {
    buffer: {
      ...buffer,
      content: newContent,
      cursorLine: newCursorLine,
      cursorCol: newCursorCol,
      modified: true,
    },
    deletedText: text,
    type,
  };
}

export function storeInRegister(
  state: VimState,
  text: string,
  type: "char" | "line" | "block",
  targetRegister: string | null = null,
  isDelete: boolean = false
): VimState {
  const registerContent: VimRegisterContent = {
    content: text,
    type,
    timestamp: Date.now(),
  };

  let updatedState = { ...state };
  
  updatedState.unnamedRegister = registerContent;

  if (targetRegister) {
    const reg = targetRegister.toLowerCase();
    const isAppend = targetRegister !== reg;
    
    if (/^[a-z]$/.test(reg)) {
      if (isAppend && updatedState.namedRegisters[reg]) {
        const existing = updatedState.namedRegisters[reg];
        updatedState.namedRegisters = {
          ...updatedState.namedRegisters,
          [reg]: {
            content: existing.content + text,
            type: existing.type,
            timestamp: Date.now(),
          },
        };
      } else {
        updatedState.namedRegisters = {
          ...updatedState.namedRegisters,
          [reg]: registerContent,
        };
      }
    } else if (reg === "+" || reg === "*") {
      if (reg === "+") {
        updatedState.clipboardRegister = registerContent;
      } else {
        updatedState.selectionRegister = registerContent;
      }
    } else if (reg === "_") {
      return updatedState;
    }
    
    return updatedState;
  }

  if (isDelete) {
    if (type === "char" && !text.includes("\n") && text.length < 10) {
      updatedState.smallDeleteRegister = registerContent;
    } else {
      const newNumbered = [registerContent, ...updatedState.numberedRegisters.slice(0, 9)];
      updatedState.numberedRegisters = newNumbered;
    }
  } else {
    if (updatedState.numberedRegisters.length > 0) {
      updatedState.numberedRegisters = [
        registerContent,
        ...updatedState.numberedRegisters.slice(1),
      ];
    }
  }

  return updatedState;
}

function addToChangelist(state: VimState, bufferId: string, position: CursorPosition): VimState {
  const entry: ChangelistEntry = { bufferId, position };
  const newChangelist = [...state.changelist, entry];
  
  if (newChangelist.length > 100) {
    newChangelist.shift();
  }
  
  return {
    ...state,
    changelist: newChangelist,
    changelistPosition: newChangelist.length - 1,
  };
}

export function operatorDelete(
  state: VimState,
  motion: MotionResult
): OperatorResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state };
  }

  const bufferWithUndo = pushToUndoStack(buffer);
  const range = getTextRange(bufferWithUndo, motion);
  const { buffer: newBuffer, deletedText, type } = deleteRange(bufferWithUndo, range);

  let updatedState: VimState = {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? newBuffer : b
    ),
    pendingOperator: null,
    pendingCount: null,
    operatorCount: null,
  };

  updatedState = storeInRegister(updatedState, deletedText, type, state.pendingRegister, true);
  updatedState = addToChangelist(updatedState, buffer.id, { line: newBuffer.cursorLine, col: newBuffer.cursorCol });
  updatedState.pendingRegister = null;

  return {
    state: updatedState,
    deletedText,
    textType: type,
  };
}

export function operatorYank(
  state: VimState,
  motion: MotionResult
): OperatorResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state };
  }

  const range = getTextRange(buffer, motion);
  const { text, type } = extractText(buffer, range);

  let updatedState: VimState = {
    ...state,
    pendingOperator: null,
    pendingCount: null,
    operatorCount: null,
  };

  updatedState = storeInRegister(updatedState, text, type, state.pendingRegister, false);
  updatedState.pendingRegister = null;

  const lineCount = motion.linewise 
    ? range.endLine - range.startLine + 1 
    : text.split("\n").length;
  
  if (lineCount > 1) {
    updatedState.message = `${lineCount} lines yanked`;
    updatedState.messageType = "info";
  }

  return {
    state: updatedState,
    deletedText: text,
    textType: type,
  };
}

export function operatorChange(
  state: VimState,
  motion: MotionResult
): OperatorResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state };
  }

  const bufferWithUndo = pushToUndoStack(buffer);
  const range = getTextRange(bufferWithUndo, motion);
  const { buffer: newBuffer, deletedText, type } = deleteRange(bufferWithUndo, range);

  const bufferInInsertMode: VimBuffer = {
    ...newBuffer,
    mode: "insert",
    lastInsertPosition: { line: newBuffer.cursorLine, col: newBuffer.cursorCol },
  };

  let updatedState: VimState = {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? bufferInInsertMode : b
    ),
    pendingOperator: null,
    pendingCount: null,
    operatorCount: null,
    insertModeStartCol: bufferInInsertMode.cursorCol,
  };

  updatedState = storeInRegister(updatedState, deletedText, type, state.pendingRegister, true);
  updatedState = addToChangelist(updatedState, buffer.id, { line: bufferInInsertMode.cursorLine, col: bufferInInsertMode.cursorCol });
  updatedState.pendingRegister = null;

  return {
    state: updatedState,
    deletedText,
    textType: type,
  };
}

export function deleteWholeLine(
  state: VimState,
  count: number = 1
): OperatorResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state };
  }

  const bufferWithUndo = pushToUndoStack(buffer);
  const startLine = bufferWithUndo.cursorLine;
  const endLine = Math.min(startLine + count - 1, bufferWithUndo.content.length - 1);

  const motion: MotionResult = {
    line: endLine,
    col: 0,
    linewise: true,
  };

  const range = getTextRange(
    { ...bufferWithUndo, cursorLine: startLine, cursorCol: 0 },
    motion
  );
  
  const { buffer: newBuffer, deletedText, type } = deleteRange(bufferWithUndo, range);

  let updatedState: VimState = {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? newBuffer : b
    ),
    pendingOperator: null,
    pendingCount: null,
    operatorCount: null,
  };

  updatedState = storeInRegister(updatedState, deletedText, type, state.pendingRegister, true);
  updatedState = addToChangelist(updatedState, buffer.id, { line: newBuffer.cursorLine, col: newBuffer.cursorCol });
  updatedState.pendingRegister = null;

  if (count > 1) {
    updatedState.message = `${count} lines deleted`;
    updatedState.messageType = "info";
  }

  return {
    state: updatedState,
    deletedText,
    textType: type,
  };
}

export function deleteToEndOfLine(
  state: VimState
): OperatorResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state };
  }

  const line = buffer.content[buffer.cursorLine] || "";
  const motion: MotionResult = {
    line: buffer.cursorLine,
    col: line.length,
    inclusive: true,
  };

  return operatorDelete(state, motion);
}

export function yankWholeLine(
  state: VimState,
  count: number = 1
): OperatorResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state };
  }

  const startLine = buffer.cursorLine;
  const endLine = Math.min(startLine + count - 1, buffer.content.length - 1);

  const motion: MotionResult = {
    line: endLine,
    col: 0,
    linewise: true,
  };

  const range = getTextRange(
    { ...buffer, cursorLine: startLine, cursorCol: 0 },
    motion
  );
  
  const { text, type } = extractText(buffer, range);

  let updatedState: VimState = {
    ...state,
    pendingOperator: null,
    pendingCount: null,
    operatorCount: null,
  };

  updatedState = storeInRegister(updatedState, text, type, state.pendingRegister, false);
  updatedState.pendingRegister = null;

  if (count >= 1) {
    updatedState.message = `${count} line${count > 1 ? "s" : ""} yanked`;
    updatedState.messageType = "info";
  }

  return {
    state: updatedState,
    deletedText: text,
    textType: type,
  };
}

export function changeWholeLine(
  state: VimState,
  count: number = 1
): OperatorResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state };
  }

  const bufferWithUndo = pushToUndoStack(buffer);
  const startLine = bufferWithUndo.cursorLine;
  const endLine = Math.min(startLine + count - 1, bufferWithUndo.content.length - 1);

  const deletedLines = bufferWithUndo.content.slice(startLine, endLine + 1);
  const deletedText = deletedLines.join("\n") + "\n";

  const newContent = [
    ...bufferWithUndo.content.slice(0, startLine),
    "",
    ...bufferWithUndo.content.slice(endLine + 1),
  ];

  const targetLine = newContent[startLine] || "";
  let cursorCol = 0;
  for (let i = 0; i < targetLine.length; i++) {
    if (targetLine[i] !== " " && targetLine[i] !== "\t") {
      cursorCol = i;
      break;
    }
  }

  const newBuffer: VimBuffer = {
    ...bufferWithUndo,
    content: newContent,
    cursorLine: startLine,
    cursorCol,
    mode: "insert",
    modified: true,
    lastInsertPosition: { line: startLine, col: cursorCol },
  };

  let updatedState: VimState = {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? newBuffer : b
    ),
    pendingOperator: null,
    pendingCount: null,
    operatorCount: null,
    insertModeStartCol: cursorCol,
  };

  updatedState = storeInRegister(updatedState, deletedText, "line", state.pendingRegister, true);
  updatedState = addToChangelist(updatedState, buffer.id, { line: startLine, col: cursorCol });
  updatedState.pendingRegister = null;

  return {
    state: updatedState,
    deletedText,
    textType: "line",
  };
}

export function changeToEndOfLine(
  state: VimState
): OperatorResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state };
  }

  const line = buffer.content[buffer.cursorLine] || "";
  const motion: MotionResult = {
    line: buffer.cursorLine,
    col: line.length,
    inclusive: true,
  };

  return operatorChange(state, motion);
}

export function substituteChar(
  state: VimState,
  count: number = 1
): OperatorResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state };
  }

  const line = buffer.content[buffer.cursorLine] || "";
  const endCol = Math.min(buffer.cursorCol + count, line.length);
  
  const motion: MotionResult = {
    line: buffer.cursorLine,
    col: endCol,
    inclusive: false,
  };

  return operatorChange(state, motion);
}

export function substituteLine(
  state: VimState,
  count: number = 1
): OperatorResult {
  return changeWholeLine(state, count);
}

export function deleteCharUnderCursor(
  state: VimState,
  count: number = 1
): OperatorResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state };
  }

  const line = buffer.content[buffer.cursorLine] || "";
  if (line.length === 0) {
    return { state };
  }

  const endCol = Math.min(buffer.cursorCol + count, line.length);
  
  const motion: MotionResult = {
    line: buffer.cursorLine,
    col: endCol,
    inclusive: false,
  };

  return operatorDelete(state, motion);
}

export function deleteCharBeforeCursor(
  state: VimState,
  count: number = 1
): OperatorResult {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state };
  }

  if (buffer.cursorCol === 0) {
    return { state };
  }

  const startCol = Math.max(0, buffer.cursorCol - count);
  
  const bufferWithUndo = pushToUndoStack(buffer);
  const range: TextRange = {
    startLine: bufferWithUndo.cursorLine,
    startCol,
    endLine: bufferWithUndo.cursorLine,
    endCol: bufferWithUndo.cursorCol,
    linewise: false,
  };

  const { buffer: newBuffer, deletedText, type } = deleteRange(
    { ...bufferWithUndo, cursorCol: startCol },
    { ...range, endCol: bufferWithUndo.cursorCol }
  );

  const finalBuffer = {
    ...newBuffer,
    cursorCol: startCol,
  };

  let updatedState: VimState = {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? finalBuffer : b
    ),
    pendingOperator: null,
    pendingCount: null,
    operatorCount: null,
  };

  updatedState = storeInRegister(updatedState, deletedText, type, state.pendingRegister, true);
  updatedState = addToChangelist(updatedState, buffer.id, { line: finalBuffer.cursorLine, col: finalBuffer.cursorCol });
  updatedState.pendingRegister = null;

  return {
    state: updatedState,
    deletedText,
    textType: type,
  };
}

export function executeOperator(
  state: VimState,
  operator: VimOperator,
  motion: MotionResult
): OperatorResult {
  switch (operator) {
    case "d":
      return operatorDelete(state, motion);
    case "y":
      return operatorYank(state, motion);
    case "c":
      return operatorChange(state, motion);
    default:
      return { state };
  }
}

export function executeOperatorWithMotion(
  state: VimState,
  operator: VimOperator,
  motionKey: string,
  count: number = 1,
  char?: string
): OperatorResult {
  const { state: newState, result } = executeMotion(state, motionKey, count, char);
  
  if (!result) {
    return { state: { ...newState, pendingOperator: null } };
  }

  return executeOperator(newState, operator, result);
}

export function getRegisterContent(
  state: VimState,
  register: string
): VimRegisterContent | null {
  if (!register || register === '"') {
    return state.unnamedRegister;
  }

  const regLower = register.toLowerCase();
  
  if (/^[a-z]$/.test(regLower)) {
    return state.namedRegisters[regLower] || null;
  }
  
  if (/^[0-9]$/.test(register)) {
    const idx = parseInt(register, 10);
    return state.numberedRegisters[idx] || null;
  }
  
  switch (register) {
    case "+":
      return state.clipboardRegister;
    case "*":
      return state.selectionRegister;
    case "-":
      return state.smallDeleteRegister;
    case ".":
      return state.lastInsertRegister;
    case ":":
      return state.lastCommandRegister;
    case "_":
      return null;
    default:
      return null;
  }
}

export function paste(
  state: VimState,
  after: boolean = true,
  count: number = 1
): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return state;
  }

  const register = state.pendingRegister || '"';
  const content = getRegisterContent(state, register);
  
  if (!content || !content.content) {
    return { ...state, pendingRegister: null };
  }

  const bufferWithUndo = pushToUndoStack(buffer);
  let newBuffer: VimBuffer;

  const textToPaste = Array(count).fill(content.content).join(
    content.type === "line" ? "" : ""
  );

  if (content.type === "line") {
    const lines = textToPaste.split("\n").filter((_, i, arr) => i < arr.length - 1 || arr[i] !== "");
    const insertLine = after ? bufferWithUndo.cursorLine + 1 : bufferWithUndo.cursorLine;
    
    const newContent = [
      ...bufferWithUndo.content.slice(0, insertLine),
      ...lines,
      ...bufferWithUndo.content.slice(insertLine),
    ];

    const targetLine = newContent[insertLine] || "";
    let cursorCol = 0;
    for (let i = 0; i < targetLine.length; i++) {
      if (targetLine[i] !== " " && targetLine[i] !== "\t") {
        cursorCol = i;
        break;
      }
    }

    newBuffer = {
      ...bufferWithUndo,
      content: newContent,
      cursorLine: insertLine,
      cursorCol,
      modified: true,
    };
  } else {
    const line = bufferWithUndo.content[bufferWithUndo.cursorLine] || "";
    const insertCol = after ? Math.min(bufferWithUndo.cursorCol + 1, line.length) : bufferWithUndo.cursorCol;
    
    if (textToPaste.includes("\n")) {
      const lines = textToPaste.split("\n");
      const beforeCursor = line.substring(0, insertCol);
      const afterCursor = line.substring(insertCol);
      
      const newLines = [
        beforeCursor + lines[0],
        ...lines.slice(1, -1),
        lines[lines.length - 1] + afterCursor,
      ];
      
      const newContent = [
        ...bufferWithUndo.content.slice(0, bufferWithUndo.cursorLine),
        ...newLines,
        ...bufferWithUndo.content.slice(bufferWithUndo.cursorLine + 1),
      ];

      const lastPastedLine = bufferWithUndo.cursorLine + lines.length - 1;
      const lastLineContent = newContent[lastPastedLine] || "";
      const cursorCol = Math.max(0, lines[lines.length - 1].length - 1);

      newBuffer = {
        ...bufferWithUndo,
        content: newContent,
        cursorLine: lastPastedLine,
        cursorCol: Math.min(cursorCol, Math.max(0, lastLineContent.length - 1)),
        modified: true,
      };
    } else {
      const newLine = line.substring(0, insertCol) + textToPaste + line.substring(insertCol);
      const newContent = [...bufferWithUndo.content];
      newContent[bufferWithUndo.cursorLine] = newLine;

      newBuffer = {
        ...bufferWithUndo,
        content: newContent,
        cursorCol: insertCol + textToPaste.length - 1,
        modified: true,
      };
    }
  }

  let updatedState: VimState = {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? newBuffer : b
    ),
    pendingRegister: null,
  };

  updatedState = addToChangelist(updatedState, buffer.id, { line: newBuffer.cursorLine, col: newBuffer.cursorCol });

  return updatedState;
}

export function pasteAfter(state: VimState, count: number = 1): VimState {
  return paste(state, true, count);
}

export function pasteBefore(state: VimState, count: number = 1): VimState {
  return paste(state, false, count);
}
