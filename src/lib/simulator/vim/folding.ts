import type { VimState, VimBuffer, Fold, CursorPosition } from "../types";

function getActiveBuffer(state: VimState): VimBuffer {
  const buffer = state.buffers.find((b) => b.id === state.activeBufferId);
  if (!buffer) throw new Error("No active buffer");
  return buffer;
}

function updateActiveBuffer(
  state: VimState,
  update: Partial<VimBuffer>
): VimState {
  return {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === state.activeBufferId ? { ...b, ...update } : b
    ),
  };
}

function getLineIndentLevel(line: string, tabstop: number): number {
  let spaces = 0;
  for (const char of line) {
    if (char === " ") {
      spaces++;
    } else if (char === "\t") {
      spaces += tabstop;
    } else {
      break;
    }
  }
  return Math.floor(spaces / tabstop);
}

function calculateIndentFolds(
  content: string[],
  tabstop: number
): Fold[] {
  const folds: Fold[] = [];
  const stack: { startLine: number; level: number }[] = [];

  for (let i = 0; i < content.length; i++) {
    const line = content[i];
    if (line.trim() === "") continue;

    const level = getLineIndentLevel(line, tabstop);

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      const popped = stack.pop()!;
      if (i - 1 > popped.startLine) {
        folds.push({
          startLine: popped.startLine,
          endLine: i - 1,
          collapsed: false,
        });
      }
    }

    stack.push({ startLine: i, level });
  }

  while (stack.length > 0) {
    const popped = stack.pop()!;
    if (content.length - 1 > popped.startLine) {
      folds.push({
        startLine: popped.startLine,
        endLine: content.length - 1,
        collapsed: false,
      });
    }
  }

  return folds.sort((a, b) => a.startLine - b.startLine);
}

function getFoldAtLine(folds: Fold[], line: number): Fold | null {
  for (const fold of folds) {
    if (fold.startLine <= line && fold.endLine >= line) {
      return fold;
    }
  }
  return null;
}

function getFoldsAtLine(folds: Fold[], line: number): Fold[] {
  return folds.filter((f) => f.startLine <= line && f.endLine >= line);
}

function getInnermostFoldAtLine(folds: Fold[], line: number): Fold | null {
  const matchingFolds = getFoldsAtLine(folds, line);
  if (matchingFolds.length === 0) return null;
  return matchingFolds.reduce((smallest, fold) => {
    const smallestSize = smallest.endLine - smallest.startLine;
    const foldSize = fold.endLine - fold.startLine;
    return foldSize < smallestSize ? fold : smallest;
  });
}

export function toggleFold(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  const fold = getInnermostFoldAtLine(buffer.folds, buffer.cursorLine);

  if (!fold) {
    return {
      ...state,
      message: "No fold found",
      messageType: "warning",
    };
  }

  const newFolds = buffer.folds.map((f) =>
    f.startLine === fold.startLine && f.endLine === fold.endLine
      ? { ...f, collapsed: !f.collapsed }
      : f
  );

  return updateActiveBuffer(state, { folds: newFolds });
}

export function openFold(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  const fold = getInnermostFoldAtLine(buffer.folds, buffer.cursorLine);

  if (!fold) {
    return {
      ...state,
      message: "No fold found",
      messageType: "warning",
    };
  }

  if (!fold.collapsed) {
    return state;
  }

  const newFolds = buffer.folds.map((f) =>
    f.startLine === fold.startLine && f.endLine === fold.endLine
      ? { ...f, collapsed: false }
      : f
  );

  return updateActiveBuffer(state, { folds: newFolds });
}

export function closeFold(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  const fold = getInnermostFoldAtLine(buffer.folds, buffer.cursorLine);

  if (!fold) {
    return {
      ...state,
      message: "No fold found",
      messageType: "warning",
    };
  }

  if (fold.collapsed) {
    return state;
  }

  const newFolds = buffer.folds.map((f) =>
    f.startLine === fold.startLine && f.endLine === fold.endLine
      ? { ...f, collapsed: true }
      : f
  );

  let newCursorLine = buffer.cursorLine;
  if (buffer.cursorLine > fold.startLine) {
    newCursorLine = fold.startLine;
  }

  return updateActiveBuffer(state, {
    folds: newFolds,
    cursorLine: newCursorLine,
  });
}

