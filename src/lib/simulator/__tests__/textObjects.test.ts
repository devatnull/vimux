import { describe, it, expect } from "vitest";
import type { VimBuffer, VimState } from "../types";
import {
  textObjectInnerWord,
  textObjectAWord,
  textObjectInnerDoubleQuote,
  textObjectADoubleQuote,
  textObjectInnerSingleQuote,
  textObjectASingleQuote,
  textObjectInnerParen,
  textObjectAParen,
  textObjectInnerBracket,
  textObjectABracket,
  textObjectInnerBrace,
  textObjectABrace,
  executeTextObject,
  textObjectToMotionResult,
} from "../vim/textObjects";

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

describe("Word text objects (iw/aw)", () => {
  it("textObjectInnerWord selects word under cursor", () => {
    const buffer = createTestBuffer(["hello world"], 0, 7);
    const result = textObjectInnerWord(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(6);
    expect(result?.endCol).toBe(10);
    expect(result?.linewise).toBe(false);
  });

  it("textObjectInnerWord handles cursor at start of word", () => {
    const buffer = createTestBuffer(["hello world"], 0, 0);
    const result = textObjectInnerWord(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(0);
    expect(result?.endCol).toBe(4);
  });

  it("textObjectAWord includes trailing whitespace", () => {
    const buffer = createTestBuffer(["hello world"], 0, 0);
    const result = textObjectAWord(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(0);
    expect(result?.endCol).toBe(5);
  });

  it("textObjectInnerWord handles whitespace", () => {
    const buffer = createTestBuffer(["hello   world"], 0, 6);
    const result = textObjectInnerWord(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(5);
    expect(result?.endCol).toBe(7);
  });
});

describe("Quote text objects (i\"/a\")", () => {
  it("textObjectInnerDoubleQuote selects inside quotes", () => {
    const buffer = createTestBuffer(['say "hello world" now'], 0, 8);
    const result = textObjectInnerDoubleQuote(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(5);
    expect(result?.endCol).toBe(15);
  });

  it("textObjectADoubleQuote includes quotes", () => {
    const buffer = createTestBuffer(['say "hello" now'], 0, 7);
    const result = textObjectADoubleQuote(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(4);
    expect(result?.endCol).toBe(10);
  });

  it("textObjectInnerSingleQuote selects inside single quotes", () => {
    const buffer = createTestBuffer(["it's 'hello' there"], 0, 8);
    const result = textObjectInnerSingleQuote(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(6);
    expect(result?.endCol).toBe(10);
  });

  it("textObjectASingleQuote includes quotes", () => {
    const buffer = createTestBuffer(["test 'word' end"], 0, 7);
    const result = textObjectASingleQuote(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(5);
    expect(result?.endCol).toBe(10);
  });

  it("returns null when no quotes found", () => {
    const buffer = createTestBuffer(["no quotes here"], 0, 5);
    const result = textObjectInnerDoubleQuote(buffer);
    expect(result).toBeNull();
  });
});

describe("Bracket text objects (i(/a(, i[/a[, i{/a{)", () => {
  it("textObjectInnerParen selects inside parentheses", () => {
    const buffer = createTestBuffer(["func(arg1, arg2)"], 0, 8);
    const result = textObjectInnerParen(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(5);
    expect(result?.endCol).toBe(14);
  });

  it("textObjectAParen includes parentheses", () => {
    const buffer = createTestBuffer(["func(arg)"], 0, 6);
    const result = textObjectAParen(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(4);
    expect(result?.endCol).toBe(8);
  });

  it("textObjectInnerBracket selects inside brackets", () => {
    const buffer = createTestBuffer(["array[index]"], 0, 7);
    const result = textObjectInnerBracket(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(6);
    expect(result?.endCol).toBe(10);
  });

  it("textObjectABracket includes brackets", () => {
    const buffer = createTestBuffer(["list[0]"], 0, 5);
    const result = textObjectABracket(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(4);
    expect(result?.endCol).toBe(6);
  });

  it("textObjectInnerBrace selects inside braces", () => {
    const buffer = createTestBuffer(["obj { key: val }"], 0, 8);
    const result = textObjectInnerBrace(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(5);
    expect(result?.endCol).toBe(14);
  });

  it("textObjectABrace includes braces", () => {
    const buffer = createTestBuffer(["{value}"], 0, 3);
    const result = textObjectABrace(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(0);
    expect(result?.endCol).toBe(6);
  });

  it("handles nested brackets", () => {
    const buffer = createTestBuffer(["outer(inner(x))"], 0, 12);
    const result = textObjectInnerParen(buffer);
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(12);
    expect(result?.endCol).toBe(12);
  });
});

describe("executeTextObject", () => {
  it("executes iw text object", () => {
    const buffer = createTestBuffer(["hello world"], 0, 0);
    const state = createTestState(buffer);
    const { result } = executeTextObject(state, "i", "w");
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(0);
    expect(result?.endCol).toBe(4);
  });

  it("executes aw text object", () => {
    const buffer = createTestBuffer(["hello world"], 0, 0);
    const state = createTestState(buffer);
    const { result } = executeTextObject(state, "a", "w");
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(0);
    expect(result?.endCol).toBe(5);
  });

  it('executes i" text object', () => {
    const buffer = createTestBuffer(['test "value" end'], 0, 7);
    const state = createTestState(buffer);
    const { result } = executeTextObject(state, "i", '"');
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(6);
    expect(result?.endCol).toBe(10);
  });

  it("executes i( text object", () => {
    const buffer = createTestBuffer(["call(arg)"], 0, 5);
    const state = createTestState(buffer);
    const { result } = executeTextObject(state, "i", "(");
    expect(result).not.toBeNull();
    expect(result?.startCol).toBe(5);
    expect(result?.endCol).toBe(7);
  });
});

describe("textObjectToMotionResult", () => {
  it("converts text object to motion result", () => {
    const buffer = createTestBuffer(["hello"], 0, 0);
    const textObj = { startLine: 0, startCol: 0, endLine: 0, endCol: 4, linewise: false };
    const motion = textObjectToMotionResult(buffer, textObj);
    expect(motion.line).toBe(0);
    expect(motion.col).toBe(4);
    expect(motion.inclusive).toBe(true);
    expect(motion.linewise).toBe(false);
  });
});
