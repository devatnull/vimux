import type {
  VimBuffer,
  VimState,
  VimMode,
  VisualSelection,
  CursorPosition,
  VimRegisterContent,
  BufferSnapshot,
} from "../types";
import { getActiveBuffer, type MotionResult, executeMotion, applyMotion } from "./motions";
import { extractText, deleteRange, storeInRegister, type TextRange } from "./operators";

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

export function enterVisualMode(state: VimState, mode: "char" | "line" | "block"): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;

  const vimMode: VimMode = mode === "char" ? "visual" : mode === "line" ? "visual-line" : "visual-block";

  const selection: VisualSelection = {
    start: { line: buffer.cursorLine, col: buffer.cursorCol },
    end: { line: buffer.cursorLine, col: buffer.cursorCol },
    mode,
  };

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: vimMode,
  };

  return {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? updatedBuffer : b)),
    visualSelection: selection,
  };
}

export function exitVisualMode(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
  };

  const updatedState: VimState = {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? updatedBuffer : b)),
    lastVisualSelection: state.visualSelection,
    visualSelection: null,
  };

  return updatedState;
}

export function updateVisualSelection(state: VimState, newEnd: CursorPosition): VimState {
  if (!state.visualSelection) return state;

  return {
    ...state,
    visualSelection: {
      ...state.visualSelection,
      end: newEnd,
    },
  };
}

export function visualModeExtendSelection(
  state: VimState,
  motionKey: string,
  count: number = 1,
  char?: string
): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer || !state.visualSelection) return state;

  const { state: newState, result } = executeMotion(state, motionKey, count, char);
  
  if (!result) return newState;

  const updatedBuffer = getActiveBuffer(newState);
  if (!updatedBuffer) return newState;

  return updateVisualSelection(newState, {
    line: updatedBuffer.cursorLine,
    col: updatedBuffer.cursorCol,
  });
}

export function visualSwapEnds(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer || !state.visualSelection) return state;

  const { start, end } = state.visualSelection;
  
  const updatedBuffer: VimBuffer = {
    ...buffer,
    cursorLine: start.line,
    cursorCol: start.col,
  };

  return {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? updatedBuffer : b)),
    visualSelection: {
      ...state.visualSelection,
      start: end,
      end: start,
    },
  };
}

export function visualBlockSwapCorner(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer || !state.visualSelection) return state;
  if (state.visualSelection.mode !== "block") return visualSwapEnds(state);

  const { start, end } = state.visualSelection;
  
  const updatedBuffer: VimBuffer = {
    ...buffer,
    cursorLine: buffer.cursorLine,
    cursorCol: start.col,
  };

  return {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? updatedBuffer : b)),
    visualSelection: {
      ...state.visualSelection,
      start: { line: start.line, col: end.col },
      end: { line: end.line, col: start.col },
    },
  };
}

export function reselectLastVisual(state: VimState): VimState {
  if (!state.lastVisualSelection) {
    return {
      ...state,
      message: "No previous visual selection",
      messageType: "error",
    };
  }

  const buffer = getActiveBuffer(state);
  if (!buffer) return state;

  const { start, mode } = state.lastVisualSelection;
  const vimMode: VimMode = mode === "char" ? "visual" : mode === "line" ? "visual-line" : "visual-block";

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: vimMode,
    cursorLine: state.lastVisualSelection.end.line,
    cursorCol: state.lastVisualSelection.end.col,
  };

  return {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? updatedBuffer : b)),
    visualSelection: { ...state.lastVisualSelection },
  };
}

function getVisualRange(buffer: VimBuffer, selection: VisualSelection): TextRange {
  let startLine = selection.start.line;
  let startCol = selection.start.col;
  let endLine = selection.end.line;
  let endCol = selection.end.col;

  if (startLine > endLine || (startLine === endLine && startCol > endCol)) {
    [startLine, endLine] = [endLine, startLine];
    [startCol, endCol] = [endCol, startCol];
  }

  if (selection.mode === "line") {
    return {
      startLine,
      startCol: 0,
      endLine,
      endCol: buffer.content[endLine]?.length ?? 0,
      linewise: true,
    };
  }

  if (selection.mode === "block") {
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    return {
      startLine,
      startCol: minCol,
      endLine,
      endCol: maxCol + 1,
      linewise: false,
    };
  }

  return {
    startLine,
    startCol,
    endLine,
    endCol: endCol + 1,
    linewise: false,
  };
}

