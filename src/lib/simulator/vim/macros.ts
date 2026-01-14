import { VimState } from "../types";

export interface MacroResult {
  state: VimState;
  shouldExecute?: boolean;
}

export function startMacroRecording(
  state: VimState,
  register: string
): VimState {
  if (register.length !== 1 || !/[a-z]/i.test(register)) {
    return {
      ...state,
      message: `E354: Invalid register name: '${register}'`,
      messageType: "error",
    };
  }

  const regLower = register.toLowerCase();

  return {
    ...state,
    recordingMacro: regLower,
    macros: {
      ...state.macros,
      [regLower]: "",
    },
    message: `recording @${regLower}`,
    messageType: "info",
  };
}

export function stopMacroRecording(state: VimState): VimState {
  if (!state.recordingMacro) {
    return state;
  }

  const register = state.recordingMacro;
  const currentMacro = state.macros[register] || "";
  const cleanedMacro = currentMacro.replace(/q$/, "");

  return {
    ...state,
    recordingMacro: null,
    macros: {
      ...state.macros,
      [register]: cleanedMacro,
    },
    message: null,
    messageType: null,
  };
}

export function recordKeystroke(state: VimState, keystroke: string): VimState {
  if (!state.recordingMacro) {
    return state;
  }

  const register = state.recordingMacro;
  const currentMacro = state.macros[register] || "";

  return {
    ...state,
    macros: {
      ...state.macros,
      [register]: currentMacro + keystroke,
    },
  };
}

export function getMacroContent(state: VimState, register: string): string | null {
  if (register.length !== 1) return null;
  
  const regLower = register.toLowerCase();
  return state.macros[regLower] ?? null;
}

export function isRecordingMacro(state: VimState): boolean {
  return state.recordingMacro !== null;
}

export function getRecordingRegister(state: VimState): string | null {
  return state.recordingMacro;
}

export function getRecordingStatusMessage(state: VimState): string | null {
  if (!state.recordingMacro) return null;
  return `recording @${state.recordingMacro}`;
}

export interface MacroExecutionResult {
  state: VimState;
  keystrokes: string[];
  success: boolean;
  error?: string;
}

export function prepareMacroExecution(
  state: VimState,
  register: string,
  count: number = 1
): MacroExecutionResult {
  if (register === "@") {
    if (!state.lastPlayedMacro) {
      return {
        state: {
          ...state,
          message: "E748: No previously used register",
          messageType: "error",
        },
        keystrokes: [],
        success: false,
        error: "No previously used register",
      };
    }
    register = state.lastPlayedMacro;
  }

  if (register.length !== 1 || !/[a-z]/i.test(register)) {
    return {
      state: {
        ...state,
        message: `E354: Invalid register name: '${register}'`,
        messageType: "error",
      },
      keystrokes: [],
      success: false,
      error: `Invalid register name: '${register}'`,
    };
  }

  const regLower = register.toLowerCase();
  const macroContent = state.macros[regLower];

  if (!macroContent || macroContent.length === 0) {
    return {
      state: {
        ...state,
        message: `E354: Invalid register name: '${register}'`,
        messageType: "error",
      },
      keystrokes: [],
      success: false,
      error: `Register '${register}' is empty`,
    };
  }

  const keystrokes = parseMacroKeystrokes(macroContent);
  const repeatedKeystrokes: string[] = [];
  for (let i = 0; i < count; i++) {
    repeatedKeystrokes.push(...keystrokes);
  }

  const newState: VimState = {
    ...state,
    lastPlayedMacro: regLower,
  };

  return {
    state: newState,
    keystrokes: repeatedKeystrokes,
    success: true,
  };
}

function parseMacroKeystrokes(macroContent: string): string[] {
  const keystrokes: string[] = [];
  let i = 0;

  while (i < macroContent.length) {
    if (macroContent[i] === "<") {
      const endIndex = macroContent.indexOf(">", i);
      if (endIndex !== -1) {
        keystrokes.push(macroContent.slice(i, endIndex + 1));
        i = endIndex + 1;
        continue;
      }
    }

    if (macroContent[i] === "\\") {
      if (i + 1 < macroContent.length) {
        const escapeChar = macroContent[i + 1];
        switch (escapeChar) {
          case "n":
            keystrokes.push("<Enter>");
            break;
          case "t":
            keystrokes.push("<Tab>");
            break;
          case "e":
            keystrokes.push("<Esc>");
            break;
          case "<":
            keystrokes.push("<");
            break;
          case "\\":
            keystrokes.push("\\");
            break;
          default:
            keystrokes.push(macroContent[i + 1]);
        }
        i += 2;
        continue;
      }
    }

    keystrokes.push(macroContent[i]);
    i++;
  }

  return keystrokes;
}

