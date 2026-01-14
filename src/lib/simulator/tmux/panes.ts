import type { TmuxState, TmuxPane, TmuxWindow } from "../types";
import { createDefaultPane, DEFAULT_TERMINAL_WIDTH, DEFAULT_TERMINAL_HEIGHT } from "../constants";

export interface TmuxPaneResult {
  state: TmuxState;
  message?: string;
}

const MIN_PANE_WIDTH = 10;
const MIN_PANE_HEIGHT = 5;
const MIN_PANE_WIDTH_PERCENT = 10;
const MIN_PANE_HEIGHT_PERCENT = 10;

function generatePaneId(): string {
  return `pane-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getActiveWindow(state: TmuxState): TmuxWindow | null {
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  if (!session) return null;
  return session.windows.find((w) => w.id === session.activeWindowId) ?? null;
}

function getActivePane(window: TmuxWindow): TmuxPane | null {
  return window.panes.find((p) => p.id === window.activePaneId) ?? null;
}

function updateWindowInState(state: TmuxState, updatedWindow: TmuxWindow): TmuxState {
  return {
    ...state,
    sessions: state.sessions.map((session) =>
      session.id === state.activeSessionId
        ? {
            ...session,
            windows: session.windows.map((w) =>
              w.id === updatedWindow.id ? updatedWindow : w
            ),
          }
        : session
    ),
  };
}

function toPercentage(value: number, total: number): number {
  return (value / total) * 100;
}

function fromPercentage(percent: number, total: number): number {
  return Math.floor((percent / 100) * total);
}

function canSplitHorizontal(pane: TmuxPane): boolean {
  const halfHeight = pane.height / 2;
  return halfHeight >= MIN_PANE_HEIGHT;
}

function canSplitVertical(pane: TmuxPane): boolean {
  const halfWidth = pane.width / 2;
  return halfWidth >= MIN_PANE_WIDTH;
}

export function splitHorizontal(state: TmuxState): TmuxPaneResult {
  const window = getActiveWindow(state);
  if (!window) {
    return { state, message: "No active window" };
  }

  const activePane = getActivePane(window);
  if (!activePane) {
    return { state, message: "No active pane" };
  }

  if (!canSplitHorizontal(activePane)) {
    return { state, message: "Pane too small to split horizontally" };
  }

  const originalHeight = activePane.height;
  const newPaneHeight = Math.floor(originalHeight / 2);
  const updatedPaneHeight = originalHeight - newPaneHeight;

  const updatedActivePane: TmuxPane = {
    ...activePane,
    height: updatedPaneHeight,
    isActive: false,
  };

  const newPane: TmuxPane = {
    ...createDefaultPane(generatePaneId(), activePane.width, newPaneHeight),
    x: activePane.x,
    y: activePane.y + updatedPaneHeight,
    width: activePane.width,
    height: newPaneHeight,
    isActive: true,
    isZoomed: false,
  };

  const updatedPanes = window.panes.map((p) =>
    p.id === activePane.id ? updatedActivePane : p
  );
  updatedPanes.push(newPane);

  const updatedWindow: TmuxWindow = {
    ...window,
    panes: updatedPanes,
    activePaneId: newPane.id,
    lastActivePaneId: activePane.id,
    layout: "custom",
  };

  return {
    state: updateWindowInState(state, updatedWindow),
    message: `Split pane horizontally`,
  };
}

export function splitVertical(state: TmuxState): TmuxPaneResult {
  const window = getActiveWindow(state);
  if (!window) {
    return { state, message: "No active window" };
  }

  const activePane = getActivePane(window);
  if (!activePane) {
    return { state, message: "No active pane" };
  }

  if (!canSplitVertical(activePane)) {
    return { state, message: "Pane too small to split vertically" };
  }

  const originalWidth = activePane.width;
  const newPaneWidth = Math.floor(originalWidth / 2);
  const updatedPaneWidth = originalWidth - newPaneWidth;

  const updatedActivePane: TmuxPane = {
    ...activePane,
    width: updatedPaneWidth,
    isActive: false,
  };

  const newPane: TmuxPane = {
    ...createDefaultPane(generatePaneId(), newPaneWidth, activePane.height),
    x: activePane.x + updatedPaneWidth,
    y: activePane.y,
    width: newPaneWidth,
    height: activePane.height,
    isActive: true,
    isZoomed: false,
  };

  const updatedPanes = window.panes.map((p) =>
    p.id === activePane.id ? updatedActivePane : p
  );
  updatedPanes.push(newPane);

  const updatedWindow: TmuxWindow = {
    ...window,
    panes: updatedPanes,
    activePaneId: newPane.id,
    lastActivePaneId: activePane.id,
    layout: "custom",
  };

  return {
    state: updateWindowInState(state, updatedWindow),
    message: `Split pane vertically`,
  };
}

export function closePane(state: TmuxState, paneId?: string): TmuxPaneResult {
  const window = getActiveWindow(state);
  if (!window) {
    return { state, message: "No active window" };
  }

  const targetPaneId = paneId ?? window.activePaneId;
  const paneIndex = window.panes.findIndex((p) => p.id === targetPaneId);
  
  if (paneIndex === -1) {
    return { state, message: "Pane not found" };
  }

  if (window.panes.length === 1) {
    return { state, message: "Cannot close the only pane" };
  }

  const closedPane = window.panes[paneIndex];
  const remainingPanes = window.panes.filter((p) => p.id !== targetPaneId);

  const reclaimedPane = remainingPanes.find(
    (p) =>
      (p.x === closedPane.x && p.y + p.height === closedPane.y) ||
      (p.x === closedPane.x && closedPane.y + closedPane.height === p.y) ||
      (p.y === closedPane.y && p.x + p.width === closedPane.x) ||
      (p.y === closedPane.y && closedPane.x + closedPane.width === p.x)
  );

  if (reclaimedPane) {
    if (reclaimedPane.x === closedPane.x) {
      reclaimedPane.height += closedPane.height;
      if (closedPane.y < reclaimedPane.y) {
        reclaimedPane.y = closedPane.y;
      }
    } else if (reclaimedPane.y === closedPane.y) {
      reclaimedPane.width += closedPane.width;
      if (closedPane.x < reclaimedPane.x) {
        reclaimedPane.x = closedPane.x;
      }
    }
  }

  let newActivePaneId = window.activePaneId;
  if (targetPaneId === window.activePaneId) {
    const newActivePane = remainingPanes[Math.min(paneIndex, remainingPanes.length - 1)];
    newActivePaneId = newActivePane.id;
    remainingPanes.forEach((p) => (p.isActive = p.id === newActivePaneId));
  }

  const updatedWindow: TmuxWindow = {
    ...window,
    panes: remainingPanes,
    activePaneId: newActivePaneId,
    layout: "custom",
  };

  return {
    state: updateWindowInState(state, updatedWindow),
    message: "Pane closed",
  };
}

export function selectPane(state: TmuxState, paneId: string): TmuxPaneResult {
  const window = getActiveWindow(state);
  if (!window) {
    return { state, message: "No active window" };
  }

  const pane = window.panes.find((p) => p.id === paneId);
  if (!pane) {
    return { state, message: "Pane not found" };
  }

  const updatedPanes = window.panes.map((p) => ({
    ...p,
    isActive: p.id === paneId,
  }));

  const updatedWindow: TmuxWindow = {
    ...window,
    panes: updatedPanes,
    activePaneId: paneId,
    lastActivePaneId: window.activePaneId,
  };

  return {
    state: updateWindowInState(state, updatedWindow),
  };
}

export function selectPaneDirection(
  state: TmuxState,
  direction: "up" | "down" | "left" | "right"
): TmuxPaneResult {
  const window = getActiveWindow(state);
  if (!window) {
    return { state, message: "No active window" };
  }

  const activePane = getActivePane(window);
  if (!activePane) {
    return { state, message: "No active pane" };
  }

  const activeCenterX = activePane.x + activePane.width / 2;
  const activeCenterY = activePane.y + activePane.height / 2;

  let candidates: TmuxPane[] = [];

  switch (direction) {
    case "up":
      candidates = window.panes.filter(
        (p) => p.id !== activePane.id && p.y + p.height <= activePane.y
      );
      break;
    case "down":
      candidates = window.panes.filter(
        (p) => p.id !== activePane.id && p.y >= activePane.y + activePane.height
      );
      break;
    case "left":
      candidates = window.panes.filter(
        (p) => p.id !== activePane.id && p.x + p.width <= activePane.x
      );
      break;
    case "right":
      candidates = window.panes.filter(
        (p) => p.id !== activePane.id && p.x >= activePane.x + activePane.width
      );
      break;
  }

  if (candidates.length === 0) {
    return { state, message: `No pane ${direction}` };
  }

  const bestCandidate = candidates.reduce((best, current) => {
    const bestCenterX = best.x + best.width / 2;
    const bestCenterY = best.y + best.height / 2;
    const currentCenterX = current.x + current.width / 2;
    const currentCenterY = current.y + current.height / 2;

    const bestDistance = Math.sqrt(
      Math.pow(bestCenterX - activeCenterX, 2) +
        Math.pow(bestCenterY - activeCenterY, 2)
    );
    const currentDistance = Math.sqrt(
      Math.pow(currentCenterX - activeCenterX, 2) +
        Math.pow(currentCenterY - activeCenterY, 2)
    );

    return currentDistance < bestDistance ? current : best;
  });

  return selectPane(state, bestCandidate.id);
}

export function toggleZoom(state: TmuxState): TmuxPaneResult {
  const window = getActiveWindow(state);
  if (!window) {
    return { state, message: "No active window" };
  }

  const activePane = getActivePane(window);
  if (!activePane) {
    return { state, message: "No active pane" };
  }

  if (window.panes.length === 1) {
    return { state, message: "Only one pane in window" };
  }

  const updatedPanes = window.panes.map((p) =>
    p.id === activePane.id ? { ...p, isZoomed: !p.isZoomed } : p
  );

  const updatedWindow: TmuxWindow = {
    ...window,
    panes: updatedPanes,
  };

  const isNowZoomed = !activePane.isZoomed;

  return {
    state: updateWindowInState(state, updatedWindow),
    message: isNowZoomed ? "Pane zoomed" : "Pane unzoomed",
  };
}

export function resizePane(
  state: TmuxState,
  direction: "up" | "down" | "left" | "right",
  amount: number = 5
): TmuxPaneResult {
  const window = getActiveWindow(state);
  if (!window) {
    return { state, message: "No active window" };
  }

  const activePane = getActivePane(window);
  if (!activePane) {
    return { state, message: "No active pane" };
  }

  const updatedPanes = [...window.panes];
  const paneIndex = updatedPanes.findIndex((p) => p.id === activePane.id);
  const pane = { ...updatedPanes[paneIndex] };

  switch (direction) {
    case "up":
      if (pane.height - amount >= MIN_PANE_HEIGHT) {
        pane.height -= amount;
      }
      break;
    case "down":
      pane.height += amount;
      break;
    case "left":
      if (pane.width - amount >= MIN_PANE_WIDTH) {
        pane.width -= amount;
      }
      break;
    case "right":
      pane.width += amount;
      break;
  }

  updatedPanes[paneIndex] = pane;

  const updatedWindow: TmuxWindow = {
    ...window,
    panes: updatedPanes,
    layout: "custom",
  };

  return {
    state: updateWindowInState(state, updatedWindow),
    message: `Resized pane ${direction}`,
  };
}

export function swapPane(
  state: TmuxState,
  direction: "up" | "down" | "left" | "right"
): TmuxPaneResult {
  const window = getActiveWindow(state);
  if (!window) {
    return { state, message: "No active window" };
  }

  const activePane = getActivePane(window);
  if (!activePane) {
    return { state, message: "No active pane" };
  }

  const selectResult = selectPaneDirection(state, direction);
  if (selectResult.message?.includes("No pane")) {
    return { state, message: `No pane to swap with ${direction}` };
  }

  const targetWindow = getActiveWindow(selectResult.state);
  if (!targetWindow) {
    return { state, message: "No target window" };
  }

  const targetPane = getActivePane(targetWindow);
  if (!targetPane || targetPane.id === activePane.id) {
    return { state, message: "No target pane to swap" };
  }

  const updatedPanes = window.panes.map((p) => {
    if (p.id === activePane.id) {
      return {
        ...p,
        x: targetPane.x,
        y: targetPane.y,
        width: targetPane.width,
        height: targetPane.height,
      };
    }
    if (p.id === targetPane.id) {
      return {
        ...p,
        x: activePane.x,
        y: activePane.y,
        width: activePane.width,
        height: activePane.height,
      };
    }
    return p;
  });

  const updatedWindow: TmuxWindow = {
    ...window,
    panes: updatedPanes,
    layout: "custom",
  };

  return {
    state: updateWindowInState(state, updatedWindow),
    message: `Swapped panes`,
  };
}

export function getPaneCount(state: TmuxState): number {
  const window = getActiveWindow(state);
  return window?.panes.length ?? 0;
}

export function getPaneDimensions(pane: TmuxPane): {
  widthPercent: number;
  heightPercent: number;
} {
  return {
    widthPercent: toPercentage(pane.width, DEFAULT_TERMINAL_WIDTH),
    heightPercent: toPercentage(pane.height, DEFAULT_TERMINAL_HEIGHT),
  };
}