export function visualDelete(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer || !state.visualSelection) return state;

  const range = getVisualRange(buffer, state.visualSelection);
  const bufferWithUndo = pushToUndoStack(buffer);

  let deletedText: string;
  let newBuffer: VimBuffer;
  let textType: "char" | "line" | "block";

  if (state.visualSelection.mode === "block") {
    const { startLine, startCol, endLine, endCol } = range;
    const lines: string[] = [];
    const newContent = [...bufferWithUndo.content];

    for (let i = startLine; i <= endLine; i++) {
      const line = newContent[i] || "";
      const extracted = line.substring(startCol, endCol);
      lines.push(extracted);
      newContent[i] = line.substring(0, startCol) + line.substring(endCol);
    }

    deletedText = lines.join("\n");
    textType = "block";
    newBuffer = {
      ...bufferWithUndo,
      content: newContent,
      cursorLine: startLine,
      cursorCol: Math.min(startCol, Math.max(0, (newContent[startLine]?.length || 1) - 1)),
      mode: "normal",
      modified: true,
    };
  } else {
    const { buffer: deletedBuffer, deletedText: text, type } = deleteRange(bufferWithUndo, range);
    deletedText = text;
    textType = type;
    newBuffer = {
      ...deletedBuffer,
      mode: "normal",
    };
  }

  let updatedState: VimState = {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? newBuffer : b)),
    lastVisualSelection: state.visualSelection,
    visualSelection: null,
    pendingOperator: null,
    pendingCount: null,
    operatorCount: null,
  };

  updatedState = storeInRegister(updatedState, deletedText, textType, state.pendingRegister, true);
  updatedState.pendingRegister = null;

  return updatedState;
}

export function visualYank(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer || !state.visualSelection) return state;

  const range = getVisualRange(buffer, state.visualSelection);

  let yankText: string;
  let textType: "char" | "line" | "block";

  if (state.visualSelection.mode === "block") {
    const { startLine, startCol, endLine, endCol } = range;
    const lines: string[] = [];

    for (let i = startLine; i <= endLine; i++) {
      const line = buffer.content[i] || "";
      lines.push(line.substring(startCol, endCol));
    }

    yankText = lines.join("\n");
    textType = "block";
  } else {
    const { text, type } = extractText(buffer, range);
    yankText = text;
    textType = type;
  }

  const startLine = Math.min(state.visualSelection.start.line, state.visualSelection.end.line);
  const startCol = Math.min(state.visualSelection.start.col, state.visualSelection.end.col);

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
    cursorLine: startLine,
    cursorCol: startCol,
  };

  let updatedState: VimState = {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? updatedBuffer : b)),
    lastVisualSelection: state.visualSelection,
    visualSelection: null,
  };

  updatedState = storeInRegister(updatedState, yankText, textType, state.pendingRegister, false);
  updatedState.pendingRegister = null;

  return updatedState;
}

export function visualChange(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer || !state.visualSelection) return state;

  const range = getVisualRange(buffer, state.visualSelection);
  const bufferWithUndo = pushToUndoStack(buffer);

  let deletedText: string;
  let newBuffer: VimBuffer;
  let textType: "char" | "line" | "block";

  if (state.visualSelection.mode === "block") {
    const { startLine, startCol, endLine, endCol } = range;
    const lines: string[] = [];
    const newContent = [...bufferWithUndo.content];

    for (let i = startLine; i <= endLine; i++) {
      const line = newContent[i] || "";
      const extracted = line.substring(startCol, endCol);
      lines.push(extracted);
      newContent[i] = line.substring(0, startCol) + line.substring(endCol);
    }

    deletedText = lines.join("\n");
    textType = "block";
    newBuffer = {
      ...bufferWithUndo,
      content: newContent,
      cursorLine: startLine,
      cursorCol: startCol,
      mode: "insert",
      modified: true,
    };
  } else if (state.visualSelection.mode === "line") {
    const { buffer: deletedBuffer, deletedText: text, type } = deleteRange(bufferWithUndo, range);
    
    const newContent = [...deletedBuffer.content];
    const insertLine = range.startLine;
    newContent.splice(insertLine, 0, "");

    deletedText = text;
    textType = type;
    newBuffer = {
      ...deletedBuffer,
      content: newContent,
      cursorLine: insertLine,
      cursorCol: 0,
      mode: "insert",
    };
  } else {
    const { buffer: deletedBuffer, deletedText: text, type } = deleteRange(bufferWithUndo, range);
    deletedText = text;
    textType = type;
    newBuffer = {
      ...deletedBuffer,
      mode: "insert",
    };
  }

  let updatedState: VimState = {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? newBuffer : b)),
    lastVisualSelection: state.visualSelection,
    visualSelection: null,
    insertModeStartCol: newBuffer.cursorCol,
  };

  updatedState = storeInRegister(updatedState, deletedText, textType, state.pendingRegister, true);
  updatedState.pendingRegister = null;

  return updatedState;
}

