import type {
  VimBuffer,
  VimState,
  CursorPosition,
  SearchState,
  SearchDirection,
} from "../types";
import { getActiveBuffer as getActiveBufferMaybe } from "./motions";

export interface SearchResult {
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

function updateActiveBuffer(state: VimState, buffer: VimBuffer): VimState {
  return {
    ...state,
    buffers: state.buffers.map((b) => (b.id === buffer.id ? buffer : b)),
  };
}

/**
 * Enter search mode with / or ?
 */
export function enterSearchMode(
  state: VimState,
  direction: SearchDirection
): SearchResult {
  const buffer = getActiveBuffer(state);
  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "search",
  };

  const searchState: SearchState = {
    pattern: "",
    direction,
    matches: [],
    currentMatchIndex: -1,
    highlightEnabled: state.settings.hlsearch,
    incrementalMatch: undefined,
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    searchState,
    searchHistoryIndex: -1,
  };

  return {
    state: newState,
    action: direction === "forward" ? "enter-search-forward" : "enter-search-backward",
  };
}

/**
 * Exit search mode without confirming
 */
export function exitSearchMode(state: VimState): SearchResult {
  const buffer = getActiveBuffer(state);
  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    searchState: null,
  };

  return { state: newState, action: "exit-search-mode" };
}

/**
 * Find all matches for a pattern in the buffer
 */
export function findAllMatches(
  buffer: VimBuffer,
  pattern: string,
  ignoreCase: boolean,
  smartCase: boolean
): CursorPosition[] {
  if (!pattern) return [];

  const matches: CursorPosition[] = [];

  // Determine case sensitivity based on smartcase
  let useIgnoreCase = ignoreCase;
  if (smartCase && /[A-Z]/.test(pattern)) {
    useIgnoreCase = false;
  }

  let regex: RegExp;
  try {
    const flags = useIgnoreCase ? "gi" : "g";
    regex = new RegExp(pattern, flags);
  } catch {
    // Invalid regex, treat as literal
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flags = useIgnoreCase ? "gi" : "g";
    regex = new RegExp(escaped, flags);
  }

  for (let line = 0; line < buffer.content.length; line++) {
    const lineContent = buffer.content[line];
    let match: RegExpExecArray | null;

    // Reset lastIndex for each line
    regex.lastIndex = 0;

    while ((match = regex.exec(lineContent)) !== null) {
      matches.push({ line, col: match.index });
      // Prevent infinite loop on zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  }

  return matches;
}

/**
 * Find the next match from a given position
 */
export function findNextMatch(
  matches: CursorPosition[],
  currentPos: CursorPosition,
  direction: SearchDirection,
  wrap: boolean
): { index: number; wrapped: boolean } {
  if (matches.length === 0) {
    return { index: -1, wrapped: false };
  }

  if (direction === "forward") {
    // Find first match after current position
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      if (
        match.line > currentPos.line ||
        (match.line === currentPos.line && match.col > currentPos.col)
      ) {
        return { index: i, wrapped: false };
      }
    }
    // Wrap to beginning
    if (wrap && matches.length > 0) {
      return { index: 0, wrapped: true };
    }
  } else {
    // Find last match before current position
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      if (
        match.line < currentPos.line ||
        (match.line === currentPos.line && match.col < currentPos.col)
      ) {
        return { index: i, wrapped: false };
      }
    }
    // Wrap to end
    if (wrap && matches.length > 0) {
      return { index: matches.length - 1, wrapped: true };
    }
  }

  return { index: -1, wrapped: false };
}

/**
 * Update search pattern and find matches incrementally
 */
export function updateSearchPattern(
  state: VimState,
  pattern: string
): SearchResult {
  const buffer = getActiveBuffer(state);

  if (!state.searchState) {
    return { state };
  }

  const matches = findAllMatches(
    buffer,
    pattern,
    state.settings.ignorecase,
    state.settings.smartcase
  );

  let incrementalMatch: CursorPosition | undefined;
  let cursorUpdate = false;

  // For incremental search, find and jump to first match
  if (state.settings.incsearch && pattern && matches.length > 0) {
    const { index } = findNextMatch(
      matches,
      { line: buffer.cursorLine, col: buffer.cursorCol },
      state.searchState.direction,
      true
    );
    if (index >= 0) {
      incrementalMatch = matches[index];
      cursorUpdate = true;
    }
  }

  const newSearchState: SearchState = {
    ...state.searchState,
    pattern,
    matches,
    currentMatchIndex: incrementalMatch
      ? matches.findIndex(
          (m) =>
            m.line === incrementalMatch!.line && m.col === incrementalMatch!.col
        )
      : -1,
    incrementalMatch,
  };

  let updatedBuffer = buffer;
  if (cursorUpdate && incrementalMatch) {
    updatedBuffer = {
      ...buffer,
      cursorLine: incrementalMatch.line,
      cursorCol: incrementalMatch.col,
    };
  }

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    searchState: newSearchState,
  };

  return { state: newState };
}

