import type { VimBuffer, VimState, CursorPosition, FindMotion, JumplistEntry } from "../types";
import { WORD_SEPARATORS, BRACKET_PAIRS, OPENING_BRACKETS, CLOSING_BRACKETS } from "../constants";

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

export function motionPercent(buffer: VimBuffer): MotionResult | null {
  const line = buffer.content[buffer.cursorLine] || "";
  const currentChar = line[buffer.cursorCol];
  
  const allBrackets = [...OPENING_BRACKETS, ...CLOSING_BRACKETS];
  let bracketCol = buffer.cursorCol;
  
  if (!allBrackets.includes(currentChar)) {
    bracketCol = -1;
    for (let i = buffer.cursorCol; i < line.length; i++) {
      if (allBrackets.includes(line[i])) {
        bracketCol = i;
        break;
      }
    }
    if (bracketCol === -1) return null;
  }
  
  const bracket = line[bracketCol];
  const matchingBracket = BRACKET_PAIRS[bracket];
  const isOpening = OPENING_BRACKETS.includes(bracket);
  
  let depth = 1;
  let searchLine = buffer.cursorLine;
  let searchCol = bracketCol;
  
  if (isOpening) {
    searchCol++;
    while (searchLine < buffer.content.length && depth > 0) {
      const searchContent = buffer.content[searchLine];
      while (searchCol < searchContent.length && depth > 0) {
        if (searchContent[searchCol] === bracket) depth++;
        else if (searchContent[searchCol] === matchingBracket) depth--;
        if (depth > 0) searchCol++;
      }
      if (depth > 0) {
        searchLine++;
        searchCol = 0;
      }
    }
  } else {
    searchCol--;
    while (searchLine >= 0 && depth > 0) {
      const searchContent = buffer.content[searchLine];
      while (searchCol >= 0 && depth > 0) {
        if (searchContent[searchCol] === bracket) depth++;
        else if (searchContent[searchCol] === matchingBracket) depth--;
        if (depth > 0) searchCol--;
      }
      if (depth > 0) {
        searchLine--;
        if (searchLine >= 0) searchCol = buffer.content[searchLine].length - 1;
      }
    }
  }
  
  if (depth === 0) {
    return { line: searchLine, col: searchCol, inclusive: true };
  }
  return null;
}

export function motionDoubleBracketForward(buffer: VimBuffer, count: number = 1): MotionResult {
  let line = buffer.cursorLine;
  const content = buffer.content;
  let found = 0;
  
  for (let i = line + 1; i < content.length && found < count; i++) {
    const lineContent = content[i].trim();
    if (lineContent.startsWith("{") || 
        lineContent.startsWith("function") ||
        lineContent.startsWith("class") ||
        lineContent.startsWith("const ") ||
        lineContent.startsWith("export function") ||
        lineContent.startsWith("export class") ||
        lineContent.startsWith("def ") ||
        lineContent.startsWith("fn ") ||
        lineContent.startsWith("pub fn ")) {
      line = i;
      found++;
    }
  }
  
  return { line, col: 0, linewise: true };
}

export function motionDoubleBracketBackward(buffer: VimBuffer, count: number = 1): MotionResult {
  let line = buffer.cursorLine;
  const content = buffer.content;
  let found = 0;
  
  for (let i = line - 1; i >= 0 && found < count; i--) {
    const lineContent = content[i].trim();
    if (lineContent.startsWith("{") || 
        lineContent.startsWith("function") ||
        lineContent.startsWith("class") ||
        lineContent.startsWith("const ") ||
        lineContent.startsWith("export function") ||
        lineContent.startsWith("export class") ||
        lineContent.startsWith("def ") ||
        lineContent.startsWith("fn ") ||
        lineContent.startsWith("pub fn ")) {
      line = i;
      found++;
    }
  }
  
  return { line, col: 0, linewise: true };
}

export function motionBracketEndForward(buffer: VimBuffer, count: number = 1): MotionResult {
  let line = buffer.cursorLine;
  const content = buffer.content;
  let found = 0;
  
  for (let i = line + 1; i < content.length && found < count; i++) {
    const lineContent = content[i].trim();
    if (lineContent === "}" || lineContent.startsWith("}")) {
      line = i;
      found++;
    }
  }
  
  return { line, col: 0, linewise: true };
}