export function visualIndent(state: VimState, direction: ">" | "<"): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer || !state.visualSelection) return state;

  const bufferWithUndo = pushToUndoStack(buffer);
  const { startLine, endLine } = getVisualRange(bufferWithUndo, state.visualSelection);
  const shiftWidth = state.settings.shiftwidth;
  const expandTab = state.settings.expandtab;
  const indentStr = expandTab ? " ".repeat(shiftWidth) : "\t";

  const newContent = [...bufferWithUndo.content];

  for (let i = startLine; i <= endLine; i++) {
    const line = newContent[i] || "";
    if (direction === ">") {
      newContent[i] = indentStr + line;
    } else {
      if (expandTab) {
        let removeCount = 0;
        for (let j = 0; j < shiftWidth && j < line.length; j++) {
          if (line[j] === " ") {
            removeCount++;
          } else if (line[j] === "\t") {
            removeCount++;
            break;
          } else {
            break;
          }
        }
        newContent[i] = line.substring(removeCount);
      } else {
        if (line.startsWith("\t")) {
          newContent[i] = line.substring(1);
        } else {
          let removeCount = 0;
          for (let j = 0; j < shiftWidth && j < line.length; j++) {
            if (line[j] === " ") {
              removeCount++;
            } else {
              break;
            }
          }
          newContent[i] = line.substring(removeCount);
        }
      }
    }
  }

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
    mode: "normal",
    modified: true,
  };

  return {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? newBuffer : b)),
    lastVisualSelection: state.visualSelection,
    visualSelection: null,
  };
}

export function visualToggleCase(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer || !state.visualSelection) return state;

  const bufferWithUndo = pushToUndoStack(buffer);
  const range = getVisualRange(bufferWithUndo, state.visualSelection);
  const newContent = [...bufferWithUndo.content];

  const toggleChar = (c: string): string => {
    if (c >= "a" && c <= "z") return c.toUpperCase();
    if (c >= "A" && c <= "Z") return c.toLowerCase();
    return c;
  };

  if (state.visualSelection.mode === "block") {
    for (let i = range.startLine; i <= range.endLine; i++) {
      const line = newContent[i] || "";
      const before = line.substring(0, range.startCol);
      const middle = line.substring(range.startCol, range.endCol);
      const after = line.substring(range.endCol);
      newContent[i] = before + [...middle].map(toggleChar).join("") + after;
    }
  } else if (state.visualSelection.mode === "line") {
    for (let i = range.startLine; i <= range.endLine; i++) {
      newContent[i] = [...(newContent[i] || "")].map(toggleChar).join("");
    }
  } else {
    if (range.startLine === range.endLine) {
      const line = newContent[range.startLine] || "";
      const before = line.substring(0, range.startCol);
      const middle = line.substring(range.startCol, range.endCol);
      const after = line.substring(range.endCol);
      newContent[range.startLine] = before + [...middle].map(toggleChar).join("") + after;
    } else {
      const firstLine = newContent[range.startLine] || "";
      newContent[range.startLine] =
        firstLine.substring(0, range.startCol) +
        [...firstLine.substring(range.startCol)].map(toggleChar).join("");

      for (let i = range.startLine + 1; i < range.endLine; i++) {
        newContent[i] = [...(newContent[i] || "")].map(toggleChar).join("");
      }

      const lastLine = newContent[range.endLine] || "";
      newContent[range.endLine] =
        [...lastLine.substring(0, range.endCol)].map(toggleChar).join("") +
        lastLine.substring(range.endCol);
    }
  }

  const newBuffer: VimBuffer = {
    ...bufferWithUndo,
    content: newContent,
    cursorLine: range.startLine,
    cursorCol: range.startCol,
    mode: "normal",
    modified: true,
  };

  return {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? newBuffer : b)),
    lastVisualSelection: state.visualSelection,
    visualSelection: null,
  };
}

