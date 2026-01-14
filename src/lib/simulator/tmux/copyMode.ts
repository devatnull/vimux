import type { TmuxState, TmuxCopyModeState, CursorPosition, SearchDirection } from "../types";

export interface TmuxCopyModeResult {
  state: TmuxState;
  message?: string;
}

interface SearchMatch {
  line: number;
  col: number;
}

function getActivePane(state: TmuxState) {
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  if (!session) return null;
  const window = session.windows.find((w) => w.id === session.activeWindowId);
  if (!window) return null;
  return window.panes.find((p) => p.id === window.activePaneId) || null;
}

function getScrollbackContent(state: TmuxState): string[] {
  const pane = getActivePane(state);
  if (!pane) return [];
  return [...pane.scrollback, ...pane.content];
}

function clampCursor(
  pos: CursorPosition,
  content: string[]
): CursorPosition {
  const line = Math.max(0, Math.min(pos.line, content.length - 1));
  const lineContent = content[line] || "";
  const col = Math.max(0, Math.min(pos.col, Math.max(0, lineContent.length - 1)));
  return { line, col };
}

function getCopyModeCursor(state: TmuxState): CursorPosition {
  const pane = getActivePane(state);
  if (!pane) return { line: 0, col: 0 };
  return { line: pane.cursorY, col: pane.cursorX };
}

function updatePaneCursor(state: TmuxState, pos: CursorPosition): TmuxState {
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  if (!session) return state;
  const window = session.windows.find((w) => w.id === session.activeWindowId);
  if (!window) return state;

  return {
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === session.id
        ? {
            ...s,
            windows: s.windows.map((w) =>
              w.id === window.id
                ? {
                    ...w,
                    panes: w.panes.map((p) =>
                      p.id === window.activePaneId
                        ? { ...p, cursorX: pos.col, cursorY: pos.line }
                        : p
                    ),
                  }
                : w
            ),
          }
        : s
    ),
  };
}

export function enterCopyMode(state: TmuxState): TmuxCopyModeResult {
  const newCopyMode: TmuxCopyModeState = {
    enabled: true,
    selectionStart: null,
    selectionEnd: null,
    rectangleSelect: false,
    searchPattern: null,
    searchDirection: "forward",
  };

  return {
    state: {
      ...state,
      copyMode: newCopyMode,
      message: "COPY",
      messageType: "info",
    },
    message: "COPY",
  };
}

export function exitCopyMode(state: TmuxState): TmuxCopyModeResult {
  const newCopyMode: TmuxCopyModeState = {
    enabled: false,
    selectionStart: null,
    selectionEnd: null,
    rectangleSelect: false,
    searchPattern: null,
    searchDirection: "forward",
  };

  return {
    state: {
      ...state,
      copyMode: newCopyMode,
      message: null,
      messageType: null,
    },
  };
}

