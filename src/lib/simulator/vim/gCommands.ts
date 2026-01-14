import type { VimBuffer, VimState, CursorPosition } from "../types";
import { getActiveBuffer, MotionResult, motionGG, motionGD } from "./motions";
import { navigateChangelistBackward, navigateChangelistForward } from "./marks";

export interface GCommandResult {
  state: VimState;
  message?: string;
}

function updateActiveBuffer(state: VimState, updater: (buffer: VimBuffer) => Partial<VimBuffer>): VimState {
  return {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === state.activeBufferId ? { ...b, ...updater(b) } : b
    ),
  };
}

function getBuffer(state: VimState): VimBuffer {
  const buffer = getActiveBuffer(state);
  if (!buffer) throw new Error("No active buffer");
  return buffer;
}

function isWordChar(char: string): boolean {
  return /[a-zA-Z0-9_]/.test(char);
}

function getWordUnderCursor(buffer: VimBuffer): string | null {
  const line = buffer.content[buffer.cursorLine] || "";
  const col = buffer.cursorCol;
  
  let wordStart = col;
  let wordEnd = col;
  
  while (wordStart > 0 && isWordChar(line[wordStart - 1])) wordStart--;
  while (wordEnd < line.length && isWordChar(line[wordEnd])) wordEnd++;
  
  if (wordStart === wordEnd) return null;
  return line.substring(wordStart, wordEnd);
}

export function gotoFirstLine(state: VimState, count?: number): GCommandResult {
  const buffer = getBuffer(state);
  const result = motionGG(buffer, count);
  
  return {
    state: updateActiveBuffer(state, () => ({
      cursorLine: result.line,
      cursorCol: result.col,
    })),
  };
}

export function gotoLocalDefinition(state: VimState): GCommandResult {
  const buffer = getBuffer(state);
  const result = motionGD(buffer);
  
  if (!result) {
    return {
      state: { ...state, message: "E348: No definition found", messageType: "error" },
    };
  }
  
  return {
    state: updateActiveBuffer(state, () => ({
      cursorLine: result.line,
      cursorCol: result.col,
    })),
  };
}

export function gotoGlobalDefinition(state: VimState): GCommandResult {
  const buffer = getBuffer(state);
  const word = getWordUnderCursor(buffer);
  
  if (!word) {
    return {
      state: { ...state, message: "E348: No word under cursor", messageType: "error" },
    };
  }
  
  for (let i = 0; i < buffer.content.length; i++) {
    const line = buffer.content[i];
    const idx = line.indexOf(word);
    if (idx !== -1) {
      const beforeOk = idx === 0 || !isWordChar(line[idx - 1]);
      const afterOk = idx + word.length >= line.length || !isWordChar(line[idx + word.length]);
      if (beforeOk && afterOk) {
        return {
          state: updateActiveBuffer(state, () => ({
            cursorLine: i,
            cursorCol: idx,
          })),
        };
      }
    }
  }
  
  return {
    state: { ...state, message: "E348: No global definition found", messageType: "error" },
  };
}

export function gotoFile(state: VimState): GCommandResult {
  const buffer = getBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  
  let start = buffer.cursorCol;
  let end = buffer.cursorCol;
  
  while (start > 0 && /[a-zA-Z0-9_./\-]/.test(line[start - 1])) start--;
  while (end < line.length && /[a-zA-Z0-9_./\-]/.test(line[end])) end++;
  
  const filename = line.substring(start, end);
  
  if (!filename) {
    return {
      state: { ...state, message: "E446: No file name under cursor", messageType: "error" },
    };
  }
  
  return {
    state: { ...state, message: `Would open file: ${filename}`, messageType: "info" },
  };
}

export function gotoFileWithLine(state: VimState): GCommandResult {
  const buffer = getBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  
  let start = buffer.cursorCol;
  let end = buffer.cursorCol;
  
  while (start > 0 && /[a-zA-Z0-9_./\-:]/.test(line[start - 1])) start--;
  while (end < line.length && /[a-zA-Z0-9_./\-:]/.test(line[end])) end++;
  
  const fileWithLine = line.substring(start, end);
  const match = fileWithLine.match(/^(.+):(\d+)$/);
  
  if (match) {
    return {
      state: { ...state, message: `Would open file: ${match[1]} at line ${match[2]}`, messageType: "info" },
    };
  }
  
  return gotoFile(state);
}

