import type { TmuxState, TmuxPane, TmuxWindow } from "../types";

export interface TmuxMouseResult {
  state: TmuxState;
  message?: string;
}

function getActiveSession(state: TmuxState) {
  return state.sessions.find((s) => s.id === state.activeSessionId);
}

function getActiveWindow(state: TmuxState) {
  const session = getActiveSession(state);
  if (!session) return undefined;
  return session.windows.find((w) => w.id === session.activeWindowId);
}

function updateActiveWindow(state: TmuxState, updater: (window: TmuxWindow) => Partial<TmuxWindow>): TmuxState {
  const session = getActiveSession(state);
  if (!session) return state;
  
  return {
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === state.activeSessionId
        ? {
            ...s,
            windows: s.windows.map((w) =>
              w.id === session.activeWindowId ? { ...w, ...updater(w) } : w
            ),
          }
        : s
    ),
  };
}

export function toggleMouseMode(state: TmuxState): TmuxMouseResult {
  return {
    state: {
      ...state,
      mouseMode: !state.mouseMode,
    },
    message: state.mouseMode ? "Mouse mode OFF" : "Mouse mode ON",
  };
}

export function handlePaneClick(state: TmuxState, x: number, y: number): TmuxMouseResult {
  if (!state.mouseMode) {
    return { state };
  }
  
  const window = getActiveWindow(state);
  if (!window) return { state };
  
  const clickedPane = window.panes.find((p) =>
    x >= p.x && x < p.x + p.width && y >= p.y && y < p.y + p.height
  );
  
  if (!clickedPane || clickedPane.id === window.activePaneId) {
    return { state };
  }
  
  return {
    state: updateActiveWindow(state, (w) => ({
      lastActivePaneId: w.activePaneId,
      activePaneId: clickedPane.id,
      panes: w.panes.map((p) => ({ ...p, isActive: p.id === clickedPane.id })),
    })),
  };
}

export function handleWindowClick(state: TmuxState, windowIndex: number): TmuxMouseResult {
  if (!state.mouseMode) {
    return { state };
  }
  
  const session = getActiveSession(state);
  if (!session) return { state };
  
  const targetWindow = session.windows.find((w) => w.index === windowIndex);
  if (!targetWindow || targetWindow.id === session.activeWindowId) {
    return { state };
  }
  
  return {
    state: {
      ...state,
      sessions: state.sessions.map((s) =>
        s.id === state.activeSessionId
          ? {
              ...s,
              lastActiveWindowId: s.activeWindowId,
              activeWindowId: targetWindow.id,
              windows: s.windows.map((w) => ({ ...w, isActive: w.id === targetWindow.id })),
            }
          : s
      ),
    },
  };
}

export interface DragResizeState {
  dragging: boolean;
  paneId: string | null;
  edge: "left" | "right" | "top" | "bottom" | null;
  startX: number;
  startY: number;
}

export function startBorderDrag(
  state: TmuxState,
  x: number,
  y: number
): { state: TmuxState; dragState: DragResizeState } | null {
  if (!state.mouseMode) return null;
  
  const window = getActiveWindow(state);
  if (!window) return null;
  
  for (const pane of window.panes) {
    if (Math.abs(x - pane.x) <= 1) {
      return {
        state,
        dragState: { dragging: true, paneId: pane.id, edge: "left", startX: x, startY: y },
      };
    }
    if (Math.abs(x - (pane.x + pane.width)) <= 1) {
      return {
        state,
        dragState: { dragging: true, paneId: pane.id, edge: "right", startX: x, startY: y },
      };
    }
    if (Math.abs(y - pane.y) <= 1) {
      return {
        state,
        dragState: { dragging: true, paneId: pane.id, edge: "top", startX: x, startY: y },
      };
    }
    if (Math.abs(y - (pane.y + pane.height)) <= 1) {
      return {
        state,
        dragState: { dragging: true, paneId: pane.id, edge: "bottom", startX: x, startY: y },
      };
    }
  }
  
  return null;
}

export function handleScroll(state: TmuxState, deltaY: number): TmuxMouseResult {
  if (!state.mouseMode) {
    return { state };
  }
  
  if (!state.copyMode.enabled) {
    return {
      state: {
        ...state,
        copyMode: {
          ...state.copyMode,
          enabled: true,
          selectionStart: null,
          selectionEnd: null,
          rectangleSelect: false,
          searchPattern: null,
          searchDirection: "forward",
        },
      },
      message: "[COPY MODE]",
    };
  }
  
  return { state };
}

export function handleCopyModeClick(
  state: TmuxState,
  x: number,
  y: number
): TmuxMouseResult {
  if (!state.mouseMode || !state.copyMode.enabled) {
    return { state };
  }
  
  return {
    state: {
      ...state,
      copyMode: {
        ...state.copyMode,
        selectionStart: null,
        selectionEnd: null,
      },
    },
  };
}

export function handleCopyModeDrag(
  state: TmuxState,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): TmuxMouseResult {
  if (!state.mouseMode || !state.copyMode.enabled) {
    return { state };
  }
  
  return {
    state: {
      ...state,
      copyMode: {
        ...state.copyMode,
        selectionStart: { line: startY, col: startX },
        selectionEnd: { line: endY, col: endX },
      },
    },
  };
}

export function handleMiddleClick(state: TmuxState): TmuxMouseResult {
  if (!state.mouseMode) {
    return { state };
  }
  
  if (state.pasteBuffer.length === 0) {
    return { state, message: "Paste buffer empty" };
  }
  
  return {
    state,
    message: `Would paste: ${state.pasteBuffer[0].substring(0, 30)}...`,
  };
}
