import type { VimBuffer, VimState, CursorPosition, FindMotion } from "../types";
import { WORD_SEPARATORS } from "../constants";

export interface MotionResult {
  line: number;
  col: number;
  inclusive?: boolean;
  linewise?: boolean;
}

export function getActiveBuffer(state: VimState): VimBuffer | undefined {
  return state.buffers.find((b) => b.id === state.activeBufferId);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getLineLength(buffer: VimBuffer, line: number): number {
  if (line < 0 || line >= buffer.content.length) return 0;
  return buffer.content[line].length;
}

function getMaxCol(buffer: VimBuffer, line: number, allowPastEnd: boolean = false): number {
  const lineLen = getLineLength(buffer, line);
  if (lineLen === 0) return 0;
  return allowPastEnd ? lineLen : lineLen - 1;
}

function isWordChar(char: string): boolean {
  return char !== undefined && !WORD_SEPARATORS.includes(char);
}

function isWORDChar(char: string): boolean {
  return char !== undefined && char !== " " && char !== "\t" && char !== "\n";
}

function isPunctuation(char: string): boolean {
  return WORD_SEPARATORS.includes(char) && char !== " " && char !== "\t" && char !== "\n";
}

function getCharAt(buffer: VimBuffer, line: number, col: number): string {
  if (line < 0 || line >= buffer.content.length) return "";
  const lineContent = buffer.content[line];
  if (col < 0 || col >= lineContent.length) return "";
  return lineContent[col];
}

export function motionH(buffer: VimBuffer, count: number = 1): MotionResult {
  const newCol = Math.max(0, buffer.cursorCol - count);
  return { line: buffer.cursorLine, col: newCol };
}

export function motionJ(buffer: VimBuffer, count: number = 1): MotionResult {
  const maxLine = buffer.content.length - 1;
  const newLine = Math.min(maxLine, buffer.cursorLine + count);
  const newCol = Math.min(buffer.cursorCol, getMaxCol(buffer, newLine));
  return { line: newLine, col: newCol, linewise: true };
}

export function motionK(buffer: VimBuffer, count: number = 1): MotionResult {
  const newLine = Math.max(0, buffer.cursorLine - count);
  const newCol = Math.min(buffer.cursorCol, getMaxCol(buffer, newLine));
  return { line: newLine, col: newCol, linewise: true };
}

export function motionL(buffer: VimBuffer, count: number = 1): MotionResult {
  const maxCol = getMaxCol(buffer, buffer.cursorLine);
  const newCol = Math.min(maxCol, buffer.cursorCol + count);
  return { line: buffer.cursorLine, col: newCol };
}

export function motion0(buffer: VimBuffer): MotionResult {
  return { line: buffer.cursorLine, col: 0 };
}

export function motionCaret(buffer: VimBuffer): MotionResult {
  const line = buffer.content[buffer.cursorLine] || "";
  let col = 0;
  while (col < line.length && (line[col] === " " || line[col] === "\t")) {
    col++;
  }
  if (col >= line.length && line.length > 0) {
    col = line.length - 1;
  }
  return { line: buffer.cursorLine, col };
}

export function motionDollar(buffer: VimBuffer, count: number = 1): MotionResult {
  const targetLine = Math.min(buffer.cursorLine + count - 1, buffer.content.length - 1);
  const col = getMaxCol(buffer, targetLine);
  return { line: targetLine, col, inclusive: true };
}

export function motionGG(buffer: VimBuffer, count?: number): MotionResult {
  const targetLine = count !== undefined ? clamp(count - 1, 0, buffer.content.length - 1) : 0;
  const line = buffer.content[targetLine] || "";
  let col = 0;
  while (col < line.length && (line[col] === " " || line[col] === "\t")) {
    col++;
  }
  if (col >= line.length && line.length > 0) {
    col = line.length - 1;
  }
  return { line: targetLine, col, linewise: true };
}

export function motionG(buffer: VimBuffer, count?: number): MotionResult {
  const targetLine =
    count !== undefined ? clamp(count - 1, 0, buffer.content.length - 1) : buffer.content.length - 1;
  const line = buffer.content[targetLine] || "";
  let col = 0;
  while (col < line.length && (line[col] === " " || line[col] === "\t")) {
    col++;
  }
  if (col >= line.length && line.length > 0) {
    col = line.length - 1;
  }
  return { line: targetLine, col, linewise: true };
}

export function motionW(buffer: VimBuffer, count: number = 1): MotionResult {
  let line = buffer.cursorLine;
  let col = buffer.cursorCol;
  const content = buffer.content;

  for (let i = 0; i < count; i++) {
    const currentChar = getCharAt(buffer, line, col);

    if (isWordChar(currentChar)) {
      while (col < content[line].length && isWordChar(getCharAt(buffer, line, col))) {
        col++;
      }
    } else if (isPunctuation(currentChar)) {
      while (col < content[line].length && isPunctuation(getCharAt(buffer, line, col))) {
        col++;
      }
    }

    while (line < content.length) {
      while (col < content[line].length) {
        const char = getCharAt(buffer, line, col);
        if (char !== " " && char !== "\t") {
          if (i === count - 1) {
            return { line, col };
          }
          break;
        }
        col++;
      }
      if (col < content[line].length && getCharAt(buffer, line, col) !== " ") {
        break;
      }
      line++;
      col = 0;
    }
  }

  if (line >= content.length) {
    line = content.length - 1;
    col = getMaxCol(buffer, line);
  }

  return { line, col };
}

export function motionWORD(buffer: VimBuffer, count: number = 1): MotionResult {
  let line = buffer.cursorLine;
  let col = buffer.cursorCol;
  const content = buffer.content;

  for (let i = 0; i < count; i++) {
    while (col < content[line].length && isWORDChar(getCharAt(buffer, line, col))) {
      col++;
    }

    while (line < content.length) {
      while (col < content[line].length) {
        const char = getCharAt(buffer, line, col);
        if (isWORDChar(char)) {
          if (i === count - 1) {
            return { line, col };
          }
          break;
        }
        col++;
      }
      if (col < content[line].length && isWORDChar(getCharAt(buffer, line, col))) {
        break;
      }
      line++;
      col = 0;
    }
  }

  if (line >= content.length) {
    line = content.length - 1;
    col = getMaxCol(buffer, line);
  }

  return { line, col };
}

export function motionB(buffer: VimBuffer, count: number = 1): MotionResult {
  let line = buffer.cursorLine;
  let col = buffer.cursorCol;
  const content = buffer.content;

  for (let i = 0; i < count; i++) {
    col--;

    if (col < 0) {
      if (line > 0) {
        line--;
        col = content[line].length - 1;
        if (col < 0) col = 0;
      } else {
        return { line: 0, col: 0 };
      }
    }

    while (line >= 0) {
      while (col >= 0 && (getCharAt(buffer, line, col) === " " || getCharAt(buffer, line, col) === "\t")) {
        col--;
      }

      if (col < 0) {
        if (line > 0) {
          line--;
          col = content[line].length - 1;
          continue;
        } else {
          return { line: 0, col: 0 };
        }
      }

      const currentChar = getCharAt(buffer, line, col);
      if (isWordChar(currentChar)) {
        while (col > 0 && isWordChar(getCharAt(buffer, line, col - 1))) {
          col--;
        }
      } else if (isPunctuation(currentChar)) {
        while (col > 0 && isPunctuation(getCharAt(buffer, line, col - 1))) {
          col--;
        }
      }
      break;
    }
  }

  return { line, col: Math.max(0, col) };
}

export function motionBACK(buffer: VimBuffer, count: number = 1): MotionResult {
  let line = buffer.cursorLine;
  let col = buffer.cursorCol;
  const content = buffer.content;

  for (let i = 0; i < count; i++) {
    col--;

    if (col < 0) {
      if (line > 0) {
        line--;
        col = content[line].length - 1;
        if (col < 0) col = 0;
      } else {
        return { line: 0, col: 0 };
      }
    }

    while (line >= 0) {
      while (col >= 0 && !isWORDChar(getCharAt(buffer, line, col))) {
        col--;
      }

      if (col < 0) {
        if (line > 0) {
          line--;
          col = content[line].length - 1;
          continue;
        } else {
          return { line: 0, col: 0 };
        }
      }

      while (col > 0 && isWORDChar(getCharAt(buffer, line, col - 1))) {
        col--;
      }
      break;
    }
  }

  return { line, col: Math.max(0, col) };
}

export function motionE(buffer: VimBuffer, count: number = 1): MotionResult {
  let line = buffer.cursorLine;
  let col = buffer.cursorCol;
  const content = buffer.content;

  for (let i = 0; i < count; i++) {
    col++;

    if (col >= content[line].length) {
      if (line < content.length - 1) {
        line++;
        col = 0;
      } else {
        return { line, col: getMaxCol(buffer, line), inclusive: true };
      }
    }

    while (line < content.length) {
      while (col < content[line].length && (getCharAt(buffer, line, col) === " " || getCharAt(buffer, line, col) === "\t")) {
        col++;
      }

      if (col >= content[line].length) {
        if (line < content.length - 1) {
          line++;
          col = 0;
          continue;
        } else {
          return { line, col: getMaxCol(buffer, line), inclusive: true };
        }
      }

      const currentChar = getCharAt(buffer, line, col);
      if (isWordChar(currentChar)) {
        while (col < content[line].length - 1 && isWordChar(getCharAt(buffer, line, col + 1))) {
          col++;
        }
      } else if (isPunctuation(currentChar)) {
        while (col < content[line].length - 1 && isPunctuation(getCharAt(buffer, line, col + 1))) {
          col++;
        }
      }
      break;
    }
  }

  return { line, col, inclusive: true };
}

export function motionEND(buffer: VimBuffer, count: number = 1): MotionResult {
  let line = buffer.cursorLine;
  let col = buffer.cursorCol;
  const content = buffer.content;

  for (let i = 0; i < count; i++) {
    col++;

    if (col >= content[line].length) {
      if (line < content.length - 1) {
        line++;
        col = 0;
      } else {
        return { line, col: getMaxCol(buffer, line), inclusive: true };
      }
    }

    while (line < content.length) {
      while (col < content[line].length && !isWORDChar(getCharAt(buffer, line, col))) {
        col++;
      }

      if (col >= content[line].length) {
        if (line < content.length - 1) {
          line++;
          col = 0;
          continue;
        } else {
          return { line, col: getMaxCol(buffer, line), inclusive: true };
        }
      }

      while (col < content[line].length - 1 && isWORDChar(getCharAt(buffer, line, col + 1))) {
        col++;
      }
      break;
    }
  }

  return { line, col, inclusive: true };
}

export function motionParagraphForward(buffer: VimBuffer, count: number = 1): MotionResult {
  let line = buffer.cursorLine;
  const content = buffer.content;

  for (let i = 0; i < count; i++) {
    while (line < content.length && content[line].trim() !== "") {
      line++;
    }

    while (line < content.length && content[line].trim() === "") {
      line++;
    }
  }

  if (line >= content.length) {
    line = content.length - 1;
  }

  return { line, col: 0, linewise: true };
}

export function motionParagraphBackward(buffer: VimBuffer, count: number = 1): MotionResult {
  let line = buffer.cursorLine;
  const content = buffer.content;

  for (let i = 0; i < count; i++) {
    if (line > 0) {
      line--;
    }

    while (line > 0 && content[line].trim() === "") {
      line--;
    }

    while (line > 0 && content[line - 1].trim() !== "") {
      line--;
    }
  }

  return { line, col: 0, linewise: true };
}

export function motionF(
  buffer: VimBuffer,
  char: string,
  count: number = 1
): MotionResult | null {
  const line = buffer.content[buffer.cursorLine] || "";
  let col = buffer.cursorCol;
  let found = 0;

  for (let i = col + 1; i < line.length; i++) {
    if (line[i] === char) {
      found++;
      if (found === count) {
        return { line: buffer.cursorLine, col: i, inclusive: true };
      }
    }
  }

  return null;
}

export function motionFBackward(
  buffer: VimBuffer,
  char: string,
  count: number = 1
): MotionResult | null {
  const line = buffer.content[buffer.cursorLine] || "";
  let col = buffer.cursorCol;
  let found = 0;

  for (let i = col - 1; i >= 0; i--) {
    if (line[i] === char) {
      found++;
      if (found === count) {
        return { line: buffer.cursorLine, col: i };
      }
    }
  }

  return null;
}

export function motionT(
  buffer: VimBuffer,
  char: string,
  count: number = 1
): MotionResult | null {
  const result = motionF(buffer, char, count);
  if (result && result.col > buffer.cursorCol) {
    return { ...result, col: result.col - 1, inclusive: true };
  }
  return null;
}

export function motionTBackward(
  buffer: VimBuffer,
  char: string,
  count: number = 1
): MotionResult | null {
  const result = motionFBackward(buffer, char, count);
  if (result && result.col < buffer.cursorCol) {
    return { ...result, col: result.col + 1 };
  }
  return null;
}

export function motionRepeatFind(
  state: VimState,
  buffer: VimBuffer,
  count: number = 1
): MotionResult | null {
  if (!state.lastFindMotion) return null;

  const { type, char } = state.lastFindMotion;
  switch (type) {
    case "f":
      return motionF(buffer, char, count);
    case "F":
      return motionFBackward(buffer, char, count);
    case "t":
      return motionT(buffer, char, count);
    case "T":
      return motionTBackward(buffer, char, count);
    default:
      return null;
  }
}

export function motionRepeatFindReverse(
  state: VimState,
  buffer: VimBuffer,
  count: number = 1
): MotionResult | null {
  if (!state.lastFindMotion) return null;

  const { type, char } = state.lastFindMotion;
  switch (type) {
    case "f":
      return motionFBackward(buffer, char, count);
    case "F":
      return motionF(buffer, char, count);
    case "t":
      return motionTBackward(buffer, char, count);
    case "T":
      return motionT(buffer, char, count);
    default:
      return null;
  }
}

export function applyMotion(
  buffer: VimBuffer,
  motion: MotionResult
): VimBuffer {
  return {
    ...buffer,
    cursorLine: motion.line,
    cursorCol: motion.col,
  };
}

export function executeMotion(
  state: VimState,
  motionKey: string,
  count: number = 1,
  char?: string
): { state: VimState; result: MotionResult | null } {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state, result: null };
  }

  let result: MotionResult | null = null;
  let updatedState = { ...state };

  switch (motionKey) {
    case "h":
      result = motionH(buffer, count);
      break;
    case "j":
      result = motionJ(buffer, count);
      break;
    case "k":
      result = motionK(buffer, count);
      break;
    case "l":
      result = motionL(buffer, count);
      break;
    case "0":
      result = motion0(buffer);
      break;
    case "^":
      result = motionCaret(buffer);
      break;
    case "$":
      result = motionDollar(buffer, count);
      break;
    case "gg":
      result = motionGG(buffer, count > 1 ? count : undefined);
      break;
    case "G":
      result = motionG(buffer, count > 1 ? count : undefined);
      break;
    case "w":
      result = motionW(buffer, count);
      break;
    case "W":
      result = motionWORD(buffer, count);
      break;
    case "b":
      result = motionB(buffer, count);
      break;
    case "B":
      result = motionBACK(buffer, count);
      break;
    case "e":
      result = motionE(buffer, count);
      break;
    case "E":
      result = motionEND(buffer, count);
      break;
    case "{":
      result = motionParagraphBackward(buffer, count);
      break;
    case "}":
      result = motionParagraphForward(buffer, count);
      break;
    case "f":
      if (char) {
        result = motionF(buffer, char, count);
        if (result) {
          updatedState.lastFindMotion = { type: "f", char };
        }
      }
      break;
    case "F":
      if (char) {
        result = motionFBackward(buffer, char, count);
        if (result) {
          updatedState.lastFindMotion = { type: "F", char };
        }
      }
      break;
    case "t":
      if (char) {
        result = motionT(buffer, char, count);
        if (result) {
          updatedState.lastFindMotion = { type: "t", char };
        }
      }
      break;
    case "T":
      if (char) {
        result = motionTBackward(buffer, char, count);
        if (result) {
          updatedState.lastFindMotion = { type: "T", char };
        }
      }
      break;
    case ";":
      result = motionRepeatFind(state, buffer, count);
      break;
    case ",":
      result = motionRepeatFindReverse(state, buffer, count);
      break;
  }

  if (result) {
    const updatedBuffer = applyMotion(buffer, result);
    updatedState = {
      ...updatedState,
      buffers: updatedState.buffers.map((b) =>
        b.id === buffer.id ? updatedBuffer : b
      ),
    };
  }

  return { state: updatedState, result };
}