export function motionBracketEndBackward(buffer: VimBuffer, count: number = 1): MotionResult {
  let line = buffer.cursorLine;
  const content = buffer.content;
  let found = 0;
  
  for (let i = line - 1; i >= 0 && found < count; i--) {
    const lineContent = content[i].trim();
    if (lineContent === "}" || lineContent.startsWith("}")) {
      line = i;
      found++;
    }
  }
  
  return { line, col: 0, linewise: true };
}

export function motionH_screen(buffer: VimBuffer, visibleStartLine: number, count: number = 1): MotionResult {
  const targetLine = Math.min(visibleStartLine + count - 1, buffer.content.length - 1);
  const line = buffer.content[targetLine] || "";
  let col = 0;
  while (col < line.length && (line[col] === " " || line[col] === "\t")) {
    col++;
  }
  if (col >= line.length && line.length > 0) col = line.length - 1;
  return { line: targetLine, col };
}

export function motionM_screen(buffer: VimBuffer, visibleStartLine: number, visibleEndLine: number): MotionResult {
  const targetLine = Math.floor((visibleStartLine + visibleEndLine) / 2);
  const clampedLine = Math.min(Math.max(targetLine, 0), buffer.content.length - 1);
  const line = buffer.content[clampedLine] || "";
  let col = 0;
  while (col < line.length && (line[col] === " " || line[col] === "\t")) {
    col++;
  }
  if (col >= line.length && line.length > 0) col = line.length - 1;
  return { line: clampedLine, col };
}

export function motionL_screen(buffer: VimBuffer, visibleEndLine: number, count: number = 1): MotionResult {
  const targetLine = Math.max(visibleEndLine - count + 1, 0);
  const clampedLine = Math.min(targetLine, buffer.content.length - 1);
  const line = buffer.content[clampedLine] || "";
  let col = 0;
  while (col < line.length && (line[col] === " " || line[col] === "\t")) {
    col++;
  }
  if (col >= line.length && line.length > 0) col = line.length - 1;
  return { line: clampedLine, col };
}

export interface ScrollResult extends MotionResult {
  scrollOffset: number;
}

export function motionCtrlD(buffer: VimBuffer, visibleLines: number, count?: number): ScrollResult {
  const halfPage = count ?? Math.floor(visibleLines / 2);
  const newLine = Math.min(buffer.cursorLine + halfPage, buffer.content.length - 1);
  const newCol = Math.min(buffer.cursorCol, getMaxCol(buffer, newLine));
  return { line: newLine, col: newCol, scrollOffset: halfPage };
}

export function motionCtrlU(buffer: VimBuffer, visibleLines: number, count?: number): ScrollResult {
  const halfPage = count ?? Math.floor(visibleLines / 2);
  const newLine = Math.max(buffer.cursorLine - halfPage, 0);
  const newCol = Math.min(buffer.cursorCol, getMaxCol(buffer, newLine));
  return { line: newLine, col: newCol, scrollOffset: -halfPage };
}

export function motionCtrlF(buffer: VimBuffer, visibleLines: number, count: number = 1): ScrollResult {
  const fullPage = visibleLines * count;
  const newLine = Math.min(buffer.cursorLine + fullPage, buffer.content.length - 1);
  const newCol = Math.min(buffer.cursorCol, getMaxCol(buffer, newLine));
  return { line: newLine, col: newCol, scrollOffset: fullPage };
}

export function motionCtrlB(buffer: VimBuffer, visibleLines: number, count: number = 1): ScrollResult {
  const fullPage = visibleLines * count;
  const newLine = Math.max(buffer.cursorLine - fullPage, 0);
  const newCol = Math.min(buffer.cursorCol, getMaxCol(buffer, newLine));
  return { line: newLine, col: newCol, scrollOffset: -fullPage };
}

