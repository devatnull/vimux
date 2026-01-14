import type { TmuxState } from "../types";

export interface TmuxPasteResult {
  state: TmuxState;
  pastedContent?: string;
  message?: string;
}

export interface BufferListItem {
  index: number;
  size: number;
  preview: string;
}

export function pasteFromBuffer(state: TmuxState): TmuxPasteResult {
  if (state.pasteBuffer.length === 0) {
    return {
      state,
      message: "No buffers",
    };
  }

  const content = state.pasteBuffer[0];
  return {
    state,
    pastedContent: content,
    message: `Pasted ${content.length} bytes`,
  };
}

export function showBufferList(state: TmuxState): BufferListItem[] {
  return state.pasteBuffer.map((content, index) => ({
    index,
    size: content.length,
    preview: getBufferPreviewText(content),
  }));
}

export function deleteTopBuffer(state: TmuxState): TmuxPasteResult {
  if (state.pasteBuffer.length === 0) {
    return {
      state,
      message: "No buffers",
    };
  }

  const newPasteBuffer = state.pasteBuffer.slice(1);
  const newIndex = Math.min(
    state.pasteBufferIndex,
    Math.max(0, newPasteBuffer.length - 1)
  );

  return {
    state: {
      ...state,
      pasteBuffer: newPasteBuffer,
      pasteBufferIndex: newIndex,
    },
    message: "Deleted buffer 0",
  };
}

export function addToBuffer(state: TmuxState, content: string): TmuxPasteResult {
  const newPasteBuffer = [content, ...state.pasteBuffer];

  return {
    state: {
      ...state,
      pasteBuffer: newPasteBuffer,
      pasteBufferIndex: 0,
    },
    message: `Added ${content.length} bytes to buffer`,
  };
}

export function selectBuffer(
  state: TmuxState,
  index: number
): TmuxPasteResult {
  if (state.pasteBuffer.length === 0) {
    return {
      state,
      message: "No buffers",
    };
  }

  if (index < 0 || index >= state.pasteBuffer.length) {
    return {
      state,
      message: `Buffer ${index} not found`,
    };
  }

  const content = state.pasteBuffer[index];
  return {
    state: {
      ...state,
      pasteBufferIndex: index,
    },
    pastedContent: content,
    message: `Pasted buffer ${index} (${content.length} bytes)`,
  };
}

export function getBufferPreview(
  state: TmuxState,
  index: number
): string | null {
  if (index < 0 || index >= state.pasteBuffer.length) {
    return null;
  }

  return getBufferPreviewText(state.pasteBuffer[index]);
}

function getBufferPreviewText(content: string, maxLength: number = 50): string {
  const singleLine = content.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  if (singleLine.length <= maxLength) {
    return singleLine;
  }
  return singleLine.substring(0, maxLength - 3) + "...";
}
