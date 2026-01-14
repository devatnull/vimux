import type { VimBuffer, VimState } from "../types";
import type { MotionResult } from "./motions";
import { getActiveBuffer } from "./motions";

export interface TextObjectResult {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  linewise: boolean;
}

function getCharAt(buffer: VimBuffer, line: number, col: number): string {
  if (line < 0 || line >= buffer.content.length) return "";
  const lineContent = buffer.content[line];
  if (col < 0 || col >= lineContent.length) return "";
  return lineContent[col];
}

function isWordChar(char: string): boolean {
  return /^[a-zA-Z0-9_]$/.test(char);
}

function isWORDChar(char: string): boolean {
  return char !== "" && char !== " " && char !== "\t" && char !== "\n";
}

function isWhitespace(char: string): boolean {
  return char === " " || char === "\t";
}

export function textObjectInnerWord(buffer: VimBuffer): TextObjectResult | null {
  const line = buffer.content[buffer.cursorLine] || "";
  const col = buffer.cursorCol;
  
  if (col >= line.length) {
    return null;
  }
  
  const char = line[col];
  let startCol = col;
  let endCol = col;
  
  if (isWhitespace(char)) {
    while (startCol > 0 && isWhitespace(line[startCol - 1])) {
      startCol--;
    }
    while (endCol < line.length - 1 && isWhitespace(line[endCol + 1])) {
      endCol++;
    }
  } else if (isWordChar(char)) {
    while (startCol > 0 && isWordChar(line[startCol - 1])) {
      startCol--;
    }
    while (endCol < line.length - 1 && isWordChar(line[endCol + 1])) {
      endCol++;
    }
  } else {
    while (startCol > 0 && !isWordChar(line[startCol - 1]) && !isWhitespace(line[startCol - 1])) {
      startCol--;
    }
    while (endCol < line.length - 1 && !isWordChar(line[endCol + 1]) && !isWhitespace(line[endCol + 1])) {
      endCol++;
    }
  }
  
  return {
    startLine: buffer.cursorLine,
    startCol,
    endLine: buffer.cursorLine,
    endCol,
    linewise: false,
  };
}

export function textObjectAWord(buffer: VimBuffer): TextObjectResult | null {
  const result = textObjectInnerWord(buffer);
  if (!result) return null;
  
  const line = buffer.content[result.startLine] || "";
  
  if (result.endCol < line.length - 1 && isWhitespace(line[result.endCol + 1])) {
    while (result.endCol < line.length - 1 && isWhitespace(line[result.endCol + 1])) {
      result.endCol++;
    }
  } else if (result.startCol > 0 && isWhitespace(line[result.startCol - 1])) {
    while (result.startCol > 0 && isWhitespace(line[result.startCol - 1])) {
      result.startCol--;
    }
  }
  
  return result;
}

export function textObjectInnerWORD(buffer: VimBuffer): TextObjectResult | null {
  const line = buffer.content[buffer.cursorLine] || "";
  const col = buffer.cursorCol;
  
  if (col >= line.length) {
    return null;
  }
  
  const char = line[col];
  let startCol = col;
  let endCol = col;
  
  if (isWhitespace(char)) {
    while (startCol > 0 && isWhitespace(line[startCol - 1])) {
      startCol--;
    }
    while (endCol < line.length - 1 && isWhitespace(line[endCol + 1])) {
      endCol++;
    }
  } else {
    while (startCol > 0 && isWORDChar(line[startCol - 1])) {
      startCol--;
    }
    while (endCol < line.length - 1 && isWORDChar(line[endCol + 1])) {
      endCol++;
    }
  }
  
  return {
    startLine: buffer.cursorLine,
    startCol,
    endLine: buffer.cursorLine,
    endCol,
    linewise: false,
  };
}

export function textObjectAWORD(buffer: VimBuffer): TextObjectResult | null {
  const result = textObjectInnerWORD(buffer);
  if (!result) return null;
  
  const line = buffer.content[result.startLine] || "";
  
  if (result.endCol < line.length - 1 && isWhitespace(line[result.endCol + 1])) {
    while (result.endCol < line.length - 1 && isWhitespace(line[result.endCol + 1])) {
      result.endCol++;
    }
  } else if (result.startCol > 0 && isWhitespace(line[result.startCol - 1])) {
    while (result.startCol > 0 && isWhitespace(line[result.startCol - 1])) {
      result.startCol--;
    }
  }
  
  return result;
}