export function motionSearchNext(state: VimState, buffer: VimBuffer, count: number = 1): MotionResult | null {
  if (!state.searchState || state.searchState.matches.length === 0) {
    if (!state.lastSearchPattern) return null;
    return null;
  }
  
  const matches = state.searchState.matches;
  let currentIndex = state.searchState.currentMatchIndex;
  const direction = state.searchState.direction;
  
  for (let i = 0; i < count; i++) {
    if (direction === "forward") {
      currentIndex = (currentIndex + 1) % matches.length;
    } else {
      currentIndex = (currentIndex - 1 + matches.length) % matches.length;
    }
  }
  
  const match = matches[currentIndex];
  return { line: match.line, col: match.col };
}

export function motionSearchPrev(state: VimState, buffer: VimBuffer, count: number = 1): MotionResult | null {
  if (!state.searchState || state.searchState.matches.length === 0) {
    if (!state.lastSearchPattern) return null;
    return null;
  }
  
  const matches = state.searchState.matches;
  let currentIndex = state.searchState.currentMatchIndex;
  const direction = state.searchState.direction;
  
  for (let i = 0; i < count; i++) {
    if (direction === "forward") {
      currentIndex = (currentIndex - 1 + matches.length) % matches.length;
    } else {
      currentIndex = (currentIndex + 1) % matches.length;
    }
  }
  
  const match = matches[currentIndex];
  return { line: match.line, col: match.col };
}

export function motionMarkLine(buffer: VimBuffer, state: VimState, mark: string): MotionResult | null {
  const isGlobal = mark >= "A" && mark <= "Z";
  
  if (isGlobal) {
    const globalMark = state.globalMarks[mark];
    if (!globalMark) return null;
    if (globalMark.bufferId && globalMark.bufferId !== buffer.id) return null;
    const line = buffer.content[globalMark.line] || "";
    let col = 0;
    while (col < line.length && (line[col] === " " || line[col] === "\t")) {
      col++;
    }
    return { line: globalMark.line, col, linewise: true };
  } else {
    const localMark = buffer.marks[mark];
    if (!localMark) return null;
    const line = buffer.content[localMark.line] || "";
    let col = 0;
    while (col < line.length && (line[col] === " " || line[col] === "\t")) {
      col++;
    }
    return { line: localMark.line, col, linewise: true };
  }
}

export function motionMarkExact(buffer: VimBuffer, state: VimState, mark: string): MotionResult | null {
  const isGlobal = mark >= "A" && mark <= "Z";
  
  if (isGlobal) {
    const globalMark = state.globalMarks[mark];
    if (!globalMark) return null;
    if (globalMark.bufferId && globalMark.bufferId !== buffer.id) return null;
    return { line: globalMark.line, col: globalMark.col };
  } else {
    const localMark = buffer.marks[mark];
    if (!localMark) return null;
    return { line: localMark.line, col: localMark.col };
  }
}

export function motionPreviousPosition(state: VimState, buffer: VimBuffer): MotionResult | null {
  if (state.jumplist.length === 0 || state.jumplistPosition < 0) return null;
  
  const entry = state.jumplist[state.jumplistPosition];
  if (entry.bufferId !== buffer.id) return null;
  
  return { line: entry.position.line, col: entry.position.col };
}

export function motionCtrlO(state: VimState, buffer: VimBuffer): { result: MotionResult | null; newPosition: number } {
  if (state.jumplist.length === 0) {
    return { result: null, newPosition: state.jumplistPosition };
  }
  
  let newPosition = state.jumplistPosition - 1;
  if (newPosition < 0) newPosition = 0;
  
  const entry = state.jumplist[newPosition];
  if (!entry || entry.bufferId !== buffer.id) {
    return { result: null, newPosition: state.jumplistPosition };
  }
  
  return { 
    result: { line: entry.position.line, col: entry.position.col },
    newPosition 
  };
}

