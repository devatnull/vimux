import type { SimulatorState, LessonStepValidation } from "./types";

export function validateState(
  state: SimulatorState,
  validation: LessonStepValidation
): boolean {
  const activeSession = state.tmux.sessions.find(
    (s) => s.id === state.tmux.activeSessionId
  );
  const activeWindow = activeSession?.windows.find(
    (w) => w.id === activeSession.activeWindowId
  );
  const activeBuffer = state.vim.buffers.find(
    (b) => b.id === state.vim.activeBufferId
  );

  if (validation.cursorPosition) {
    if (
      activeBuffer?.cursorLine !== validation.cursorPosition.line ||
      activeBuffer?.cursorCol !== validation.cursorPosition.col
    ) {
      return false;
    }
  }

  if (validation.cursorLine !== undefined) {
    if (activeBuffer?.cursorLine !== validation.cursorLine) {
      return false;
    }
  }

  if (validation.cursorCol !== undefined) {
    if (activeBuffer?.cursorCol !== validation.cursorCol) {
      return false;
    }
  }

  if (validation.mode !== undefined) {
    if (activeBuffer?.mode !== validation.mode) {
      return false;
    }
  }

  if (validation.bufferContent !== undefined) {
    if (!activeBuffer) return false;
    if (typeof validation.bufferContent === "function") {
      if (!validation.bufferContent(activeBuffer.content)) {
        return false;
      }
    } else {
      if (
        JSON.stringify(activeBuffer.content) !==
        JSON.stringify(validation.bufferContent)
      ) {
        return false;
      }
    }
  }

  if (validation.bufferContains !== undefined) {
    if (!activeBuffer) return false;
    const fullContent = activeBuffer.content.join("\n");
    if (!fullContent.includes(validation.bufferContains)) {
      return false;
    }
  }

  if (validation.paneCount !== undefined) {
    if (activeWindow?.panes.length !== validation.paneCount) {
      return false;
    }
  }

  if (validation.windowCount !== undefined) {
    if (activeSession?.windows.length !== validation.windowCount) {
      return false;
    }
  }

  if (validation.prefixActive !== undefined) {
    if (state.tmux.prefixActive !== validation.prefixActive) {
      return false;
    }
  }

  if (validation.custom) {
    if (!validation.custom(state)) {
      return false;
    }
  }

  return true;
}

export function getActiveBuffer(state: SimulatorState) {
  return state.vim.buffers.find((b) => b.id === state.vim.activeBufferId);
}

export function getActivePane(state: SimulatorState) {
  const activeSession = state.tmux.sessions.find(
    (s) => s.id === state.tmux.activeSessionId
  );
  const activeWindow = activeSession?.windows.find(
    (w) => w.id === activeSession.activeWindowId
  );
  return activeWindow?.panes.find((p) => p.id === activeWindow.activePaneId);
}

export function getPaneCount(state: SimulatorState): number {
  const activeSession = state.tmux.sessions.find(
    (s) => s.id === state.tmux.activeSessionId
  );
  const activeWindow = activeSession?.windows.find(
    (w) => w.id === activeSession.activeWindowId
  );
  return activeWindow?.panes.length ?? 0;
}

export function getWindowCount(state: SimulatorState): number {
  const activeSession = state.tmux.sessions.find(
    (s) => s.id === state.tmux.activeSessionId
  );
  return activeSession?.windows.length ?? 0;
}