function findSentenceStart(buffer: VimBuffer, line: number, col: number): { line: number; col: number } | null {
  const sentenceEnd = /[.!?]/;
  let l = line;
  let c = col;
  
  while (l >= 0) {
    const lineContent = buffer.content[l] || "";
    const startC = l === line ? c : lineContent.length - 1;
    
    for (let i = startC; i >= 0; i--) {
      const char = lineContent[i];
      if (sentenceEnd.test(char)) {
        let nextI = i + 1;
        let nextL = l;
        while (nextL < buffer.content.length) {
          const nextLine = buffer.content[nextL] || "";
          const start = nextL === l ? nextI : 0;
          for (let j = start; j < nextLine.length; j++) {
            if (!isWhitespace(nextLine[j])) {
              return { line: nextL, col: j };
            }
          }
          nextL++;
        }
        return { line: l, col: i + 1 };
      }
    }
    
    if (lineContent.trim() === "" && l < line) {
      let nextL = l + 1;
      while (nextL < buffer.content.length) {
        const nextLine = buffer.content[nextL] || "";
        for (let j = 0; j < nextLine.length; j++) {
          if (!isWhitespace(nextLine[j])) {
            return { line: nextL, col: j };
          }
        }
        nextL++;
      }
    }
    
    l--;
  }
  
  return { line: 0, col: 0 };
}

function findSentenceEnd(buffer: VimBuffer, line: number, col: number): { line: number; col: number } | null {
  const sentenceEnd = /[.!?]/;
  let l = line;
  let c = col;
  
  while (l < buffer.content.length) {
    const lineContent = buffer.content[l] || "";
    const startC = l === line ? c : 0;
    
    for (let i = startC; i < lineContent.length; i++) {
      const char = lineContent[i];
      if (sentenceEnd.test(char)) {
        return { line: l, col: i };
      }
    }
    l++;
  }
  
  const lastLine = buffer.content.length - 1;
  const lastLineContent = buffer.content[lastLine] || "";
  return { line: lastLine, col: Math.max(0, lastLineContent.length - 1) };
}

export function textObjectInnerSentence(buffer: VimBuffer): TextObjectResult | null {
  const start = findSentenceStart(buffer, buffer.cursorLine, buffer.cursorCol);
  const end = findSentenceEnd(buffer, buffer.cursorLine, buffer.cursorCol);
  
  if (!start || !end) return null;
  
  return {
    startLine: start.line,
    startCol: start.col,
    endLine: end.line,
    endCol: end.col,
    linewise: false,
  };
}

export function textObjectASentence(buffer: VimBuffer): TextObjectResult | null {
  const result = textObjectInnerSentence(buffer);
  if (!result) return null;
  
  const endLine = buffer.content[result.endLine] || "";
  while (result.endCol < endLine.length - 1 && isWhitespace(endLine[result.endCol + 1])) {
    result.endCol++;
  }
  
  return result;
}

function findParagraphStart(buffer: VimBuffer, line: number): number {
  let l = line;
  while (l > 0) {
    if (buffer.content[l - 1]?.trim() === "") {
      return l;
    }
    l--;
  }
  return 0;
}

function findParagraphEnd(buffer: VimBuffer, line: number): number {
  let l = line;
  while (l < buffer.content.length - 1) {
    if (buffer.content[l + 1]?.trim() === "") {
      return l;
    }
    l++;
  }
  return buffer.content.length - 1;
}

export function textObjectInnerParagraph(buffer: VimBuffer): TextObjectResult | null {
  const currentLine = buffer.content[buffer.cursorLine] || "";
  
  if (currentLine.trim() === "") {
    let startLine = buffer.cursorLine;
    let endLine = buffer.cursorLine;
    
    while (startLine > 0 && buffer.content[startLine - 1]?.trim() === "") {
      startLine--;
    }
    while (endLine < buffer.content.length - 1 && buffer.content[endLine + 1]?.trim() === "") {
      endLine++;
    }
    
    return {
      startLine,
      startCol: 0,
      endLine,
      endCol: (buffer.content[endLine] || "").length,
      linewise: true,
    };
  }
  
  const startLine = findParagraphStart(buffer, buffer.cursorLine);
  const endLine = findParagraphEnd(buffer, buffer.cursorLine);
  
  return {
    startLine,
    startCol: 0,
    endLine,
    endCol: (buffer.content[endLine] || "").length,
    linewise: true,
  };
}