export function motionCtrlI(state: VimState, buffer: VimBuffer): { result: MotionResult | null; newPosition: number } {
  if (state.jumplist.length === 0) {
    return { result: null, newPosition: state.jumplistPosition };
  }
  
  let newPosition = state.jumplistPosition + 1;
  if (newPosition >= state.jumplist.length) {
    return { result: null, newPosition: state.jumplistPosition };
  }
  
  const entry = state.jumplist[newPosition];
  if (!entry || entry.bufferId !== buffer.id) {
    return { result: null, newPosition: state.jumplistPosition };
  }
  
  return { 
    result: { line: entry.position.line, col: entry.position.col },
    newPosition 
  };
}

export function motionGI(buffer: VimBuffer): MotionResult | null {
  if (!buffer.lastInsertPosition) return null;
  return { line: buffer.lastInsertPosition.line, col: buffer.lastInsertPosition.col };
}

export function motionGD(buffer: VimBuffer): MotionResult | null {
  const line = buffer.content[buffer.cursorLine] || "";
  const col = buffer.cursorCol;
  
  let wordStart = col;
  let wordEnd = col;
  
  while (wordStart > 0 && isWordChar(line[wordStart - 1])) wordStart--;
  while (wordEnd < line.length && isWordChar(line[wordEnd])) wordEnd++;
  
  if (wordStart === wordEnd) return null;
  
  const word = line.substring(wordStart, wordEnd);
  
  for (let i = 0; i < buffer.content.length; i++) {
    const searchLine = buffer.content[i];
    const idx = searchLine.indexOf(word);
    if (idx !== -1) {
      const beforeOk = idx === 0 || !isWordChar(searchLine[idx - 1]);
      const afterOk = idx + word.length >= searchLine.length || !isWordChar(searchLine[idx + word.length]);
      if (beforeOk && afterOk) {
        if (i !== buffer.cursorLine || idx !== wordStart) {
          return { line: i, col: idx };
        }
      }
    }
  }
  
  return null;
}

export function motionStar(buffer: VimBuffer): { result: MotionResult | null; pattern: string | null } {
  const line = buffer.content[buffer.cursorLine] || "";
  const col = buffer.cursorCol;
  
  let wordStart = col;
  let wordEnd = col;
  
  while (wordStart > 0 && isWordChar(line[wordStart - 1])) wordStart--;
  while (wordEnd < line.length && isWordChar(line[wordEnd])) wordEnd++;
  
  if (wordStart === wordEnd) return { result: null, pattern: null };
  
  const word = line.substring(wordStart, wordEnd);
  
  for (let i = buffer.cursorLine; i < buffer.content.length; i++) {
    const searchLine = buffer.content[i];
    const startCol = i === buffer.cursorLine ? wordEnd : 0;
    
    for (let j = startCol; j < searchLine.length; j++) {
      if (searchLine.substring(j, j + word.length) === word) {
        const beforeOk = j === 0 || !isWordChar(searchLine[j - 1]);
        const afterOk = j + word.length >= searchLine.length || !isWordChar(searchLine[j + word.length]);
        if (beforeOk && afterOk) {
          return { result: { line: i, col: j }, pattern: `\\b${word}\\b` };
        }
      }
    }
  }
  
  for (let i = 0; i <= buffer.cursorLine; i++) {
    const searchLine = buffer.content[i];
    const endCol = i === buffer.cursorLine ? wordStart : searchLine.length;
    
    for (let j = 0; j < endCol; j++) {
      if (searchLine.substring(j, j + word.length) === word) {
        const beforeOk = j === 0 || !isWordChar(searchLine[j - 1]);
        const afterOk = j + word.length >= searchLine.length || !isWordChar(searchLine[j + word.length]);
        if (beforeOk && afterOk) {
          return { result: { line: i, col: j }, pattern: `\\b${word}\\b` };
        }
      }
    }
  }
  
  return { result: null, pattern: word };
}