/**
 * Confirm search and exit search mode
 */
export function confirmSearch(state: VimState): SearchResult {
  const buffer = getActiveBuffer(state);

  if (!state.searchState || !state.searchState.pattern) {
    return exitSearchMode(state);
  }

  const { pattern, direction, matches, currentMatchIndex } = state.searchState;

  // Add to search history
  let newHistory = state.searchHistory;
  if (pattern && newHistory[newHistory.length - 1] !== pattern) {
    newHistory = [...newHistory, pattern];
    if (newHistory.length > 100) {
      newHistory = newHistory.slice(-100);
    }
  }

  let finalPos: CursorPosition | null = null;
  let wrapped = false;

  if (matches.length > 0) {
    if (currentMatchIndex >= 0 && currentMatchIndex < matches.length) {
      finalPos = matches[currentMatchIndex];
    } else {
      // Find match from cursor position
      const result = findNextMatch(
        matches,
        { line: buffer.cursorLine, col: buffer.cursorCol },
        direction,
        true
      );
      if (result.index >= 0) {
        finalPos = matches[result.index];
        wrapped = result.wrapped;
      }
    }
  }

  const updatedBuffer: VimBuffer = {
    ...buffer,
    mode: "normal",
    cursorLine: finalPos ? finalPos.line : buffer.cursorLine,
    cursorCol: finalPos ? finalPos.col : buffer.cursorCol,
  };

  let message: string | null = null;
  let messageType: "info" | "error" | "warning" | null = null;

  if (matches.length === 0) {
    message = `Pattern not found: ${pattern}`;
    messageType = "error";
  } else if (wrapped) {
    message =
      direction === "forward"
        ? "search hit BOTTOM, continuing at TOP"
        : "search hit TOP, continuing at BOTTOM";
    messageType = "warning";
  }

  // Keep search state for highlighting but clear incremental match
  const persistedSearchState: SearchState = {
    pattern,
    direction,
    matches,
    currentMatchIndex: finalPos
      ? matches.findIndex(
          (m) => m.line === finalPos!.line && m.col === finalPos!.col
        )
      : -1,
    highlightEnabled: state.settings.hlsearch,
    incrementalMatch: undefined,
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    searchState: persistedSearchState,
    searchHistory: newHistory,
    searchHistoryIndex: -1,
    lastSearchPattern: pattern,
    lastSearchDirection: direction,
    searchRegister: pattern,
    message,
    messageType,
  };

  return { state: newState, action: "confirm-search" };
}

/**
 * Navigate search history
 */
export function navigateSearchHistory(
  state: VimState,
  direction: "up" | "down"
): SearchResult {
  if (!state.searchState) {
    return { state };
  }

  const history = state.searchHistory;
  if (history.length === 0) {
    return { state };
  }

  let newIndex = state.searchHistoryIndex;

  if (direction === "up") {
    if (newIndex === -1) {
      newIndex = history.length - 1;
    } else if (newIndex > 0) {
      newIndex--;
    }
  } else {
    if (newIndex === -1) {
      return { state };
    }
    if (newIndex < history.length - 1) {
      newIndex++;
    } else {
      newIndex = -1;
    }
  }

  const newPattern = newIndex === -1 ? "" : history[newIndex];

  // Update pattern and matches
  const buffer = getActiveBuffer(state);
  const matches = findAllMatches(
    buffer,
    newPattern,
    state.settings.ignorecase,
    state.settings.smartcase
  );

  const newSearchState: SearchState = {
    ...state.searchState,
    pattern: newPattern,
    matches,
    currentMatchIndex: -1,
    incrementalMatch: undefined,
  };

  const newState: VimState = {
    ...state,
    searchState: newSearchState,
    searchHistoryIndex: newIndex,
  };

  return { state: newState };
}

/**
 * Handle key input in search mode
 */
export function handleSearchModeKey(
  state: VimState,
  key: string
): SearchResult {
  if (key === "Escape") {
    // Restore cursor position if we moved during incremental search
    const buffer = getActiveBuffer(state);
    const updatedBuffer: VimBuffer = {
      ...buffer,
      mode: "normal",
    };

    const newState: VimState = {
      ...updateActiveBuffer(state, updatedBuffer),
      searchState: null,
    };

    return { state: newState, action: "cancel-search" };
  }

  if (key === "Enter") {
    return confirmSearch(state);
  }

  if (key === "Backspace") {
    if (!state.searchState || state.searchState.pattern.length === 0) {
      return exitSearchMode(state);
    }
    const newPattern = state.searchState.pattern.slice(0, -1);
    return updateSearchPattern(state, newPattern);
  }

  if (key === "ArrowUp") {
    return navigateSearchHistory(state, "up");
  }

  if (key === "ArrowDown") {
    return navigateSearchHistory(state, "down");
  }

  // Ctrl-n/Ctrl-p for history navigation
  if (key === "C-n" || key === "<C-n>") {
    return navigateSearchHistory(state, "down");
  }

  if (key === "C-p" || key === "<C-p>") {
    return navigateSearchHistory(state, "up");
  }

  // Regular character input
  if (key.length === 1) {
    const newPattern = (state.searchState?.pattern || "") + key;
    return updateSearchPattern(state, newPattern);
  }

  return { state };
}

