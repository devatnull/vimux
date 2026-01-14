import { describe, it, expect } from "vitest";
import type { VimBuffer, VimState } from "../types";
import {
  operatorDelete,
  operatorYank,
  operatorChange,
  extractText,
  deleteRange,
  executeOperatorWithMotion,
  paste,
  pasteAfter,
  pasteBefore,
} from "../vim/operators";
import type { MotionResult } from "../vim/motions";

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

describe("extractText", () => {
  it("extracts text from single line range", () => {
    const buffer = createTestBuffer(["hello world"], 0, 0);
    const range = { startLine: 0, startCol: 0, endLine: 0, endCol: 5, linewise: false };
    const { text, type } = extractText(buffer, range);
    expect(text).toBe("hello");
    expect(type).toBe("char");
  });

  it("extracts text from multi-line range", () => {
    const buffer = createTestBuffer(["line one", "line two", "line three"], 0, 5);
    const range = { startLine: 0, startCol: 5, endLine: 1, endCol: 4, linewise: false };
    const { text, type } = extractText(buffer, range);
    expect(text).toBe("one\nline");
    expect(type).toBe("char");
  });

  it("extracts linewise text", () => {
    const buffer = createTestBuffer(["line 1", "line 2", "line 3"], 0, 0);
    const range = { startLine: 0, startCol: 0, endLine: 1, endCol: 5, linewise: true };
    const { text, type } = extractText(buffer, range);
    expect(text).toBe("line 1\nline 2\n");
    expect(type).toBe("line");
  });
});

describe("deleteRange", () => {
  it("deletes text within single line", () => {
    const buffer = createTestBuffer(["hello world"], 0, 0);
    const range = { startLine: 0, startCol: 0, endLine: 0, endCol: 6, linewise: false };
    const { buffer: newBuffer, deletedText } = deleteRange(buffer, range);
    expect(newBuffer.content[0]).toBe("world");
    expect(deletedText).toBe("hello ");
  });

  it("deletes entire line with linewise", () => {
    const buffer = createTestBuffer(["line 1", "line 2", "line 3"], 1, 0);
    const range = { startLine: 1, startCol: 0, endLine: 1, endCol: 5, linewise: true };
    const { buffer: newBuffer, deletedText } = deleteRange(buffer, range);
    expect(newBuffer.content).toHaveLength(2);
    expect(newBuffer.content).toEqual(["line 1", "line 3"]);
    expect(deletedText).toBe("line 2\n");
  });

  it("merges lines when deleting across lines", () => {
    const buffer = createTestBuffer(["hello", "world"], 0, 3);
    const range = { startLine: 0, startCol: 3, endLine: 1, endCol: 2, linewise: false };
    const { buffer: newBuffer } = deleteRange(buffer, range);
    expect(newBuffer.content).toHaveLength(1);
    expect(newBuffer.content[0]).toBe("helrld");
  });
});

describe("operatorDelete", () => {
  it("deletes text with motion", () => {
    const buffer = createTestBuffer(["hello world"], 0, 0);
    const state = createTestState(buffer);
    const motion: MotionResult = { line: 0, col: 5 };
    const { state: newState, deletedText } = operatorDelete(state, motion);
    expect(newState.buffers[0].content[0]).toBe("world");
    expect(deletedText).toBe("hello ");
  });

  it("deletes linewise with j motion", () => {
    const buffer = createTestBuffer(["line 1", "line 2", "line 3"], 0, 0);
    const state = createTestState(buffer);
    const motion: MotionResult = { line: 1, col: 0, linewise: true };
    const { state: newState, deletedText } = operatorDelete(state, motion);
    expect(newState.buffers[0].content).toEqual(["line 3"]);
    expect(deletedText).toBe("line 1\nline 2\n");
  });

  it("stores deleted text in register", () => {
    const buffer = createTestBuffer(["hello world"], 0, 0);
    const state = createTestState(buffer);
    const motion: MotionResult = { line: 0, col: 5 };
    const { state: newState } = operatorDelete(state, motion);
    expect(newState.unnamedRegister?.content).toBe("hello ");
  });
});