export function formatText(state: VimState, startLine: number, endLine: number, textwidth: number = 80): GCommandResult {
  const buffer = getBuffer(state);
  const linesToFormat = buffer.content.slice(startLine, endLine + 1);
  const text = linesToFormat.join(" ").replace(/\s+/g, " ").trim();
  
  const formattedLines: string[] = [];
  let currentLine = "";
  
  for (const word of text.split(" ")) {
    if (currentLine.length === 0) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= textwidth) {
      currentLine += " " + word;
    } else {
      formattedLines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    formattedLines.push(currentLine);
  }
  
  const newContent = [
    ...buffer.content.slice(0, startLine),
    ...formattedLines,
    ...buffer.content.slice(endLine + 1),
  ];
  
  const endCol = formattedLines[formattedLines.length - 1]?.length - 1 || 0;
  
  return {
    state: updateActiveBuffer(state, () => ({
      content: newContent,
      cursorLine: startLine + formattedLines.length - 1,
      cursorCol: Math.max(0, endCol),
      modified: true,
    })),
  };
}

export function formatTextKeepCursor(state: VimState, startLine: number, endLine: number, textwidth: number = 80): GCommandResult {
  const buffer = getBuffer(state);
  const originalLine = buffer.cursorLine;
  const originalCol = buffer.cursorCol;
  
  const result = formatText(state, startLine, endLine, textwidth);
  
  return {
    state: updateActiveBuffer(result.state, (b) => ({
      cursorLine: Math.min(originalLine, b.content.length - 1),
      cursorCol: Math.min(originalCol, (b.content[originalLine] || "").length - 1 || 0),
    })),
  };
}

export function uppercaseMotion(state: VimState, startLine: number, startCol: number, endLine: number, endCol: number): GCommandResult {
  const buffer = getBuffer(state);
  const newContent = [...buffer.content];
  
  if (startLine === endLine) {
    const line = newContent[startLine];
    newContent[startLine] =
      line.substring(0, startCol) +
      line.substring(startCol, endCol + 1).toUpperCase() +
      line.substring(endCol + 1);
  } else {
    newContent[startLine] =
      newContent[startLine].substring(0, startCol) +
      newContent[startLine].substring(startCol).toUpperCase();
    
    for (let i = startLine + 1; i < endLine; i++) {
      newContent[i] = newContent[i].toUpperCase();
    }
    
    newContent[endLine] =
      newContent[endLine].substring(0, endCol + 1).toUpperCase() +
      newContent[endLine].substring(endCol + 1);
  }
  
  return {
    state: updateActiveBuffer(state, () => ({
      content: newContent,
      modified: true,
    })),
  };
}

export function lowercaseMotion(state: VimState, startLine: number, startCol: number, endLine: number, endCol: number): GCommandResult {
  const buffer = getBuffer(state);
  const newContent = [...buffer.content];
  
  if (startLine === endLine) {
    const line = newContent[startLine];
    newContent[startLine] =
      line.substring(0, startCol) +
      line.substring(startCol, endCol + 1).toLowerCase() +
      line.substring(endCol + 1);
  } else {
    newContent[startLine] =
      newContent[startLine].substring(0, startCol) +
      newContent[startLine].substring(startCol).toLowerCase();
    
    for (let i = startLine + 1; i < endLine; i++) {
      newContent[i] = newContent[i].toLowerCase();
    }
    
    newContent[endLine] =
      newContent[endLine].substring(0, endCol + 1).toLowerCase() +
      newContent[endLine].substring(endCol + 1);
  }
  
  return {
    state: updateActiveBuffer(state, () => ({
      content: newContent,
      modified: true,
    })),
  };
}

export function toggleCaseMotion(state: VimState, startLine: number, startCol: number, endLine: number, endCol: number): GCommandResult {
  const buffer = getBuffer(state);
  const newContent = [...buffer.content];
  
  function toggleCase(s: string): string {
    return s.split("").map(c => 
      c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()
    ).join("");
  }
  
  if (startLine === endLine) {
    const line = newContent[startLine];
    newContent[startLine] =
      line.substring(0, startCol) +
      toggleCase(line.substring(startCol, endCol + 1)) +
      line.substring(endCol + 1);
  } else {
    newContent[startLine] =
      newContent[startLine].substring(0, startCol) +
      toggleCase(newContent[startLine].substring(startCol));
    
    for (let i = startLine + 1; i < endLine; i++) {
      newContent[i] = toggleCase(newContent[i]);
    }
    
    newContent[endLine] =
      toggleCase(newContent[endLine].substring(0, endCol + 1)) +
      newContent[endLine].substring(endCol + 1);
  }
  
  return {
    state: updateActiveBuffer(state, () => ({
      content: newContent,
      modified: true,
    })),
  };
}

export function gvReselectLastVisual(state: VimState): GCommandResult {
  if (!state.lastVisualSelection) {
    return {
      state: { ...state, message: "E28: No previous visual selection", messageType: "error" },
    };
  }
  
  const { start, end, mode } = state.lastVisualSelection;
  const vimMode = mode === "char" ? "visual" : mode === "line" ? "visual-line" : "visual-block";
  
  return {
    state: {
      ...updateActiveBuffer(state, () => ({
        cursorLine: end.line,
        cursorCol: end.col,
        mode: vimMode,
      })),
      visualSelection: { start, end, mode },
    },
  };
}