export function moveCursor(
  state: TmuxState,
  motion: string,
  count: number = 1
): TmuxCopyModeResult {
  if (!state.copyMode.enabled) {
    return { state };
  }

  const content = getScrollbackContent(state);
  if (content.length === 0) {
    return { state };
  }

  let cursor = getCopyModeCursor(state);
  const lineContent = content[cursor.line] || "";

  for (let i = 0; i < count; i++) {
    switch (motion) {
      case "h":
        cursor = { ...cursor, col: Math.max(0, cursor.col - 1) };
        break;
      case "j":
        cursor = {
          line: Math.min(content.length - 1, cursor.line + 1),
          col: cursor.col,
        };
        break;
      case "k":
        cursor = {
          line: Math.max(0, cursor.line - 1),
          col: cursor.col,
        };
        break;
      case "l":
        cursor = {
          ...cursor,
          col: Math.min((content[cursor.line] || "").length - 1, cursor.col + 1),
        };
        break;
      case "w":
        cursor = moveWordForward(content, cursor);
        break;
      case "b":
        cursor = moveWordBackward(content, cursor);
        break;
      case "e":
        cursor = moveWordEnd(content, cursor);
        break;
      case "0":
        cursor = { ...cursor, col: 0 };
        break;
      case "$":
        cursor = { ...cursor, col: Math.max(0, (content[cursor.line] || "").length - 1) };
        break;
      case "^":
        cursor = moveFirstNonBlank(content, cursor);
        break;
      case "gg":
        cursor = { line: 0, col: 0 };
        break;
      case "G":
        cursor = { line: content.length - 1, col: 0 };
        break;
      case "{":
        cursor = moveParagraphBackward(content, cursor);
        break;
      case "}":
        cursor = moveParagraphForward(content, cursor);
        break;
      case "H":
        cursor = { line: 0, col: cursor.col };
        break;
      case "M":
        cursor = { line: Math.floor(content.length / 2), col: cursor.col };
        break;
      case "L":
        cursor = { line: content.length - 1, col: cursor.col };
        break;
    }
  }

  cursor = clampCursor(cursor, content);

  let newState = updatePaneCursor(state, cursor);

  if (state.copyMode.selectionStart) {
    newState = {
      ...newState,
      copyMode: {
        ...newState.copyMode,
        selectionEnd: cursor,
      },
    };
  }

  return { state: newState };
}

function isWordChar(char: string): boolean {
  return /[a-zA-Z0-9_]/.test(char);
}

function moveWordForward(content: string[], cursor: CursorPosition): CursorPosition {
  let { line, col } = cursor;
  const lineContent = content[line] || "";

  if (col < lineContent.length && isWordChar(lineContent[col])) {
    while (col < lineContent.length && isWordChar(lineContent[col])) {
      col++;
    }
  } else if (col < lineContent.length) {
    while (col < lineContent.length && !isWordChar(lineContent[col]) && lineContent[col] !== " ") {
      col++;
    }
  }

  while (col < lineContent.length && lineContent[col] === " ") {
    col++;
  }

  if (col >= lineContent.length && line < content.length - 1) {
    line++;
    col = 0;
    const newLineContent = content[line] || "";
    while (col < newLineContent.length && newLineContent[col] === " ") {
      col++;
    }
  }

  return { line, col };
}

function moveWordBackward(content: string[], cursor: CursorPosition): CursorPosition {
  let { line, col } = cursor;

  if (col === 0 && line > 0) {
    line--;
    col = (content[line] || "").length - 1;
  } else {
    col--;
  }

  const lineContent = content[line] || "";

  while (col >= 0 && lineContent[col] === " ") {
    col--;
  }

  if (col < 0 && line > 0) {
    line--;
    col = (content[line] || "").length - 1;
    const newLineContent = content[line] || "";
    while (col >= 0 && newLineContent[col] === " ") {
      col--;
    }
  }

  const currentLineContent = content[line] || "";
  if (isWordChar(currentLineContent[col])) {
    while (col > 0 && isWordChar(currentLineContent[col - 1])) {
      col--;
    }
  } else {
    while (col > 0 && !isWordChar(currentLineContent[col - 1]) && currentLineContent[col - 1] !== " ") {
      col--;
    }
  }

  return { line, col: Math.max(0, col) };
}

function moveWordEnd(content: string[], cursor: CursorPosition): CursorPosition {
  let { line, col } = cursor;
  const lineContent = content[line] || "";

  col++;

  while (col < lineContent.length && lineContent[col] === " ") {
    col++;
  }

  if (col >= lineContent.length && line < content.length - 1) {
    line++;
    col = 0;
    const newLineContent = content[line] || "";
    while (col < newLineContent.length && newLineContent[col] === " ") {
      col++;
    }
  }

  const currentLineContent = content[line] || "";
  if (isWordChar(currentLineContent[col])) {
    while (col < currentLineContent.length - 1 && isWordChar(currentLineContent[col + 1])) {
      col++;
    }
  } else {
    while (col < currentLineContent.length - 1 && !isWordChar(currentLineContent[col + 1]) && currentLineContent[col + 1] !== " ") {
      col++;
    }
  }

  return { line, col };
}