export function openFoldRecursive(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  const matchingFolds = getFoldsAtLine(buffer.folds, buffer.cursorLine);

  if (matchingFolds.length === 0) {
    return {
      ...state,
      message: "No fold found",
      messageType: "warning",
    };
  }

  const foldStartLines = new Set(matchingFolds.map((f) => f.startLine));
  const foldEndLines = new Set(matchingFolds.map((f) => f.endLine));

  const newFolds = buffer.folds.map((f) => {
    if (foldStartLines.has(f.startLine) && foldEndLines.has(f.endLine)) {
      const isSameFold = matchingFolds.some(
        (mf) => mf.startLine === f.startLine && mf.endLine === f.endLine
      );
      if (isSameFold) {
        return { ...f, collapsed: false };
      }
    }
    return f;
  });

  return updateActiveBuffer(state, { folds: newFolds });
}

export function closeFoldRecursive(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  const matchingFolds = getFoldsAtLine(buffer.folds, buffer.cursorLine);

  if (matchingFolds.length === 0) {
    return {
      ...state,
      message: "No fold found",
      messageType: "warning",
    };
  }

  const outermostFold = matchingFolds.reduce((largest, fold) => {
    const largestSize = largest.endLine - largest.startLine;
    const foldSize = fold.endLine - fold.startLine;
    return foldSize > largestSize ? fold : largest;
  });

  const newFolds = buffer.folds.map((f) => {
    if (
      f.startLine >= outermostFold.startLine &&
      f.endLine <= outermostFold.endLine
    ) {
      return { ...f, collapsed: true };
    }
    return f;
  });

  return updateActiveBuffer(state, {
    folds: newFolds,
    cursorLine: outermostFold.startLine,
  });
}

export function openAllFolds(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  const newFolds = buffer.folds.map((f) => ({ ...f, collapsed: false }));
  return updateActiveBuffer(state, { folds: newFolds });
}

export function closeAllFolds(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  const newFolds = buffer.folds.map((f) => ({ ...f, collapsed: true }));

  let newCursorLine = buffer.cursorLine;
  for (const fold of newFolds) {
    if (
      buffer.cursorLine > fold.startLine &&
      buffer.cursorLine <= fold.endLine
    ) {
      newCursorLine = Math.min(newCursorLine, fold.startLine);
    }
  }

  return updateActiveBuffer(state, {
    folds: newFolds,
    cursorLine: newCursorLine,
  });
}

export function increaseFoldLevel(state: VimState): VimState {
  const buffer = getActiveBuffer(state);

  const sortedFolds = [...buffer.folds].sort(
    (a, b) => b.endLine - b.startLine - (a.endLine - a.startLine)
  );

  const newFolds = buffer.folds.map((f) => ({ ...f }));

  for (const fold of sortedFolds) {
    if (!fold.collapsed) {
      const idx = newFolds.findIndex(
        (f) => f.startLine === fold.startLine && f.endLine === fold.endLine
      );
      if (idx !== -1) {
        newFolds[idx].collapsed = true;
        break;
      }
    }
  }

  return updateActiveBuffer(state, { folds: newFolds });
}

export function decreaseFoldLevel(state: VimState): VimState {
  const buffer = getActiveBuffer(state);

  const sortedFolds = [...buffer.folds].sort(
    (a, b) => a.endLine - a.startLine - (b.endLine - b.startLine)
  );

  const newFolds = buffer.folds.map((f) => ({ ...f }));

  for (const fold of sortedFolds) {
    if (fold.collapsed) {
      const idx = newFolds.findIndex(
        (f) => f.startLine === fold.startLine && f.endLine === fold.endLine
      );
      if (idx !== -1) {
        newFolds[idx].collapsed = false;
        break;
      }
    }
  }

  return updateActiveBuffer(state, { folds: newFolds });
}

