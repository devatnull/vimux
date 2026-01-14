import type { VimState, VimRegisterContent } from "../types";
import { getActiveBuffer } from "./motions";
import { getRegisterContent as getRegisterContentBase } from "./operators";

export function getRegisterContentExtended(
  state: VimState,
  register: string
): VimRegisterContent | null {
  const baseResult = getRegisterContentBase(state, register);
  if (baseResult) return baseResult;

  switch (register) {
    case "%": {
      const buffer = getActiveBuffer(state);
      if (buffer) {
        return {
          content: buffer.filename,
          type: "char",
          timestamp: Date.now(),
        };
      }
      return null;
    }
    case "#": {
      if (state.readOnlyRegisters.alternateFilename) {
        return {
          content: state.readOnlyRegisters.alternateFilename,
          type: "char",
          timestamp: Date.now(),
        };
      }
      return null;
    }
    case "/":
      if (state.lastSearchPattern) {
        return {
          content: state.lastSearchPattern,
          type: "char",
          timestamp: Date.now(),
        };
      }
      return null;
    case "=":
      if (state.expressionRegister) {
        return {
          content: state.expressionRegister,
          type: "char",
          timestamp: Date.now(),
        };
      }
      return null;
    default:
      return null;
  }
}

export function setRegisterContent(
  state: VimState,
  register: string,
  content: string,
  type: "char" | "line" | "block"
): VimState {
  const registerContent: VimRegisterContent = {
    content,
    type,
    timestamp: Date.now(),
  };

  const updatedState = { ...state };

  if (!register || register === '"') {
    updatedState.unnamedRegister = registerContent;
    return updatedState;
  }

  const regLower = register.toLowerCase();
  const isAppend = register !== regLower && /^[A-Z]$/.test(register);

  if (/^[a-z]$/.test(regLower)) {
    if (isAppend && updatedState.namedRegisters[regLower]) {
      const existing = updatedState.namedRegisters[regLower];
      updatedState.namedRegisters = {
        ...updatedState.namedRegisters,
        [regLower]: {
          content: existing.content + content,
          type: existing.type,
          timestamp: Date.now(),
        },
      };
    } else {
      updatedState.namedRegisters = {
        ...updatedState.namedRegisters,
        [regLower]: registerContent,
      };
    }
    updatedState.unnamedRegister = registerContent;
    return updatedState;
  }

  if (/^[0-9]$/.test(register)) {
    return updatedState;
  }

  switch (register) {
    case "+":
      updatedState.clipboardRegister = registerContent;
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(content).catch(() => {});
      }
      break;
    case "*":
      updatedState.selectionRegister = registerContent;
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(content).catch(() => {});
      }
      break;
    case "_":
      break;
    default:
      updatedState.unnamedRegister = registerContent;
  }

  return updatedState;
}

export function rotateNumberedRegisters(
  state: VimState,
  newContent: VimRegisterContent
): VimState {
  const newNumbered = [newContent, ...state.numberedRegisters.slice(0, 9)];
  return {
    ...state,
    numberedRegisters: newNumbered,
  };
}