/**
 * Move to next search match (n command)
 */
export function searchNext(state: VimState, count: number = 1): SearchResult {
  const buffer = getActiveBuffer(state);
  const pattern = state.lastSearchPattern;
  const direction = state.lastSearchDirection;

  if (!pattern) {
    return {
      state: {
        ...state,
        message: "No previous search pattern",
        messageType: "error",
      },
    };
  }

  const matches = findAllMatches(
    buffer,
    pattern,
    state.settings.ignorecase,
    state.settings.smartcase
  );

  if (matches.length === 0) {
    return {
      state: {
        ...state,
        message: `Pattern not found: ${pattern}`,
        messageType: "error",
      },
    };
  }

  let currentPos: CursorPosition = {
    line: buffer.cursorLine,
    col: buffer.cursorCol,
  };
  let finalPos: CursorPosition | null = null;
  let wrapped = false;

  for (let i = 0; i < count; i++) {
    const result = findNextMatch(matches, currentPos, direction, true);
    if (result.index >= 0) {
      finalPos = matches[result.index];
      if (result.wrapped) wrapped = true;
      currentPos = finalPos;
    } else {
      break;
    }
  }

  if (!finalPos) {
    return {
      state: {
        ...state,
        message: `Pattern not found: ${pattern}`,
        messageType: "error",
      },
    };
  }

  const updatedBuffer: VimBuffer = {
    ...buffer,
    cursorLine: finalPos.line,
    cursorCol: finalPos.col,
  };

  let message: string | null = null;
  let messageType: "info" | "error" | "warning" | null = null;

  if (wrapped) {
    message =
      direction === "forward"
        ? "search hit BOTTOM, continuing at TOP"
        : "search hit TOP, continuing at BOTTOM";
    messageType = "warning";
  }

  const newSearchState: SearchState = {
    pattern,
    direction,
    matches,
    currentMatchIndex: matches.findIndex(
      (m) => m.line === finalPos!.line && m.col === finalPos!.col
    ),
    highlightEnabled: state.settings.hlsearch,
    incrementalMatch: undefined,
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    searchState: newSearchState,
    message,
    messageType,
  };

  return { state: newState, action: "search-next" };
}

/**
 * Move to previous search match (N command)
 */
export function searchPrev(state: VimState, count: number = 1): SearchResult {
  const buffer = getActiveBuffer(state);
  const pattern = state.lastSearchPattern;
  const direction = state.lastSearchDirection;

  if (!pattern) {
    return {
      state: {
        ...state,
        message: "No previous search pattern",
        messageType: "error",
      },
    };
  }

  // Reverse the direction for N
  const reversedDirection: SearchDirection =
    direction === "forward" ? "backward" : "forward";

  const matches = findAllMatches(
    buffer,
    pattern,
    state.settings.ignorecase,
    state.settings.smartcase
  );

  if (matches.length === 0) {
    return {
      state: {
        ...state,
        message: `Pattern not found: ${pattern}`,
        messageType: "error",
      },
    };
  }

  let currentPos: CursorPosition = {
    line: buffer.cursorLine,
    col: buffer.cursorCol,
  };
  let finalPos: CursorPosition | null = null;
  let wrapped = false;

  for (let i = 0; i < count; i++) {
    const result = findNextMatch(matches, currentPos, reversedDirection, true);
    if (result.index >= 0) {
      finalPos = matches[result.index];
      if (result.wrapped) wrapped = true;
      currentPos = finalPos;
    } else {
      break;
    }
  }

  if (!finalPos) {
    return {
      state: {
        ...state,
        message: `Pattern not found: ${pattern}`,
        messageType: "error",
      },
    };
  }

  const updatedBuffer: VimBuffer = {
    ...buffer,
    cursorLine: finalPos.line,
    cursorCol: finalPos.col,
  };

  let message: string | null = null;
  let messageType: "info" | "error" | "warning" | null = null;

  if (wrapped) {
    message =
      reversedDirection === "forward"
        ? "search hit BOTTOM, continuing at TOP"
        : "search hit TOP, continuing at BOTTOM";
    messageType = "warning";
  }

  const newSearchState: SearchState = {
    pattern,
    direction,
    matches,
    currentMatchIndex: matches.findIndex(
      (m) => m.line === finalPos!.line && m.col === finalPos!.col
    ),
    highlightEnabled: state.settings.hlsearch,
    incrementalMatch: undefined,
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    searchState: newSearchState,
    message,
    messageType,
  };

  return { state: newState, action: "search-prev" };
}