export function textObjectAParagraph(buffer: VimBuffer): TextObjectResult | null {
  const result = textObjectInnerParagraph(buffer);
  if (!result) return null;
  
  if (result.endLine < buffer.content.length - 1 && buffer.content[result.endLine + 1]?.trim() === "") {
    while (result.endLine < buffer.content.length - 1 && buffer.content[result.endLine + 1]?.trim() === "") {
      result.endLine++;
    }
    result.endCol = (buffer.content[result.endLine] || "").length;
  } else if (result.startLine > 0 && buffer.content[result.startLine - 1]?.trim() === "") {
    while (result.startLine > 0 && buffer.content[result.startLine - 1]?.trim() === "") {
      result.startLine--;
    }
  }
  
  return result;
}

function findQuotedString(
  buffer: VimBuffer,
  quoteChar: string,
  inner: boolean
): TextObjectResult | null {
  const line = buffer.content[buffer.cursorLine] || "";
  const col = buffer.cursorCol;
  
  let startQuote = -1;
  let endQuote = -1;
  
  for (let i = col; i >= 0; i--) {
    if (line[i] === quoteChar && (i === 0 || line[i - 1] !== "\\")) {
      startQuote = i;
      break;
    }
  }
  
  if (startQuote === -1) {
    for (let i = col + 1; i < line.length; i++) {
      if (line[i] === quoteChar && line[i - 1] !== "\\") {
        startQuote = i;
        break;
      }
    }
    if (startQuote === -1) return null;
  }
  
  for (let i = startQuote + 1; i < line.length; i++) {
    if (line[i] === quoteChar && line[i - 1] !== "\\") {
      endQuote = i;
      break;
    }
  }
  
  if (endQuote === -1) return null;
  
  if (col > endQuote) {
    for (let i = col; i < line.length; i++) {
      if (line[i] === quoteChar && (i === 0 || line[i - 1] !== "\\")) {
        startQuote = i;
        for (let j = startQuote + 1; j < line.length; j++) {
          if (line[j] === quoteChar && line[j - 1] !== "\\") {
            endQuote = j;
            break;
          }
        }
        if (endQuote > startQuote) break;
      }
    }
    if (endQuote <= startQuote) return null;
  }
  
  return {
    startLine: buffer.cursorLine,
    startCol: inner ? startQuote + 1 : startQuote,
    endLine: buffer.cursorLine,
    endCol: inner ? endQuote - 1 : endQuote,
    linewise: false,
  };
}

export function textObjectInnerDoubleQuote(buffer: VimBuffer): TextObjectResult | null {
  return findQuotedString(buffer, '"', true);
}

export function textObjectADoubleQuote(buffer: VimBuffer): TextObjectResult | null {
  return findQuotedString(buffer, '"', false);
}

export function textObjectInnerSingleQuote(buffer: VimBuffer): TextObjectResult | null {
  return findQuotedString(buffer, "'", true);
}

export function textObjectASingleQuote(buffer: VimBuffer): TextObjectResult | null {
  return findQuotedString(buffer, "'", false);
}

export function textObjectInnerBacktick(buffer: VimBuffer): TextObjectResult | null {
  return findQuotedString(buffer, "`", true);
}

export function textObjectABacktick(buffer: VimBuffer): TextObjectResult | null {
  return findQuotedString(buffer, "`", false);
}

interface BracketPair {
  open: string;
  close: string;
}