export function getAllRegisters(state: VimState): Array<{
  name: string;
  content: VimRegisterContent | null;
  description: string;
}> {
  const registers: Array<{
    name: string;
    content: VimRegisterContent | null;
    description: string;
  }> = [];

  registers.push({
    name: '"',
    content: state.unnamedRegister,
    description: "unnamed register",
  });

  for (let i = 0; i <= 9; i++) {
    registers.push({
      name: String(i),
      content: state.numberedRegisters[i] || null,
      description:
        i === 0 ? "last yank" : `numbered register ${i} (delete history)`,
    });
  }

  registers.push({
    name: "-",
    content: state.smallDeleteRegister,
    description: "small delete register",
  });

  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(97 + i);
    registers.push({
      name: letter,
      content: state.namedRegisters[letter] || null,
      description: `named register ${letter}`,
    });
  }

  registers.push({
    name: "+",
    content: state.clipboardRegister,
    description: "system clipboard",
  });

  registers.push({
    name: "*",
    content: state.selectionRegister,
    description: "selection clipboard",
  });

  const buffer = getActiveBuffer(state);
  registers.push({
    name: "%",
    content: buffer
      ? { content: buffer.filename, type: "char", timestamp: Date.now() }
      : null,
    description: "current filename",
  });

  registers.push({
    name: "#",
    content: state.readOnlyRegisters.alternateFilename
      ? {
          content: state.readOnlyRegisters.alternateFilename,
          type: "char",
          timestamp: Date.now(),
        }
      : null,
    description: "alternate filename",
  });

  registers.push({
    name: ".",
    content: state.lastInsertRegister,
    description: "last inserted text",
  });

  registers.push({
    name: ":",
    content: state.lastCommandRegister,
    description: "last command",
  });

  registers.push({
    name: "/",
    content: state.lastSearchPattern
      ? {
          content: state.lastSearchPattern,
          type: "char",
          timestamp: Date.now(),
        }
      : null,
    description: "last search pattern",
  });

  registers.push({
    name: "=",
    content: state.expressionRegister
      ? {
          content: state.expressionRegister,
          type: "char",
          timestamp: Date.now(),
        }
      : null,
    description: "expression register",
  });

  registers.push({
    name: "_",
    content: null,
    description: "black hole register",
  });

  return registers;
}

export function formatRegistersDisplay(state: VimState): string {
  const registers = getAllRegisters(state);
  const lines: string[] = ["--- Registers ---"];

  for (const reg of registers) {
    if (reg.content && reg.content.content) {
      const preview =
        reg.content.content.length > 40
          ? reg.content.content.substring(0, 40) + "..."
          : reg.content.content;
      const displayPreview = preview.replace(/\n/g, "^J");
      lines.push(`"${reg.name}   ${displayPreview}`);
    }
  }

  return lines.join("\n");
}

export async function readFromClipboard(): Promise<string | null> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  }
  return null;
}

export async function writeToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function syncClipboardToRegister(
  state: VimState,
  clipboardContent: string,
  register: "+" | "*" = "+"
): VimState {
  const registerContent: VimRegisterContent = {
    content: clipboardContent,
    type: clipboardContent.endsWith("\n") ? "line" : "char",
    timestamp: Date.now(),
  };

  if (register === "+") {
    return { ...state, clipboardRegister: registerContent };
  }
  return { ...state, selectionRegister: registerContent };
}

export function updateLastInsertRegister(
  state: VimState,
  insertedText: string
): VimState {
  return {
    ...state,
    lastInsertRegister: {
      content: insertedText,
      type: "char",
      timestamp: Date.now(),
    },
    readOnlyRegisters: {
      ...state.readOnlyRegisters,
      lastInsertedText: insertedText,
    },
  };
}

export function updateLastCommandRegister(
  state: VimState,
  command: string
): VimState {
  return {
    ...state,
    lastCommandRegister: {
      content: command,
      type: "char",
      timestamp: Date.now(),
    },
    readOnlyRegisters: {
      ...state.readOnlyRegisters,
      lastCommandLine: command,
    },
  };
}

export function updateSearchRegister(
  state: VimState,
  pattern: string
): VimState {
  return {
    ...state,
    searchRegister: pattern,
    lastSearchPattern: pattern,
  };
}

export function getWordUnderCursor(state: VimState): string | null {
  const buffer = getActiveBuffer(state);
  if (!buffer) return null;

  const line = buffer.content[buffer.cursorLine] || "";
  const col = buffer.cursorCol;

  if (col >= line.length) return null;

  let start = col;
  let end = col;

  while (start > 0 && /\w/.test(line[start - 1])) {
    start--;
  }

  while (end < line.length && /\w/.test(line[end])) {
    end++;
  }

  if (start === end) return null;

  return line.substring(start, end);
}

export function getWORDUnderCursor(state: VimState): string | null {
  const buffer = getActiveBuffer(state);
  if (!buffer) return null;

  const line = buffer.content[buffer.cursorLine] || "";
  const col = buffer.cursorCol;

  if (col >= line.length) return null;

  let start = col;
  let end = col;

  while (start > 0 && !/\s/.test(line[start - 1])) {
    start--;
  }

  while (end < line.length && !/\s/.test(line[end])) {
    end++;
  }

  if (start === end) return null;

  return line.substring(start, end);
}