/**
 * Search for word under cursor (* command)
 */
export function searchWordUnderCursor(
  state: VimState,
  direction: SearchDirection,
  wholeWord: boolean = true
): SearchResult {
  const buffer = getActiveBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  const col = buffer.cursorCol;

  // Find word boundaries
  let wordStart = col;
  let wordEnd = col;

  const isWordChar = (c: string) =>
    c !== undefined && /[a-zA-Z0-9_]/.test(c);

  if (!isWordChar(line[col])) {
    return {
      state: {
        ...state,
        message: "No word under cursor",
        messageType: "error",
      },
    };
  }

  while (wordStart > 0 && isWordChar(line[wordStart - 1])) {
    wordStart--;
  }
  while (wordEnd < line.length && isWordChar(line[wordEnd])) {
    wordEnd++;
  }

  const word = line.substring(wordStart, wordEnd);
  const pattern = wholeWord ? `\\b${word}\\b` : word;

  // Add to search history
  let newHistory = state.searchHistory;
  if (pattern && newHistory[newHistory.length - 1] !== pattern) {
    newHistory = [...newHistory, pattern];
    if (newHistory.length > 100) {
      newHistory = newHistory.slice(-100);
    }
  }

  const matches = findAllMatches(
    buffer,
    pattern,
    state.settings.ignorecase,
    state.settings.smartcase
  );

  if (matches.length === 0) {
    return {
      state: {
        ...state,
        message: `Pattern not found: ${pattern}`,
        messageType: "error",
        lastSearchPattern: pattern,
        lastSearchDirection: direction,
        searchRegister: pattern,
      },
    };
  }

  // Find next match from current position (must be different position)
  let currentPos: CursorPosition = {
    line: buffer.cursorLine,
    col: buffer.cursorCol,
  };

  // Start search from end of current word for * (forward)
  // or from start of current word for # (backward)
  if (direction === "forward") {
    currentPos = { line: buffer.cursorLine, col: wordEnd };
  } else {
    currentPos = { line: buffer.cursorLine, col: wordStart - 1 };
  }

  const result = findNextMatch(matches, currentPos, direction, true);

  let finalPos: CursorPosition;
  let wrapped = false;

  if (result.index >= 0) {
    finalPos = matches[result.index];
    wrapped = result.wrapped;
  } else {
    // Fall back to first/last match
    finalPos = direction === "forward" ? matches[0] : matches[matches.length - 1];
    wrapped = true;
  }

  const updatedBuffer: VimBuffer = {
    ...buffer,
    cursorLine: finalPos.line,
    cursorCol: finalPos.col,
  };

  let message: string | null = null;
  let messageType: "info" | "error" | "warning" | null = null;

  if (wrapped) {
    message =
      direction === "forward"
        ? "search hit BOTTOM, continuing at TOP"
        : "search hit TOP, continuing at BOTTOM";
    messageType = "warning";
  }

  const newSearchState: SearchState = {
    pattern,
    direction,
    matches,
    currentMatchIndex: matches.findIndex(
      (m) => m.line === finalPos.line && m.col === finalPos.col
    ),
    highlightEnabled: state.settings.hlsearch,
    incrementalMatch: undefined,
  };

  const newState: VimState = {
    ...updateActiveBuffer(state, updatedBuffer),
    searchState: newSearchState,
    searchHistory: newHistory,
    lastSearchPattern: pattern,
    lastSearchDirection: direction,
    searchRegister: pattern,
    message,
    messageType,
  };

  return { state: newState, action: direction === "forward" ? "search-star" : "search-hash" };
}

/**
 * Clear search highlighting (:noh)
 */
export function clearSearchHighlight(state: VimState): SearchResult {
  if (!state.searchState) {
    return { state };
  }

  const newSearchState: SearchState = {
    ...state.searchState,
    highlightEnabled: false,
  };

  const newState: VimState = {
    ...state,
    searchState: newSearchState,
    message: null,
    messageType: null,
  };

  return { state: newState, action: "clear-search-highlight" };
}

/**
 * Get matches for rendering (used by UI components)
 */
export function getSearchMatches(state: VimState): CursorPosition[] {
  if (!state.searchState || !state.searchState.highlightEnabled) {
    return [];
  }
  return state.searchState.matches;
}

/**
 * Get current match index for highlighting (different color)
 */
export function getCurrentMatchIndex(state: VimState): number {
  if (!state.searchState) {
    return -1;
  }
  return state.searchState.currentMatchIndex;
}