function findMatchingBracket(
  buffer: VimBuffer,
  openChar: string,
  closeChar: string,
  inner: boolean
): TextObjectResult | null {
  const startLine = buffer.cursorLine;
  const startCol = buffer.cursorCol;
  
  let openPos: { line: number; col: number } | null = null;
  let closePos: { line: number; col: number } | null = null;
  
  let depth = 0;
  let l = startLine;
  let c = startCol;
  
  const currentChar = getCharAt(buffer, l, c);
  if (currentChar === openChar) {
    openPos = { line: l, col: c };
    depth = 1;
  } else if (currentChar === closeChar) {
    closePos = { line: l, col: c };
    depth = 1;
    l = startLine;
    c = startCol - 1;
    while (l >= 0) {
      const lineContent = buffer.content[l] || "";
      const startC = l === startLine ? c : lineContent.length - 1;
      
      for (let i = startC; i >= 0; i--) {
        const char = lineContent[i];
        if (char === closeChar) {
          depth++;
        } else if (char === openChar) {
          depth--;
          if (depth === 0) {
            openPos = { line: l, col: i };
            break;
          }
        }
      }
      if (openPos) break;
      l--;
      c = l >= 0 ? (buffer.content[l]?.length ?? 0) - 1 : -1;
    }
    
    if (!openPos) return null;
    
    return {
      startLine: openPos.line,
      startCol: inner ? openPos.col + 1 : openPos.col,
      endLine: closePos.line,
      endCol: inner ? closePos.col - 1 : closePos.col,
      linewise: false,
    };
  } else {
    l = startLine;
    c = startCol;
    while (l >= 0) {
      const lineContent = buffer.content[l] || "";
      const startC = l === startLine ? c : lineContent.length - 1;
      
      for (let i = startC; i >= 0; i--) {
        const char = lineContent[i];
        if (char === closeChar) {
          depth++;
        } else if (char === openChar) {
          if (depth === 0) {
            openPos = { line: l, col: i };
            break;
          }
          depth--;
        }
      }
      if (openPos) break;
      l--;
      c = l >= 0 ? (buffer.content[l]?.length ?? 0) - 1 : -1;
    }
    
    if (!openPos) return null;
    depth = 1;
  }
  
  l = openPos.line;
  c = openPos.col + 1;
  depth = 1;
  
  while (l < buffer.content.length) {
    const lineContent = buffer.content[l] || "";
    const startC = l === openPos.line ? c : 0;
    
    for (let i = startC; i < lineContent.length; i++) {
      const char = lineContent[i];
      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          closePos = { line: l, col: i };
          break;
        }
      }
    }
    if (closePos) break;
    l++;
    c = 0;
  }
  
  if (!openPos || !closePos) return null;
  
  return {
    startLine: openPos.line,
    startCol: inner ? openPos.col + 1 : openPos.col,
    endLine: closePos.line,
    endCol: inner ? closePos.col - 1 : closePos.col,
    linewise: false,
  };
}

export function textObjectInnerParen(buffer: VimBuffer): TextObjectResult | null {
  return findMatchingBracket(buffer, "(", ")", true);
}

export function textObjectAParen(buffer: VimBuffer): TextObjectResult | null {
  return findMatchingBracket(buffer, "(", ")", false);
}

export function textObjectInnerBracket(buffer: VimBuffer): TextObjectResult | null {
  return findMatchingBracket(buffer, "[", "]", true);
}

export function textObjectABracket(buffer: VimBuffer): TextObjectResult | null {
  return findMatchingBracket(buffer, "[", "]", false);
}

export function textObjectInnerBrace(buffer: VimBuffer): TextObjectResult | null {
  return findMatchingBracket(buffer, "{", "}", true);
}

export function textObjectABrace(buffer: VimBuffer): TextObjectResult | null {
  return findMatchingBracket(buffer, "{", "}", false);
}

export function textObjectInnerAngle(buffer: VimBuffer): TextObjectResult | null {
  return findMatchingBracket(buffer, "<", ">", true);
}

export function textObjectAAngle(buffer: VimBuffer): TextObjectResult | null {
  return findMatchingBracket(buffer, "<", ">", false);
}

function findTag(buffer: VimBuffer, inner: boolean): TextObjectResult | null {
  const startLine = buffer.cursorLine;
  const startCol = buffer.cursorCol;
  
  let openTagStart: { line: number; col: number } | null = null;
  let openTagEnd: { line: number; col: number } | null = null;
  let closeTagStart: { line: number; col: number } | null = null;
  let closeTagEnd: { line: number; col: number } | null = null;
  let tagName = "";
  
  let l = startLine;
  let c = startCol;
  
  while (l >= 0) {
    const lineContent = buffer.content[l] || "";
    const searchStart = l === startLine ? c : lineContent.length - 1;
    
    for (let i = searchStart; i >= 0; i--) {
      if (lineContent[i] === "<" && i + 1 < lineContent.length && lineContent[i + 1] !== "/") {
        const tagMatch = lineContent.slice(i).match(/^<([a-zA-Z][a-zA-Z0-9-]*)[^>]*>/);
        if (tagMatch) {
          const potentialTagName = tagMatch[1];
          const potentialOpenStart = { line: l, col: i };
          const potentialOpenEnd = { line: l, col: i + tagMatch[0].length - 1 };
          
          const closeResult = findClosingTag(buffer, potentialTagName, potentialOpenEnd.line, potentialOpenEnd.col + 1);
          if (closeResult && (
            closeResult.endLine > startLine ||
            (closeResult.endLine === startLine && closeResult.endCol >= startCol)
          )) {
            openTagStart = potentialOpenStart;
            openTagEnd = potentialOpenEnd;
            closeTagStart = closeResult.startPos;
            closeTagEnd = closeResult.endPos;
            tagName = potentialTagName;
            break;
          }
        }
      }
    }
    if (openTagStart) break;
    l--;
    c = l >= 0 ? (buffer.content[l]?.length ?? 0) - 1 : -1;
  }
  
  if (!openTagStart || !openTagEnd || !closeTagStart || !closeTagEnd) {
    return null;
  }
  
  if (inner) {
    return {
      startLine: openTagEnd.line,
      startCol: openTagEnd.col + 1,
      endLine: closeTagStart.line,
      endCol: closeTagStart.col - 1,
      linewise: false,
    };
  }
  
  return {
    startLine: openTagStart.line,
    startCol: openTagStart.col,
    endLine: closeTagEnd.line,
    endCol: closeTagEnd.col,
    linewise: false,
  };
}