export function moveToNextFold(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  const currentLine = buffer.cursorLine;

  const sortedFolds = [...buffer.folds].sort(
    (a, b) => a.startLine - b.startLine
  );

  for (const fold of sortedFolds) {
    if (fold.startLine > currentLine) {
      return updateActiveBuffer(state, {
        cursorLine: fold.startLine,
        cursorCol: 0,
      });
    }
  }

  return {
    ...state,
    message: "No more folds",
    messageType: "warning",
  };
}

export function moveToPreviousFold(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  const currentLine = buffer.cursorLine;

  const sortedFolds = [...buffer.folds].sort(
    (a, b) => b.startLine - a.startLine
  );

  for (const fold of sortedFolds) {
    if (fold.startLine < currentLine) {
      return updateActiveBuffer(state, {
        cursorLine: fold.startLine,
        cursorCol: 0,
      });
    }
  }

  return {
    ...state,
    message: "No more folds",
    messageType: "warning",
  };
}

export function moveToFoldStart(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  const fold = getInnermostFoldAtLine(buffer.folds, buffer.cursorLine);

  if (!fold) {
    return {
      ...state,
      message: "Not in a fold",
      messageType: "warning",
    };
  }

  return updateActiveBuffer(state, {
    cursorLine: fold.startLine,
    cursorCol: 0,
  });
}

export function moveToFoldEnd(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  const fold = getInnermostFoldAtLine(buffer.folds, buffer.cursorLine);

  if (!fold) {
    return {
      ...state,
      message: "Not in a fold",
      messageType: "warning",
    };
  }

  return updateActiveBuffer(state, {
    cursorLine: fold.endLine,
    cursorCol: 0,
  });
}

export function createFoldFromLines(
  state: VimState,
  startLine: number,
  endLine: number
): VimState {
  const buffer = getActiveBuffer(state);

  if (startLine >= endLine || startLine < 0 || endLine >= buffer.content.length) {
    return {
      ...state,
      message: "Invalid fold range",
      messageType: "error",
    };
  }

  const existingFold = buffer.folds.find(
    (f) => f.startLine === startLine && f.endLine === endLine
  );

  if (existingFold) {
    return state;
  }

  const newFold: Fold = {
    startLine,
    endLine,
    collapsed: true,
  };

  return updateActiveBuffer(state, {
    folds: [...buffer.folds, newFold].sort((a, b) => a.startLine - b.startLine),
  });
}

export function deleteFold(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  const fold = getInnermostFoldAtLine(buffer.folds, buffer.cursorLine);

  if (!fold) {
    return {
      ...state,
      message: "No fold found",
      messageType: "warning",
    };
  }

  const newFolds = buffer.folds.filter(
    (f) => !(f.startLine === fold.startLine && f.endLine === fold.endLine)
  );

  return updateActiveBuffer(state, { folds: newFolds });
}

export function deleteAllFolds(state: VimState): VimState {
  return updateActiveBuffer(state, { folds: [] });
}

export function regenerateIndentFolds(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  const newFolds = calculateIndentFolds(buffer.content, state.settings.tabstop);
  return updateActiveBuffer(state, { folds: newFolds });
}

export function getFoldIndicator(fold: Fold, content: string[]): string {
  const lineCount = fold.endLine - fold.startLine;
  const firstLineText = content[fold.startLine] || "";
  const preview = firstLineText.trim().substring(0, 40);
  return `+-- ${lineCount} lines: ${preview}...`;
}

