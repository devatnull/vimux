import { describe, it, expect } from "vitest";
import type { VimBuffer, VimState } from "../types";
import {
  motionH,
  motionJ,
  motionK,
  motionL,
  motion0,
  motionDollar,
  motionGG,
  motionG,
  motionW,
  motionB,
  motionE,
  motionCaret,
  executeMotion,
  applyMotion,
} from "../vim/motions";

function createTestBuffer(content: string[], cursorLine = 0, cursorCol = 0): VimBuffer {
  return {
    id: "test-buffer",
    filename: "test.txt",
    content,
    cursorLine,
    cursorCol,
    mode: "normal",
    modified: false,
    readonly: false,
    marks: {},
    folds: [],
    syntaxHighlighting: false,
    undoStack: [],
    redoStack: [],
    changelistPosition: -1,
  };
}

function createTestState(buffer: VimBuffer): VimState {
  return {
    buffers: [buffer],
    activeBufferId: buffer.id,
    commandLine: "",
    commandLineHistory: [],
    commandLineHistoryIndex: -1,
    searchHistory: [],
    searchHistoryIndex: -1,
    pendingOperator: null,
    pendingCount: null,
    pendingRegister: null,
    operatorCount: null,
    lastCommand: null,
    lastOperatorMotion: null,
    lastInsertedText: null,
    searchState: null,
    lastSearchPattern: null,
    lastSearchDirection: "forward",
    visualSelection: null,
    lastVisualSelection: null,
    globalMarks: {},
    namedRegisters: {},
    numberedRegisters: [],
    unnamedRegister: null,
    smallDeleteRegister: null,
    lastInsertRegister: null,
    lastCommandRegister: null,
    expressionRegister: null,
    searchRegister: null,
    readOnlyRegisters: {
      filename: null,
      alternateFilename: null,
      lastInsertedText: null,
      lastCommandLine: null,
      currentWord: null,
      currentWORD: null,
    },
    clipboardRegister: null,
    selectionRegister: null,
    blackHoleRegister: false,
    recordingMacro: null,
    macros: {},
    lastPlayedMacro: null,
    jumplist: [],
    jumplistPosition: -1,
    changelist: [],
    changelistPosition: -1,
    lastFindMotion: null,
    message: null,
    messageType: null,
    insertModeStartCol: null,
    leaderActive: false,
    leaderKeySequence: [],
    leaderTimeoutAt: null,
    settings: {
      number: true,
      relativenumber: false,
      wrap: true,
      expandtab: true,
      tabstop: 4,
      shiftwidth: 4,
      autoindent: true,
      smartindent: true,
      ignorecase: false,
      smartcase: true,
      incsearch: true,
      hlsearch: true,
      cursorline: true,
      scrolloff: 5,
      sidescrolloff: 5,
      showmode: true,
      showcmd: true,
      ruler: true,
      laststatus: 2,
      clipboard: "",
    },
  };
}

describe("Basic cursor motions (h/j/k/l)", () => {
  it("motionH moves cursor left", () => {
    const buffer = createTestBuffer(["hello world"], 0, 5);
    const result = motionH(buffer, 1);
    expect(result.col).toBe(4);
    expect(result.line).toBe(0);
  });

  it("motionH does not move past column 0", () => {
    const buffer = createTestBuffer(["hello"], 0, 2);
    const result = motionH(buffer, 5);
    expect(result.col).toBe(0);
  });

  it("motionJ moves cursor down", () => {
    const buffer = createTestBuffer(["line 1", "line 2", "line 3"], 0, 0);
    const result = motionJ(buffer, 1);
    expect(result.line).toBe(1);
  });

  it("motionJ does not move past last line", () => {
    const buffer = createTestBuffer(["line 1", "line 2"], 1, 0);
    const result = motionJ(buffer, 5);
    expect(result.line).toBe(1);
  });

  it("motionK moves cursor up", () => {
    const buffer = createTestBuffer(["line 1", "line 2", "line 3"], 2, 0);
    const result = motionK(buffer, 1);
    expect(result.line).toBe(1);
  });

  it("motionK does not move past line 0", () => {
    const buffer = createTestBuffer(["line 1", "line 2"], 0, 0);
    const result = motionK(buffer, 5);
    expect(result.line).toBe(0);
  });

  it("motionL moves cursor right", () => {
    const buffer = createTestBuffer(["hello"], 0, 2);
    const result = motionL(buffer, 1);
    expect(result.col).toBe(3);
  });

  it("motionL does not move past end of line", () => {
    const buffer = createTestBuffer(["hello"], 0, 3);
    const result = motionL(buffer, 5);
    expect(result.col).toBe(4);
  });
});