function findClosingTag(
  buffer: VimBuffer,
  tagName: string,
  startLine: number,
  startCol: number
): { startPos: { line: number; col: number }; endPos: { line: number; col: number }; endLine: number; endCol: number } | null {
  let depth = 1;
  let l = startLine;
  let c = startCol;
  
  while (l < buffer.content.length) {
    const lineContent = buffer.content[l] || "";
    const searchStart = l === startLine ? c : 0;
    
    for (let i = searchStart; i < lineContent.length; i++) {
      if (lineContent[i] === "<") {
        const openMatch = lineContent.slice(i).match(new RegExp(`^<${tagName}[^>]*>`));
        if (openMatch) {
          depth++;
          i += openMatch[0].length - 1;
          continue;
        }
        
        const closeMatch = lineContent.slice(i).match(new RegExp(`^</${tagName}>`));
        if (closeMatch) {
          depth--;
          if (depth === 0) {
            return {
              startPos: { line: l, col: i },
              endPos: { line: l, col: i + closeMatch[0].length - 1 },
              endLine: l,
              endCol: i + closeMatch[0].length - 1,
            };
          }
          i += closeMatch[0].length - 1;
        }
      }
    }
    l++;
    c = 0;
  }
  
  return null;
}

export function textObjectInnerTag(buffer: VimBuffer): TextObjectResult | null {
  return findTag(buffer, true);
}

export function textObjectATag(buffer: VimBuffer): TextObjectResult | null {
  return findTag(buffer, false);
}

export function textObjectToMotionResult(
  buffer: VimBuffer,
  textObject: TextObjectResult
): MotionResult {
  return {
    line: textObject.endLine,
    col: textObject.endCol,
    linewise: textObject.linewise,
    inclusive: true,
  };
}

export function executeTextObject(
  state: VimState,
  type: "i" | "a",
  objectKey: string
): { state: VimState; result: TextObjectResult | null } {
  const buffer = getActiveBuffer(state);
  if (!buffer) {
    return { state, result: null };
  }
  
  let result: TextObjectResult | null = null;
  
  switch (objectKey) {
    case "w":
      result = type === "i" ? textObjectInnerWord(buffer) : textObjectAWord(buffer);
      break;
    case "W":
      result = type === "i" ? textObjectInnerWORD(buffer) : textObjectAWORD(buffer);
      break;
    case "s":
      result = type === "i" ? textObjectInnerSentence(buffer) : textObjectASentence(buffer);
      break;
    case "p":
      result = type === "i" ? textObjectInnerParagraph(buffer) : textObjectAParagraph(buffer);
      break;
    case '"':
      result = type === "i" ? textObjectInnerDoubleQuote(buffer) : textObjectADoubleQuote(buffer);
      break;
    case "'":
      result = type === "i" ? textObjectInnerSingleQuote(buffer) : textObjectASingleQuote(buffer);
      break;
    case "`":
      result = type === "i" ? textObjectInnerBacktick(buffer) : textObjectABacktick(buffer);
      break;
    case "(":
    case ")":
    case "b":
      result = type === "i" ? textObjectInnerParen(buffer) : textObjectAParen(buffer);
      break;
    case "[":
    case "]":
      result = type === "i" ? textObjectInnerBracket(buffer) : textObjectABracket(buffer);
      break;
    case "{":
    case "}":
    case "B":
      result = type === "i" ? textObjectInnerBrace(buffer) : textObjectABrace(buffer);
      break;
    case "<":
    case ">":
      result = type === "i" ? textObjectInnerAngle(buffer) : textObjectAAngle(buffer);
      break;
    case "t":
      result = type === "i" ? textObjectInnerTag(buffer) : textObjectATag(buffer);
      break;
    default:
      result = null;
  }
  
  return { state, result };
}

export function getTextObjectRange(
  state: VimState,
  type: "i" | "a",
  objectKey: string
): { startLine: number; startCol: number; endLine: number; endCol: number; linewise: boolean } | null {
  const { result } = executeTextObject(state, type, objectKey);
  return result;
}