export function getVisibleLines(
  content: string[],
  folds: Fold[]
): { lineIndex: number; isFolded: boolean; foldInfo?: Fold }[] {
  const result: { lineIndex: number; isFolded: boolean; foldInfo?: Fold }[] = [];
  const collapsedFolds = folds.filter((f) => f.collapsed);

  let i = 0;
  while (i < content.length) {
    const fold = collapsedFolds.find((f) => f.startLine === i);
    if (fold) {
      result.push({ lineIndex: i, isFolded: true, foldInfo: fold });
      i = fold.endLine + 1;
    } else {
      const isHidden = collapsedFolds.some(
        (f) => i > f.startLine && i <= f.endLine
      );
      if (!isHidden) {
        result.push({ lineIndex: i, isFolded: false });
      }
      i++;
    }
  }

  return result;
}

export function mapVisualLineToActual(
  visualLine: number,
  content: string[],
  folds: Fold[]
): number {
  const visibleLines = getVisibleLines(content, folds);
  if (visualLine >= visibleLines.length) {
    return content.length - 1;
  }
  return visibleLines[visualLine]?.lineIndex ?? 0;
}

export function mapActualLineToVisual(
  actualLine: number,
  content: string[],
  folds: Fold[]
): number {
  const visibleLines = getVisibleLines(content, folds);
  const idx = visibleLines.findIndex((vl) => vl.lineIndex === actualLine);
  if (idx !== -1) return idx;

  for (let i = 0; i < visibleLines.length; i++) {
    const vl = visibleLines[i];
    if (vl.isFolded && vl.foldInfo) {
      if (
        actualLine >= vl.foldInfo.startLine &&
        actualLine <= vl.foldInfo.endLine
      ) {
        return i;
      }
    }
  }

  return 0;
}

export type FoldCommand =
  | "za"
  | "zo"
  | "zc"
  | "zO"
  | "zC"
  | "zR"
  | "zM"
  | "zm"
  | "zr"
  | "zj"
  | "zk"
  | "[z"
  | "]z"
  | "zd"
  | "zD"
  | "zE"
  | "zf";

export function executeFoldCommand(
  state: VimState,
  command: FoldCommand
): VimState {
  switch (command) {
    case "za":
      return toggleFold(state);
    case "zo":
      return openFold(state);
    case "zc":
      return closeFold(state);
    case "zO":
      return openFoldRecursive(state);
    case "zC":
      return closeFoldRecursive(state);
    case "zR":
      return openAllFolds(state);
    case "zM":
      return closeAllFolds(state);
    case "zm":
      return increaseFoldLevel(state);
    case "zr":
      return decreaseFoldLevel(state);
    case "zj":
      return moveToNextFold(state);
    case "zk":
      return moveToPreviousFold(state);
    case "[z":
      return moveToFoldStart(state);
    case "]z":
      return moveToFoldEnd(state);
    case "zd":
      return deleteFold(state);
    case "zD":
      return deleteFold(state);
    case "zE":
      return deleteAllFolds(state);
    case "zf":
      return state;
    default:
      return state;
  }
}

export function handleFoldKey(
  state: VimState,
  key: string,
  pendingKeys: string
): { state: VimState; consumed: boolean; pendingKeys: string } {
  const combined = pendingKeys + key;

  if (combined === "z") {
    return { state, consumed: true, pendingKeys: "z" };
  }

  if (combined === "[" || combined === "]") {
    return { state, consumed: true, pendingKeys: combined };
  }

  if (pendingKeys === "z") {
    const foldCommands = ["a", "o", "c", "O", "C", "R", "M", "m", "r", "j", "k", "d", "D", "E", "f"];
    if (foldCommands.includes(key)) {
      const command = ("z" + key) as FoldCommand;
      return {
        state: executeFoldCommand(state, command),
        consumed: true,
        pendingKeys: "",
      };
    }
    return { state, consumed: false, pendingKeys: "" };
  }

  if (pendingKeys === "[" && key === "z") {
    return {
      state: executeFoldCommand(state, "[z"),
      consumed: true,
      pendingKeys: "",
    };
  }

  if (pendingKeys === "]" && key === "z") {
    return {
      state: executeFoldCommand(state, "]z"),
      consumed: true,
      pendingKeys: "",
    };
  }

  return { state, consumed: false, pendingKeys: "" };
}