describe("Word motions (w/b/e)", () => {
  it("motionW moves to next word start", () => {
    const buffer = createTestBuffer(["hello world test"], 0, 0);
    const result = motionW(buffer, 1);
    expect(result.col).toBe(6);
  });

  it("motionW with count moves multiple words", () => {
    const buffer = createTestBuffer(["one two three four"], 0, 0);
    const result = motionW(buffer, 2);
    expect(result.col).toBe(8);
  });

  it("motionB moves to previous word start", () => {
    const buffer = createTestBuffer(["hello world"], 0, 8);
    const result = motionB(buffer, 1);
    expect(result.col).toBe(6);
  });

  it("motionB at line start stays at 0", () => {
    const buffer = createTestBuffer(["hello"], 0, 0);
    const result = motionB(buffer, 1);
    expect(result.col).toBe(0);
  });

  it("motionE moves to end of word", () => {
    const buffer = createTestBuffer(["hello world"], 0, 0);
    const result = motionE(buffer, 1);
    expect(result.col).toBe(4);
  });
});

describe("Line motions (0/$)", () => {
  it("motion0 moves to start of line", () => {
    const buffer = createTestBuffer(["  hello world"], 0, 10);
    const result = motion0(buffer);
    expect(result.col).toBe(0);
  });

  it("motionDollar moves to end of line", () => {
    const buffer = createTestBuffer(["hello world"], 0, 0);
    const result = motionDollar(buffer, 1);
    expect(result.col).toBe(10);
    expect(result.inclusive).toBe(true);
  });

  it("motionCaret moves to first non-whitespace", () => {
    const buffer = createTestBuffer(["    hello"], 0, 0);
    const result = motionCaret(buffer);
    expect(result.col).toBe(4);
  });
});

describe("Document motions (gg/G)", () => {
  it("motionGG moves to first line", () => {
    const buffer = createTestBuffer(["line 1", "line 2", "line 3"], 2, 0);
    const result = motionGG(buffer);
    expect(result.line).toBe(0);
    expect(result.linewise).toBe(true);
  });

  it("motionGG with count moves to specific line", () => {
    const buffer = createTestBuffer(["line 1", "line 2", "line 3"], 0, 0);
    const result = motionGG(buffer, 2);
    expect(result.line).toBe(1);
  });

  it("motionG moves to last line", () => {
    const buffer = createTestBuffer(["line 1", "line 2", "line 3"], 0, 0);
    const result = motionG(buffer);
    expect(result.line).toBe(2);
    expect(result.linewise).toBe(true);
  });

  it("motionG with count moves to specific line", () => {
    const buffer = createTestBuffer(["line 1", "line 2", "line 3"], 0, 0);
    const result = motionG(buffer, 2);
    expect(result.line).toBe(1);
  });
});

describe("executeMotion integration", () => {
  it("executes h motion and updates state", () => {
    const buffer = createTestBuffer(["hello"], 0, 3);
    const state = createTestState(buffer);
    const { state: newState, result } = executeMotion(state, "h", 1);
    expect(result?.col).toBe(2);
    expect(newState.buffers[0].cursorCol).toBe(2);
  });

  it("executes j motion and updates state", () => {
    const buffer = createTestBuffer(["line 1", "line 2"], 0, 0);
    const state = createTestState(buffer);
    const { state: newState, result } = executeMotion(state, "j", 1);
    expect(result?.line).toBe(1);
    expect(newState.buffers[0].cursorLine).toBe(1);
  });
});

describe("applyMotion", () => {
  it("applies motion result to buffer", () => {
    const buffer = createTestBuffer(["hello"], 0, 0);
    const motion = { line: 0, col: 3 };
    const newBuffer = applyMotion(buffer, motion);
    expect(newBuffer.cursorCol).toBe(3);
    expect(newBuffer.cursorLine).toBe(0);
  });
});