export function visualLowercase(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer || !state.visualSelection) return state;

  const bufferWithUndo = pushToUndoStack(buffer);
  const range = getVisualRange(bufferWithUndo, state.visualSelection);
  const newContent = [...bufferWithUndo.content];

  if (state.visualSelection.mode === "block") {
    for (let i = range.startLine; i <= range.endLine; i++) {
      const line = newContent[i] || "";
      const before = line.substring(0, range.startCol);
      const middle = line.substring(range.startCol, range.endCol);
      const after = line.substring(range.endCol);
      newContent[i] = before + middle.toLowerCase() + after;
    }
  } else if (state.visualSelection.mode === "line") {
    for (let i = range.startLine; i <= range.endLine; i++) {
      newContent[i] = (newContent[i] || "").toLowerCase();
    }
  } else {
    if (range.startLine === range.endLine) {
      const line = newContent[range.startLine] || "";
      const before = line.substring(0, range.startCol);
      const middle = line.substring(range.startCol, range.endCol);
      const after = line.substring(range.endCol);
      newContent[range.startLine] = before + middle.toLowerCase() + after;
    } else {
      const firstLine = newContent[range.startLine] || "";
      newContent[range.startLine] =
        firstLine.substring(0, range.startCol) +
        firstLine.substring(range.startCol).toLowerCase();

      for (let i = range.startLine + 1; i < range.endLine; i++) {
        newContent[i] = (newContent[i] || "").toLowerCase();
      }

      const lastLine = newContent[range.endLine] || "";
      newContent[range.endLine] =
        lastLine.substring(0, range.endCol).toLowerCase() +
        lastLine.substring(range.endCol);
    }
  }

  const newBuffer: VimBuffer = {
    ...bufferWithUndo,
    content: newContent,
    cursorLine: range.startLine,
    cursorCol: range.startCol,
    mode: "normal",
    modified: true,
  };

  return {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? newBuffer : b)),
    lastVisualSelection: state.visualSelection,
    visualSelection: null,
  };
}

export function visualUppercase(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer || !state.visualSelection) return state;

  const bufferWithUndo = pushToUndoStack(buffer);
  const range = getVisualRange(bufferWithUndo, state.visualSelection);
  const newContent = [...bufferWithUndo.content];

  if (state.visualSelection.mode === "block") {
    for (let i = range.startLine; i <= range.endLine; i++) {
      const line = newContent[i] || "";
      const before = line.substring(0, range.startCol);
      const middle = line.substring(range.startCol, range.endCol);
      const after = line.substring(range.endCol);
      newContent[i] = before + middle.toUpperCase() + after;
    }
  } else if (state.visualSelection.mode === "line") {
    for (let i = range.startLine; i <= range.endLine; i++) {
      newContent[i] = (newContent[i] || "").toUpperCase();
    }
  } else {
    if (range.startLine === range.endLine) {
      const line = newContent[range.startLine] || "";
      const before = line.substring(0, range.startCol);
      const middle = line.substring(range.startCol, range.endCol);
      const after = line.substring(range.endCol);
      newContent[range.startLine] = before + middle.toUpperCase() + after;
    } else {
      const firstLine = newContent[range.startLine] || "";
      newContent[range.startLine] =
        firstLine.substring(0, range.startCol) +
        firstLine.substring(range.startCol).toUpperCase();

      for (let i = range.startLine + 1; i < range.endLine; i++) {
        newContent[i] = (newContent[i] || "").toUpperCase();
      }

      const lastLine = newContent[range.endLine] || "";
      newContent[range.endLine] =
        lastLine.substring(0, range.endCol).toUpperCase() +
        lastLine.substring(range.endCol);
    }
  }

  const newBuffer: VimBuffer = {
    ...bufferWithUndo,
    content: newContent,
    cursorLine: range.startLine,
    cursorCol: range.startCol,
    mode: "normal",
    modified: true,
  };

  return {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? newBuffer : b)),
    lastVisualSelection: state.visualSelection,
    visualSelection: null,
  };
}

