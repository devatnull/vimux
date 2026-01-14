import type { TmuxState, TmuxPane, TmuxWindow } from "../types";

export interface TmuxNavigationResult {
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

function getActivePane(state: TmuxState) {
  const window = getActiveWindow(state);
  if (!window) return undefined;
  return window.panes.find((p) => p.id === window.activePaneId);
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

function findPaneInDirection(panes: TmuxPane[], current: TmuxPane, direction: "left" | "right" | "up" | "down"): TmuxPane | null {
  const candidates = panes.filter((p) => p.id !== current.id);
  
  switch (direction) {
    case "left":
      return candidates
        .filter((p) => p.x + p.width <= current.x)
        .sort((a, b) => (b.x + b.width) - (a.x + a.width))[0] || null;
    case "right":
      return candidates
        .filter((p) => p.x >= current.x + current.width)
        .sort((a, b) => a.x - b.x)[0] || null;
    case "up":
      return candidates
        .filter((p) => p.y + p.height <= current.y)
        .sort((a, b) => (b.y + b.height) - (a.y + a.height))[0] || null;
    case "down":
      return candidates
        .filter((p) => p.y >= current.y + current.height)
        .sort((a, b) => a.y - b.y)[0] || null;
  }
}

export function navigateLeft(state: TmuxState): TmuxNavigationResult {
  const window = getActiveWindow(state);
  const currentPane = getActivePane(state);
  if (!window || !currentPane) return { state };
  
  const target = findPaneInDirection(window.panes, currentPane, "left");
  if (!target) {
    return { state, message: "No pane to the left" };
  }
  
  return {
    state: updateActiveWindow(state, (w) => ({
      lastActivePaneId: w.activePaneId,
      activePaneId: target.id,
      panes: w.panes.map((p) => ({ ...p, isActive: p.id === target.id })),
    })),
  };
}

export function navigateRight(state: TmuxState): TmuxNavigationResult {
  const window = getActiveWindow(state);
  const currentPane = getActivePane(state);
  if (!window || !currentPane) return { state };
  
  const target = findPaneInDirection(window.panes, currentPane, "right");
  if (!target) {
    return { state, message: "No pane to the right" };
  }
  
  return {
    state: updateActiveWindow(state, (w) => ({
      lastActivePaneId: w.activePaneId,
      activePaneId: target.id,
      panes: w.panes.map((p) => ({ ...p, isActive: p.id === target.id })),
    })),
  };
}

export function navigateUp(state: TmuxState): TmuxNavigationResult {
  const window = getActiveWindow(state);
  const currentPane = getActivePane(state);
  if (!window || !currentPane) return { state };
  
  const target = findPaneInDirection(window.panes, currentPane, "up");
  if (!target) {
    return { state, message: "No pane above" };
  }
  
  return {
    state: updateActiveWindow(state, (w) => ({
      lastActivePaneId: w.activePaneId,
      activePaneId: target.id,
      panes: w.panes.map((p) => ({ ...p, isActive: p.id === target.id })),
    })),
  };
}

export function navigateDown(state: TmuxState): TmuxNavigationResult {
  const window = getActiveWindow(state);
  const currentPane = getActivePane(state);
  if (!window || !currentPane) return { state };
  
  const target = findPaneInDirection(window.panes, currentPane, "down");
  if (!target) {
    return { state, message: "No pane below" };
  }
  
  return {
    state: updateActiveWindow(state, (w) => ({
      lastActivePaneId: w.activePaneId,
      activePaneId: target.id,
      panes: w.panes.map((p) => ({ ...p, isActive: p.id === target.id })),
    })),
  };
}

export function navigateNext(state: TmuxState): TmuxNavigationResult {
  const window = getActiveWindow(state);
  if (!window || window.panes.length <= 1) return { state };
  
  const currentIndex = window.panes.findIndex((p) => p.id === window.activePaneId);
  const nextIndex = (currentIndex + 1) % window.panes.length;
  const nextPane = window.panes[nextIndex];
  
  return {
    state: updateActiveWindow(state, (w) => ({
      lastActivePaneId: w.activePaneId,
      activePaneId: nextPane.id,
      panes: w.panes.map((p) => ({ ...p, isActive: p.id === nextPane.id })),
    })),
  };
}

export function navigateLastActive(state: TmuxState): TmuxNavigationResult {
  const window = getActiveWindow(state);
  if (!window || !window.lastActivePaneId) {
    return { state, message: "No last active pane" };
  }
  
  const lastPane = window.panes.find((p) => p.id === window.lastActivePaneId);
  if (!lastPane) return { state, message: "Last active pane not found" };
  
  return {
    state: updateActiveWindow(state, (w) => ({
      lastActivePaneId: w.activePaneId,
      activePaneId: lastPane.id,
      panes: w.panes.map((p) => ({ ...p, isActive: p.id === lastPane.id })),
    })),
  };
}

export function selectPaneByNumber(state: TmuxState, num: number): TmuxNavigationResult {
  const window = getActiveWindow(state);
  if (!window) return { state };
  
  if (num < 0 || num >= window.panes.length) {
    return { state, message: `Pane ${num} does not exist` };
  }
  
  const targetPane = window.panes[num];
  
  return {
    state: updateActiveWindow(state, (w) => ({
      lastActivePaneId: w.activePaneId,
      activePaneId: targetPane.id,
      panes: w.panes.map((p) => ({ ...p, isActive: p.id === targetPane.id })),
    })),
  };
}

export function swapWithPrevious(state: TmuxState): TmuxNavigationResult {
  const window = getActiveWindow(state);
  if (!window || window.panes.length <= 1) return { state };
  
  const currentIndex = window.panes.findIndex((p) => p.id === window.activePaneId);
  const prevIndex = (currentIndex - 1 + window.panes.length) % window.panes.length;
  
  const newPanes = [...window.panes];
  [newPanes[currentIndex], newPanes[prevIndex]] = [newPanes[prevIndex], newPanes[currentIndex]];
  
  return {
    state: updateActiveWindow(state, () => ({ panes: newPanes })),
  };
}

export function swapWithNext(state: TmuxState): TmuxNavigationResult {
  const window = getActiveWindow(state);
  if (!window || window.panes.length <= 1) return { state };
  
  const currentIndex = window.panes.findIndex((p) => p.id === window.activePaneId);
  const nextIndex = (currentIndex + 1) % window.panes.length;
  
  const newPanes = [...window.panes];
  [newPanes[currentIndex], newPanes[nextIndex]] = [newPanes[nextIndex], newPanes[currentIndex]];
  
  return {
    state: updateActiveWindow(state, () => ({ panes: newPanes })),
  };
}

export function breakPaneToWindow(state: TmuxState): TmuxNavigationResult {
  const session = getActiveSession(state);
  const window = getActiveWindow(state);
  const currentPane = getActivePane(state);
  
  if (!session || !window || !currentPane) return { state };
  if (window.panes.length <= 1) {
    return { state, message: "Can't break out the only pane" };
  }
  
  const remainingPanes = window.panes.filter((p) => p.id !== currentPane.id);
  const newActivePaneId = remainingPanes[0].id;
  
  const fullSizePane: TmuxPane = {
    ...currentPane,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    isActive: true,
  };
  
  const newWindowId = `window-${Date.now()}`;
  const newWindow: TmuxWindow = {
    id: newWindowId,
    name: currentPane.title || `pane-${currentPane.id}`,
    panes: [fullSizePane],
    activePaneId: fullSizePane.id,
    isActive: true,
    index: session.windows.length,
    layout: "even-horizontal",
    lastActivePaneId: null,
  };
  
  return {
    state: {
      ...state,
      sessions: state.sessions.map((s) =>
        s.id === state.activeSessionId
          ? {
              ...s,
              activeWindowId: newWindowId,
              windows: [
                ...s.windows.map((w) =>
                  w.id === window.id
                    ? {
                        ...w,
                        panes: remainingPanes.map((p, i) => ({ ...p, isActive: i === 0 })),
                        activePaneId: newActivePaneId,
                        isActive: false,
                      }
                    : { ...w, isActive: false }
                ),
                newWindow,
              ],
            }
          : s
      ),
    },
    message: `Pane broken out to window ${newWindow.index}`,
  };
}