function moveFirstNonBlank(content: string[], cursor: CursorPosition): CursorPosition {
  const lineContent = content[cursor.line] || "";
  let col = 0;
  while (col < lineContent.length && (lineContent[col] === " " || lineContent[col] === "\t")) {
    col++;
  }
  return { line: cursor.line, col };
}

function moveParagraphBackward(content: string[], cursor: CursorPosition): CursorPosition {
  let line = cursor.line;

  while (line > 0 && (content[line] || "").trim() !== "") {
    line--;
  }

  while (line > 0 && (content[line] || "").trim() === "") {
    line--;
  }

  while (line > 0 && (content[line - 1] || "").trim() !== "") {
    line--;
  }

  return { line, col: 0 };
}

function moveParagraphForward(content: string[], cursor: CursorPosition): CursorPosition {
  let line = cursor.line;

  while (line < content.length - 1 && (content[line] || "").trim() !== "") {
    line++;
  }

  while (line < content.length - 1 && (content[line] || "").trim() === "") {
    line++;
  }

  return { line, col: 0 };
}

export function startSelection(
  state: TmuxState,
  mode: "char" | "line" | "block"
): TmuxCopyModeResult {
  if (!state.copyMode.enabled) {
    return { state };
  }

  const cursor = getCopyModeCursor(state);

  return {
    state: {
      ...state,
      copyMode: {
        ...state.copyMode,
        selectionStart: cursor,
        selectionEnd: cursor,
        rectangleSelect: mode === "block",
      },
    },
    message: mode === "block" ? "Rectangle selection started" : "Selection started",
  };
}

export function yankSelection(state: TmuxState): TmuxCopyModeResult {
  if (!state.copyMode.enabled || !state.copyMode.selectionStart || !state.copyMode.selectionEnd) {
    return exitCopyMode(state);
  }

  const content = getScrollbackContent(state);
  const start = state.copyMode.selectionStart;
  const end = state.copyMode.selectionEnd;

  const startLine = Math.min(start.line, end.line);
  const endLine = Math.max(start.line, end.line);
  const startCol = start.line <= end.line ? start.col : end.col;
  const endCol = start.line <= end.line ? end.col : start.col;

  let yankedText: string;

  if (state.copyMode.rectangleSelect) {
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      const line = content[i] || "";
      lines.push(line.substring(minCol, maxCol + 1));
    }
    yankedText = lines.join("\n");
  } else if (startLine === endLine) {
    const line = content[startLine] || "";
    const actualStartCol = Math.min(startCol, endCol);
    const actualEndCol = Math.max(startCol, endCol);
    yankedText = line.substring(actualStartCol, actualEndCol + 1);
  } else {
    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      const line = content[i] || "";
      if (i === startLine) {
        lines.push(start.line <= end.line ? line.substring(start.col) : line.substring(end.col));
      } else if (i === endLine) {
        lines.push(start.line <= end.line ? line.substring(0, end.col + 1) : line.substring(0, start.col + 1));
      } else {
        lines.push(line);
      }
    }
    yankedText = lines.join("\n");
  }

  const newPasteBuffer = [yankedText, ...state.pasteBuffer];

  const exitResult = exitCopyMode(state);

  return {
    state: {
      ...exitResult.state,
      pasteBuffer: newPasteBuffer,
      pasteBufferIndex: 0,
    },
    message: `Copied ${yankedText.length} characters`,
  };
}

export function cancelCopyMode(state: TmuxState): TmuxCopyModeResult {
  return exitCopyMode(state);
}