export function gotoLastInsertPosition(state: VimState): GCommandResult {
  const buffer = getBuffer(state);
  
  if (!buffer.lastInsertPosition) {
    return {
      state: { ...state, message: "No previous insert position", messageType: "error" },
    };
  }
  
  return {
    state: updateActiveBuffer(state, () => ({
      cursorLine: buffer.lastInsertPosition!.line,
      cursorCol: buffer.lastInsertPosition!.col,
      mode: "insert",
    })),
  };
}

export function insertAtColumn0(state: VimState): GCommandResult {
  return {
    state: updateActiveBuffer(state, () => ({
      cursorCol: 0,
      mode: "insert",
    })),
  };
}

export function joinLinesNoSpace(state: VimState, count: number = 1): GCommandResult {
  const buffer = getBuffer(state);
  const newContent = [...buffer.content];
  const startLine = buffer.cursorLine;
  
  let currentLine = startLine;
  for (let i = 0; i < count && currentLine < newContent.length - 1; i++) {
    const thisLine = newContent[currentLine];
    const nextLine = newContent[currentLine + 1];
    newContent[currentLine] = thisLine + nextLine;
    newContent.splice(currentLine + 1, 1);
  }
  
  return {
    state: updateActiveBuffer(state, () => ({
      content: newContent,
      cursorCol: buffer.content[startLine].length,
      modified: true,
    })),
  };
}

export function gotoOlderChangePosition(state: VimState): GCommandResult {
  return {
    state: navigateChangelistBackward(state),
  };
}

export function gotoNewerChangePosition(state: VimState): GCommandResult {
  return {
    state: navigateChangelistForward(state),
  };
}

export function showAsciiValue(state: VimState): GCommandResult {
  const buffer = getBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  const char = line[buffer.cursorCol];
  
  if (!char) {
    return {
      state: { ...state, message: "NUL", messageType: "info" },
    };
  }
  
  const code = char.charCodeAt(0);
  const decimal = code;
  const hex = code.toString(16).padStart(2, "0");
  const octal = code.toString(8).padStart(3, "0");
  
  let display = char;
  if (code < 32) {
    display = "^" + String.fromCharCode(64 + code);
  } else if (code === 32) {
    display = "<Space>";
  }
  
  return {
    state: { ...state, message: `<${display}>  ${decimal},  Hex ${hex},  Oct ${octal}`, messageType: "info" },
  };
}

export function showUtf8Bytes(state: VimState): GCommandResult {
  const buffer = getBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  const char = line[buffer.cursorCol];
  
  if (!char) {
    return {
      state: { ...state, message: "NUL", messageType: "info" },
    };
  }
  
  const encoder = new TextEncoder();
  const bytes = encoder.encode(char);
  const hexBytes = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(" ");
  
  return {
    state: { ...state, message: `${char}  ${hexBytes}`, messageType: "info" },
  };
}

export type GCommand = 
  | "g" | "gd" | "gD" | "gf" | "gF" 
  | "gq" | "gw" | "gU" | "gu" | "g~" 
  | "gv" | "gi" | "gI" | "gJ" | "g;" | "g," 
  | "ga" | "g8";

export function handleGCommand(state: VimState, command: GCommand, count?: number): GCommandResult {
  switch (command) {
    case "g":
      return gotoFirstLine(state, count);
    case "gd":
      return gotoLocalDefinition(state);
    case "gD":
      return gotoGlobalDefinition(state);
    case "gf":
      return gotoFile(state);
    case "gF":
      return gotoFileWithLine(state);
    case "gv":
      return gvReselectLastVisual(state);
    case "gi":
      return gotoLastInsertPosition(state);
    case "gI":
      return insertAtColumn0(state);
    case "gJ":
      return joinLinesNoSpace(state, count || 1);
    case "g;":
      return gotoOlderChangePosition(state);
    case "g,":
      return gotoNewerChangePosition(state);
    case "ga":
      return showAsciiValue(state);
    case "g8":
      return showUtf8Bytes(state);
    default:
      return { state: { ...state, message: `g${command} not implemented`, messageType: "info" } };
  }
}

export function handleGOperator(
  state: VimState, 
  operator: "gU" | "gu" | "g~" | "gq" | "gw",
  startLine: number, 
  startCol: number, 
  endLine: number, 
  endCol: number
): GCommandResult {
  switch (operator) {
    case "gU":
      return uppercaseMotion(state, startLine, startCol, endLine, endCol);
    case "gu":
      return lowercaseMotion(state, startLine, startCol, endLine, endCol);
    case "g~":
      return toggleCaseMotion(state, startLine, startCol, endLine, endCol);
    case "gq":
      return formatText(state, startLine, endLine);
    case "gw":
      return formatTextKeepCursor(state, startLine, endLine);
    default:
      return { state };
  }
}