describe("operatorYank", () => {
  it("yanks text without modifying buffer", () => {
    const buffer = createTestBuffer(["hello world"], 0, 0);
    const state = createTestState(buffer);
    const motion: MotionResult = { line: 0, col: 5 };
    const { state: newState, deletedText } = operatorYank(state, motion);
    expect(newState.buffers[0].content[0]).toBe("hello world");
    expect(deletedText).toBe("hello ");
    expect(newState.unnamedRegister?.content).toBe("hello ");
  });

  it("yanks entire line with linewise motion", () => {
    const buffer = createTestBuffer(["line 1", "line 2"], 0, 0);
    const state = createTestState(buffer);
    const motion: MotionResult = { line: 0, col: 5, linewise: true };
    const { state: newState, deletedText } = operatorYank(state, motion);
    expect(deletedText).toBe("line 1\n");
    expect(newState.unnamedRegister?.type).toBe("line");
  });
});

describe("operatorChange", () => {
  it("deletes text and enters insert mode", () => {
    const buffer = createTestBuffer(["hello world"], 0, 0);
    const state = createTestState(buffer);
    const motion: MotionResult = { line: 0, col: 5 };
    const { state: newState, deletedText } = operatorChange(state, motion);
    expect(newState.buffers[0].content[0]).toBe("world");
    expect(newState.buffers[0].mode).toBe("insert");
    expect(deletedText).toBe("hello ");
  });
});

describe("executeOperatorWithMotion", () => {
  it("executes dw (delete word)", () => {
    const buffer = createTestBuffer(["hello world"], 0, 0);
    const state = createTestState(buffer);
    const { state: newState } = executeOperatorWithMotion(state, "d", "w", 1);
    expect(newState.buffers[0].content[0]).toBe("world");
  });

  it("executes d$ (delete to end of line)", () => {
    const buffer = createTestBuffer(["hello world"], 0, 6);
    const state = createTestState(buffer);
    const { state: newState } = executeOperatorWithMotion(state, "d", "$", 1);
    expect(newState.buffers[0].content[0]).toBe("hello ");
  });

  it("executes yy (yank line) via linewise motion", () => {
    const buffer = createTestBuffer(["line 1", "line 2"], 0, 0);
    const state = createTestState(buffer);
    const motion: MotionResult = { line: 0, col: 5, linewise: true };
    const { state: newState } = operatorYank(state, motion);
    expect(newState.unnamedRegister?.content).toBe("line 1\n");
    expect(newState.unnamedRegister?.type).toBe("line");
  });
});

describe("paste operations", () => {
  it("pastes character-wise text after cursor", () => {
    const buffer = createTestBuffer(["hello"], 0, 2);
    const state = createTestState(buffer);
    state.unnamedRegister = { content: "XX", type: "char", timestamp: Date.now() };
    const newState = pasteAfter(state, 1);
    expect(newState.buffers[0].content[0]).toBe("helXXlo");
  });

  it("pastes character-wise text before cursor", () => {
    const buffer = createTestBuffer(["hello"], 0, 2);
    const state = createTestState(buffer);
    state.unnamedRegister = { content: "XX", type: "char", timestamp: Date.now() };
    const newState = pasteBefore(state, 1);
    expect(newState.buffers[0].content[0]).toBe("heXXllo");
  });

  it("pastes linewise text below current line", () => {
    const buffer = createTestBuffer(["line 1", "line 3"], 0, 0);
    const state = createTestState(buffer);
    state.unnamedRegister = { content: "line 2\n", type: "line", timestamp: Date.now() };
    const newState = pasteAfter(state, 1);
    expect(newState.buffers[0].content).toEqual(["line 1", "line 2", "line 3"]);
  });
});