export function encodeKeystrokeForMacro(
  key: string,
  ctrl: boolean = false,
  alt: boolean = false,
  _shift: boolean = false
): string {
  if (ctrl && key.length === 1) {
    return `<C-${key.toLowerCase()}>`;
  }
  if (alt && key.length === 1) {
    return `<A-${key.toLowerCase()}>`;
  }

  switch (key) {
    case "Escape":
      return "<Esc>";
    case "Enter":
      return "<Enter>";
    case "Tab":
      return "<Tab>";
    case "Backspace":
      return "<BS>";
    case "Delete":
      return "<Del>";
    case "ArrowUp":
      return "<Up>";
    case "ArrowDown":
      return "<Down>";
    case "ArrowLeft":
      return "<Left>";
    case "ArrowRight":
      return "<Right>";
    case "Home":
      return "<Home>";
    case "End":
      return "<End>";
    case "PageUp":
      return "<PageUp>";
    case "PageDown":
      return "<PageDown>";
    case "Insert":
      return "<Insert>";
    case " ":
      return "<Space>";
    default:
      return key;
  }
}

export function handleMacroKey(
  state: VimState,
  key: string,
  waitingForRegister: boolean
): MacroResult {
  if (key === "q" && !waitingForRegister) {
    if (state.recordingMacro) {
      return {
        state: stopMacroRecording(state),
        shouldExecute: false,
      };
    } else {
      return {
        state,
        shouldExecute: true,
      };
    }
  }

  if (waitingForRegister && /^[a-zA-Z]$/.test(key)) {
    return {
      state: startMacroRecording(state, key),
      shouldExecute: false,
    };
  }

  if (key === "@" && !waitingForRegister) {
    return {
      state,
      shouldExecute: true,
    };
  }

  return {
    state,
    shouldExecute: false,
  };
}

export function getMacrosForDisplay(state: VimState): Array<{
  register: string;
  content: string;
}> {
  const result: Array<{ register: string; content: string }> = [];

  const sortedRegisters = Object.keys(state.macros).sort();

  for (const register of sortedRegisters) {
    const content = state.macros[register];
    if (content && content.length > 0) {
      result.push({
        register,
        content: formatMacroContentForDisplay(content),
      });
    }
  }

  return result;
}

function formatMacroContentForDisplay(content: string): string {
  return content
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .slice(0, 50) + (content.length > 50 ? "..." : "");
}

export function clearMacro(state: VimState, register: string): VimState {
  if (register.length !== 1 || !/[a-z]/i.test(register)) {
    return state;
  }

  const regLower = register.toLowerCase();
  const { [regLower]: _, ...remainingMacros } = state.macros;
  void _;

  return {
    ...state,
    macros: remainingMacros,
  };
}

export function clearAllMacros(state: VimState): VimState {
  return {
    ...state,
    macros: {},
    lastPlayedMacro: null,
  };
}

export function setMacroContent(
  state: VimState,
  register: string,
  content: string
): VimState {
  if (register.length !== 1 || !/[a-z]/i.test(register)) {
    return {
      ...state,
      message: `E354: Invalid register name: '${register}'`,
      messageType: "error",
    };
  }

  const regLower = register.toLowerCase();

  return {
    ...state,
    macros: {
      ...state.macros,
      [regLower]: content,
    },
  };
}

export function appendToMacro(
  state: VimState,
  register: string,
  content: string
): VimState {
  if (register.length !== 1 || !/[A-Z]/.test(register)) {
    return setMacroContent(state, register, content);
  }

  const regLower = register.toLowerCase();
  const existingContent = state.macros[regLower] || "";

  return {
    ...state,
    macros: {
      ...state.macros,
      [regLower]: existingContent + content,
    },
  };
}

export function canExecuteMacro(state: VimState, register: string): boolean {
  if (register === "@" && state.lastPlayedMacro) {
    register = state.lastPlayedMacro;
  }

  if (register.length !== 1 || !/[a-z]/i.test(register)) {
    return false;
  }

  const regLower = register.toLowerCase();
  const content = state.macros[regLower];
  return !!content && content.length > 0;
}