export function visualJoinLines(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer || !state.visualSelection) return state;

  const bufferWithUndo = pushToUndoStack(buffer);
  const range = getVisualRange(bufferWithUndo, state.visualSelection);

  if (range.startLine === range.endLine) {
    const newBuffer: VimBuffer = {
      ...bufferWithUndo,
      mode: "normal",
    };
    return {
      ...state,
      buffers: state.buffers.map((b) => (b.id === buffer.id ? newBuffer : b)),
      lastVisualSelection: state.visualSelection,
      visualSelection: null,
    };
  }

  const linesToJoin = bufferWithUndo.content.slice(range.startLine, range.endLine + 1);
  const joinedLine = linesToJoin.map((line, i) => {
    const trimmed = line.trim();
    if (i === 0) return line.trimEnd();
    return trimmed;
  }).join(" ");

  const newContent = [
    ...bufferWithUndo.content.slice(0, range.startLine),
    joinedLine,
    ...bufferWithUndo.content.slice(range.endLine + 1),
  ];

  const cursorCol = Math.max(0, (bufferWithUndo.content[range.startLine] || "").trimEnd().length);

  const newBuffer: VimBuffer = {
    ...bufferWithUndo,
    content: newContent,
    cursorLine: range.startLine,
    cursorCol,
    mode: "normal",
    modified: true,
  };

  return {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? newBuffer : b)),
    lastVisualSelection: state.visualSelection,
    visualSelection: null,
  };
}

export function handleVisualModeKey(
  state: VimState,
  key: string,
  count: number = 1,
  char?: string
): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer || !state.visualSelection) return state;

  switch (key) {
    case "Escape":
    case "<C-[>":
      return exitVisualMode(state);

    case "v":
      if (buffer.mode === "visual") {
        return exitVisualMode(state);
      }
      return enterVisualMode(exitVisualMode(state), "char");

    case "V":
      if (buffer.mode === "visual-line") {
        return exitVisualMode(state);
      }
      return enterVisualMode(exitVisualMode(state), "line");

    case "<C-v>":
      if (buffer.mode === "visual-block") {
        return exitVisualMode(state);
      }
      return enterVisualMode(exitVisualMode(state), "block");

    case "o":
      return visualSwapEnds(state);

    case "O":
      return visualBlockSwapCorner(state);

    case "d":
    case "x":
      return visualDelete(state);

    case "y":
      return visualYank(state);

    case "c":
    case "s":
      return visualChange(state);

    case ">":
      return visualIndent(state, ">");

    case "<":
      return visualIndent(state, "<");

    case "~":
      return visualToggleCase(state);

    case "u":
      return visualLowercase(state);

    case "U":
      return visualUppercase(state);

    case "J":
      return visualJoinLines(state);

    case "h":
    case "j":
    case "k":
    case "l":
    case "w":
    case "W":
    case "b":
    case "B":
    case "e":
    case "E":
    case "0":
    case "^":
    case "$":
    case "G":
    case "gg":
    case "{":
    case "}":
    case "%":
    case "f":
    case "F":
    case "t":
    case "T":
    case ";":
    case ",":
    case "n":
    case "N":
    case "*":
    case "#":
      return visualModeExtendSelection(state, key, count, char);

    default:
      return state;
  }
}

export function isVisualMode(state: VimState): boolean {
  const buffer = getActiveBuffer(state);
  if (!buffer) return false;
  return buffer.mode === "visual" || buffer.mode === "visual-line" || buffer.mode === "visual-block";
}

export function getVisualSelectionText(state: VimState): string | null {
  const buffer = getActiveBuffer(state);
  if (!buffer || !state.visualSelection) return null;

  const range = getVisualRange(buffer, state.visualSelection);
  const { text } = extractText(buffer, range);
  return text;
}