export function motionHash(buffer: VimBuffer): { result: MotionResult | null; pattern: string | null } {
  const line = buffer.content[buffer.cursorLine] || "";
  const col = buffer.cursorCol;
  
  let wordStart = col;
  let wordEnd = col;
  
  while (wordStart > 0 && isWordChar(line[wordStart - 1])) wordStart--;
  while (wordEnd < line.length && isWordChar(line[wordEnd])) wordEnd++;
  
  if (wordStart === wordEnd) return { result: null, pattern: null };
  
  const word = line.substring(wordStart, wordEnd);
  
  for (let i = buffer.cursorLine; i >= 0; i--) {
    const searchLine = buffer.content[i];
    const startCol = i === buffer.cursorLine ? wordStart - 1 : searchLine.length - 1;
    
    for (let j = startCol; j >= 0; j--) {
      if (searchLine.substring(j, j + word.length) === word) {
        const beforeOk = j === 0 || !isWordChar(searchLine[j - 1]);
        const afterOk = j + word.length >= searchLine.length || !isWordChar(searchLine[j + word.length]);
        if (beforeOk && afterOk) {
          return { result: { line: i, col: j }, pattern: `\\b${word}\\b` };
        }
      }
    }
  }
  
  for (let i = buffer.content.length - 1; i >= buffer.cursorLine; i--) {
    const searchLine = buffer.content[i];
    const startCol = i === buffer.cursorLine ? searchLine.length - 1 : searchLine.length - 1;
    
    for (let j = startCol; j >= wordEnd; j--) {
      if (searchLine.substring(j, j + word.length) === word) {
        const beforeOk = j === 0 || !isWordChar(searchLine[j - 1]);
        const afterOk = j + word.length >= searchLine.length || !isWordChar(searchLine[j + word.length]);
        if (beforeOk && afterOk) {
          return { result: { line: i, col: j }, pattern: `\\b${word}\\b` };
        }
      }
    }
  }
  
  return { result: null, pattern: word };
}

export function addToJumplist(state: VimState, bufferId: string, position: CursorPosition): VimState {
  const entry: JumplistEntry = { bufferId, position };
  
  const newJumplist = state.jumplist.slice(0, state.jumplistPosition + 1);
  newJumplist.push(entry);
  
  if (newJumplist.length > 100) {
    newJumplist.shift();
  }
  
  return {
    ...state,
    jumplist: newJumplist,
    jumplistPosition: newJumplist.length - 1,
  };
}

function getMaxCol(buffer: VimBuffer, line: number, allowPastEnd: boolean = false): number {
  const lineLen = getLineLength(buffer, line);
  if (lineLen === 0) return 0;
  return allowPastEnd ? lineLen : lineLen - 1;
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
    case "%":
      result = motionPercent(buffer);
      break;
    case "]]":
      result = motionDoubleBracketForward(buffer, count);
      break;
    case "[[":
      result = motionDoubleBracketBackward(buffer, count);
      break;
    case "][":
      result = motionBracketEndForward(buffer, count);
      break;
    case "[]":
      result = motionBracketEndBackward(buffer, count);
      break;
    case "n":
      result = motionSearchNext(state, buffer, count);
      break;
    case "N":
      result = motionSearchPrev(state, buffer, count);
      break;
    case "gi":
      result = motionGI(buffer);
      break;
    case "gd":
      result = motionGD(buffer);
      break;
    case "*": {
      const starResult = motionStar(buffer);
      result = starResult.result;
      if (starResult.pattern) {
        updatedState.lastSearchPattern = starResult.pattern;
        updatedState.lastSearchDirection = "forward";
      }
      break;
    }
    case "#": {
      const hashResult = motionHash(buffer);
      result = hashResult.result;
      if (hashResult.pattern) {
        updatedState.lastSearchPattern = hashResult.pattern;
        updatedState.lastSearchDirection = "backward";
      }
      break;
    }
    case "'":
      if (char) {
        result = motionMarkLine(buffer, state, char);
      }
      break;
    case "`":
      if (char) {
        result = motionMarkExact(buffer, state, char);
      }
      break;
    case "''":
      result = motionPreviousPosition(state, buffer);
      break;
    case "<C-o>": {
      const ctrlOResult = motionCtrlO(state, buffer);
      result = ctrlOResult.result;
      updatedState.jumplistPosition = ctrlOResult.newPosition;
      break;
    }
    case "<C-i>": {
      const ctrlIResult = motionCtrlI(state, buffer);
      result = ctrlIResult.result;
      updatedState.jumplistPosition = ctrlIResult.newPosition;
      break;
    }
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