export function searchInScrollback(
  state: TmuxState,
  pattern: string,
  direction: SearchDirection
): TmuxCopyModeResult {
  if (!state.copyMode.enabled) {
    return { state };
  }

  if (!pattern) {
    return {
      state: {
        ...state,
        copyMode: {
          ...state.copyMode,
          searchPattern: null,
        },
      },
    };
  }

  const content = getScrollbackContent(state);
  const cursor = getCopyModeCursor(state);
  const matches = findAllMatches(content, pattern);

  if (matches.length === 0) {
    return {
      state: {
        ...state,
        copyMode: {
          ...state.copyMode,
          searchPattern: pattern,
          searchDirection: direction,
        },
        message: `Pattern not found: ${pattern}`,
        messageType: "error",
      },
      message: `Pattern not found: ${pattern}`,
    };
  }

  const nextMatch = findNextMatch(matches, cursor, direction);

  if (nextMatch) {
    const newState = updatePaneCursor(state, nextMatch);
    return {
      state: {
        ...newState,
        copyMode: {
          ...newState.copyMode,
          searchPattern: pattern,
          searchDirection: direction,
        },
        message: `[${matches.indexOf(nextMatch) + 1}/${matches.length}]`,
        messageType: "info",
      },
      message: `Found match ${matches.indexOf(nextMatch) + 1} of ${matches.length}`,
    };
  }

  return {
    state: {
      ...state,
      copyMode: {
        ...state.copyMode,
        searchPattern: pattern,
        searchDirection: direction,
      },
    },
  };
}

export function navigateSearchMatch(
  state: TmuxState,
  direction: SearchDirection
): TmuxCopyModeResult {
  if (!state.copyMode.enabled || !state.copyMode.searchPattern) {
    return { state };
  }

  const content = getScrollbackContent(state);
  const cursor = getCopyModeCursor(state);
  const matches = findAllMatches(content, state.copyMode.searchPattern);

  if (matches.length === 0) {
    return {
      state: {
        ...state,
        message: `Pattern not found: ${state.copyMode.searchPattern}`,
        messageType: "error",
      },
      message: `Pattern not found: ${state.copyMode.searchPattern}`,
    };
  }

  const nextMatch = findNextMatch(matches, cursor, direction);

  if (nextMatch) {
    let newState = updatePaneCursor(state, nextMatch);

    if (state.copyMode.selectionStart) {
      newState = {
        ...newState,
        copyMode: {
          ...newState.copyMode,
          selectionEnd: nextMatch,
        },
      };
    }

    return {
      state: {
        ...newState,
        message: `[${matches.indexOf(nextMatch) + 1}/${matches.length}]`,
        messageType: "info",
      },
      message: `Match ${matches.indexOf(nextMatch) + 1} of ${matches.length}`,
    };
  }

  return { state };
}

function findAllMatches(content: string[], pattern: string): SearchMatch[] {
  const matches: SearchMatch[] = [];

  try {
    const regex = new RegExp(pattern, "gi");

    for (let line = 0; line < content.length; line++) {
      const lineContent = content[line] || "";
      let match: RegExpExecArray | null;

      regex.lastIndex = 0;
      while ((match = regex.exec(lineContent)) !== null) {
        matches.push({ line, col: match.index });
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    }
  } catch {
    for (let line = 0; line < content.length; line++) {
      const lineContent = content[line] || "";
      let index = 0;
      while ((index = lineContent.toLowerCase().indexOf(pattern.toLowerCase(), index)) !== -1) {
        matches.push({ line, col: index });
        index++;
      }
    }
  }

  return matches;
}

function findNextMatch(
  matches: SearchMatch[],
  cursor: CursorPosition,
  direction: SearchDirection
): SearchMatch | null {
  if (matches.length === 0) return null;

  if (direction === "forward") {
    for (const match of matches) {
      if (
        match.line > cursor.line ||
        (match.line === cursor.line && match.col > cursor.col)
      ) {
        return match;
      }
    }
    return matches[0];
  } else {
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      if (
        match.line < cursor.line ||
        (match.line === cursor.line && match.col < cursor.col)
      ) {
        return match;
      }
    }
    return matches[matches.length - 1];
  }
}
