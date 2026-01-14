import type { VimBuffer, VimState } from "../types";
import { getActiveBuffer } from "./motions";

export interface ZCommandResult {
  state: VimState;
  scrollAction?: {
    type: "center" | "top" | "bottom" | "scroll-left" | "scroll-right";
    amount?: number;
  };
  message?: string;
}

function updateActiveBuffer(state: VimState, updater: (buffer: VimBuffer) => Partial<VimBuffer>): VimState {
  return {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === state.activeBufferId ? { ...b, ...updater(b) } : b
    ),
  };
}

function getBuffer(state: VimState): VimBuffer {
  const buffer = getActiveBuffer(state);
  if (!buffer) throw new Error("No active buffer");
  return buffer;
}

function getFirstNonBlank(line: string): number {
  let col = 0;
  while (col < line.length && (line[col] === " " || line[col] === "\t")) {
    col++;
  }
  return col;
}

export function scrollCenter(state: VimState): ZCommandResult {
  return {
    state,
    scrollAction: { type: "center" },
  };
}

export function scrollTop(state: VimState): ZCommandResult {
  return {
    state,
    scrollAction: { type: "top" },
  };
}

export function scrollBottom(state: VimState): ZCommandResult {
  return {
    state,
    scrollAction: { type: "bottom" },
  };
}

export function scrollTopFirstNonBlank(state: VimState): ZCommandResult {
  const buffer = getBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  const col = getFirstNonBlank(line);
  
  return {
    state: updateActiveBuffer(state, () => ({ cursorCol: col })),
    scrollAction: { type: "top" },
  };
}

export function scrollBottomFirstNonBlank(state: VimState): ZCommandResult {
  const buffer = getBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  const col = getFirstNonBlank(line);
  
  return {
    state: updateActiveBuffer(state, () => ({ cursorCol: col })),
    scrollAction: { type: "bottom" },
  };
}

export function scrollCenterFirstNonBlank(state: VimState): ZCommandResult {
  const buffer = getBuffer(state);
  const line = buffer.content[buffer.cursorLine] || "";
  const col = getFirstNonBlank(line);
  
  return {
    state: updateActiveBuffer(state, () => ({ cursorCol: col })),
    scrollAction: { type: "center" },
  };
}

export function scrollHalfLeft(state: VimState, visibleWidth: number = 80): ZCommandResult {
  const amount = Math.floor(visibleWidth / 2);
  return {
    state,
    scrollAction: { type: "scroll-left", amount },
  };
}

export function scrollHalfRight(state: VimState, visibleWidth: number = 80): ZCommandResult {
  const amount = Math.floor(visibleWidth / 2);
  return {
    state,
    scrollAction: { type: "scroll-right", amount },
  };
}

export function scrollCursorToStart(state: VimState): ZCommandResult {
  return {
    state,
    scrollAction: { type: "scroll-left", amount: 0 },
  };
}

export function scrollCursorToEnd(state: VimState): ZCommandResult {
  return {
    state,
    scrollAction: { type: "scroll-right", amount: 0 },
  };
}

export type ZScrollCommand = "zz" | "zt" | "zb" | "z<CR>" | "z-" | "z." | "zH" | "zL" | "zs" | "ze";

export function handleZScrollCommand(state: VimState, command: ZScrollCommand, visibleWidth?: number): ZCommandResult {
  switch (command) {
    case "zz":
      return scrollCenter(state);
    case "zt":
      return scrollTop(state);
    case "zb":
      return scrollBottom(state);
    case "z<CR>":
      return scrollTopFirstNonBlank(state);
    case "z-":
      return scrollBottomFirstNonBlank(state);
    case "z.":
      return scrollCenterFirstNonBlank(state);
    case "zH":
      return scrollHalfLeft(state, visibleWidth);
    case "zL":
      return scrollHalfRight(state, visibleWidth);
    case "zs":
      return scrollCursorToStart(state);
    case "ze":
      return scrollCursorToEnd(state);
    default:
      return { state, message: `${command} not implemented` };
  }
}
