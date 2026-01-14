import type { TmuxState, TmuxPane, TmuxLayout } from "../types";
import {
  DEFAULT_TERMINAL_WIDTH,
  DEFAULT_TERMINAL_HEIGHT,
} from "../constants";

export interface TmuxResizeResult {
  state: TmuxState;
  message?: string;
}

const DEFAULT_RESIZE_AMOUNT = 5;
const MIN_PANE_WIDTH = 10;
const MIN_PANE_HEIGHT = 3;

const LAYOUT_ORDER: TmuxLayout[] = [
  "even-horizontal",
  "even-vertical",
  "main-horizontal",
  "main-vertical",
  "tiled",
];

function getActiveWindow(state: TmuxState) {
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  if (!session) return null;
  return session.windows.find((w) => w.id === session.activeWindowId) ?? null;
}

function getActivePane(state: TmuxState): TmuxPane | null {
  const window = getActiveWindow(state);
  if (!window) return null;
  return window.panes.find((p) => p.id === window.activePaneId) ?? null;
}

function cloneState(state: TmuxState): TmuxState {
  return JSON.parse(JSON.stringify(state));
}

function findAdjacentPane(
  panes: TmuxPane[],
  activePane: TmuxPane,
  direction: "left" | "right" | "up" | "down"
): TmuxPane | null {
  for (const pane of panes) {
    if (pane.id === activePane.id) continue;

    switch (direction) {
      case "left":
        if (
          pane.x + pane.width === activePane.x &&
          pane.y < activePane.y + activePane.height &&
          pane.y + pane.height > activePane.y
        ) {
          return pane;
        }
        break;
      case "right":
        if (
          activePane.x + activePane.width === pane.x &&
          pane.y < activePane.y + activePane.height &&
          pane.y + pane.height > activePane.y
        ) {
          return pane;
        }
        break;
      case "up":
        if (
          pane.y + pane.height === activePane.y &&
          pane.x < activePane.x + activePane.width &&
          pane.x + pane.width > activePane.x
        ) {
          return pane;
        }
        break;
      case "down":
        if (
          activePane.y + activePane.height === pane.y &&
          pane.x < activePane.x + activePane.width &&
          pane.x + pane.width > activePane.x
        ) {
          return pane;
        }
        break;
    }
  }
  return null;
}

export function resizeLeft(
  state: TmuxState,
  amount: number = DEFAULT_RESIZE_AMOUNT
): TmuxResizeResult {
  const newState = cloneState(state);
  const window = getActiveWindow(newState);
  if (!window) {
    return { state: newState, message: "No active window" };
  }

  const activePane = window.panes.find((p) => p.id === window.activePaneId);
  if (!activePane) {
    return { state: newState, message: "No active pane" };
  }

  if (activePane.isZoomed) {
    return { state: newState, message: "Cannot resize zoomed pane" };
  }

  const leftNeighbor = findAdjacentPane(window.panes, activePane, "left");
  const rightNeighbor = findAdjacentPane(window.panes, activePane, "right");

  if (leftNeighbor) {
    if (leftNeighbor.width - amount < MIN_PANE_WIDTH) {
      return { state: newState, message: "Pane at minimum width" };
    }
    leftNeighbor.width -= amount;
    activePane.x -= amount;
    activePane.width += amount;
  } else if (rightNeighbor) {
    if (activePane.width - amount < MIN_PANE_WIDTH) {
      return { state: newState, message: "Pane at minimum width" };
    }
    activePane.width -= amount;
    rightNeighbor.x -= amount;
    rightNeighbor.width += amount;
  } else {
    return { state: newState, message: "Cannot resize in this direction" };
  }

  window.layout = "custom";
  return { state: newState };
}

export function resizeRight(
  state: TmuxState,
  amount: number = DEFAULT_RESIZE_AMOUNT
): TmuxResizeResult {
  const newState = cloneState(state);
  const window = getActiveWindow(newState);
  if (!window) {
    return { state: newState, message: "No active window" };
  }

  const activePane = window.panes.find((p) => p.id === window.activePaneId);
  if (!activePane) {
    return { state: newState, message: "No active pane" };
  }

  if (activePane.isZoomed) {
    return { state: newState, message: "Cannot resize zoomed pane" };
  }

  const rightNeighbor = findAdjacentPane(window.panes, activePane, "right");
  const leftNeighbor = findAdjacentPane(window.panes, activePane, "left");

  if (rightNeighbor) {
    if (rightNeighbor.width - amount < MIN_PANE_WIDTH) {
      return { state: newState, message: "Pane at minimum width" };
    }
    activePane.width += amount;
    rightNeighbor.x += amount;
    rightNeighbor.width -= amount;
  } else if (leftNeighbor) {
    if (activePane.width - amount < MIN_PANE_WIDTH) {
      return { state: newState, message: "Pane at minimum width" };
    }
    leftNeighbor.width += amount;
    activePane.x += amount;
    activePane.width -= amount;
  } else {
    return { state: newState, message: "Cannot resize in this direction" };
  }

  window.layout = "custom";
  return { state: newState };
}

export function resizeUp(
  state: TmuxState,
  amount: number = DEFAULT_RESIZE_AMOUNT
): TmuxResizeResult {
  const newState = cloneState(state);
  const window = getActiveWindow(newState);
  if (!window) {
    return { state: newState, message: "No active window" };
  }

  const activePane = window.panes.find((p) => p.id === window.activePaneId);
  if (!activePane) {
    return { state: newState, message: "No active pane" };
  }

  if (activePane.isZoomed) {
    return { state: newState, message: "Cannot resize zoomed pane" };
  }

  const upNeighbor = findAdjacentPane(window.panes, activePane, "up");
  const downNeighbor = findAdjacentPane(window.panes, activePane, "down");

  if (upNeighbor) {
    if (upNeighbor.height - amount < MIN_PANE_HEIGHT) {
      return { state: newState, message: "Pane at minimum height" };
    }
    upNeighbor.height -= amount;
    activePane.y -= amount;
    activePane.height += amount;
  } else if (downNeighbor) {
    if (activePane.height - amount < MIN_PANE_HEIGHT) {
      return { state: newState, message: "Pane at minimum height" };
    }
    activePane.height -= amount;
    downNeighbor.y -= amount;
    downNeighbor.height += amount;
  } else {
    return { state: newState, message: "Cannot resize in this direction" };
  }

  window.layout = "custom";
  return { state: newState };
}

export function resizeDown(
  state: TmuxState,
  amount: number = DEFAULT_RESIZE_AMOUNT
): TmuxResizeResult {
  const newState = cloneState(state);
  const window = getActiveWindow(newState);
  if (!window) {
    return { state: newState, message: "No active window" };
  }

  const activePane = window.panes.find((p) => p.id === window.activePaneId);
  if (!activePane) {
    return { state: newState, message: "No active pane" };
  }

  if (activePane.isZoomed) {
    return { state: newState, message: "Cannot resize zoomed pane" };
  }

  const downNeighbor = findAdjacentPane(window.panes, activePane, "down");
  const upNeighbor = findAdjacentPane(window.panes, activePane, "up");

  if (downNeighbor) {
    if (downNeighbor.height - amount < MIN_PANE_HEIGHT) {
      return { state: newState, message: "Pane at minimum height" };
    }
    activePane.height += amount;
    downNeighbor.y += amount;
    downNeighbor.height -= amount;
  } else if (upNeighbor) {
    if (activePane.height - amount < MIN_PANE_HEIGHT) {
      return { state: newState, message: "Pane at minimum height" };
    }
    upNeighbor.height += amount;
    activePane.y += amount;
    activePane.height -= amount;
  } else {
    return { state: newState, message: "Cannot resize in this direction" };
  }

  window.layout = "custom";
  return { state: newState };
}

export function cycleLayout(state: TmuxState): TmuxResizeResult {
  const newState = cloneState(state);
  const window = getActiveWindow(newState);
  if (!window) {
    return { state: newState, message: "No active window" };
  }

  const currentIndex = LAYOUT_ORDER.indexOf(window.layout as TmuxLayout);
  const nextIndex =
    currentIndex === -1 ? 0 : (currentIndex + 1) % LAYOUT_ORDER.length;
  const nextLayout = LAYOUT_ORDER[nextIndex];

  return applyLayout(newState, nextLayout);
}

export function applyLayout(
  state: TmuxState,
  layout: TmuxLayout
): TmuxResizeResult {
  const newState = cloneState(state);
  const window = getActiveWindow(newState);
  if (!window) {
    return { state: newState, message: "No active window" };
  }

  const panes = window.panes;
  const paneCount = panes.length;

  if (paneCount === 0) {
    return { state: newState, message: "No panes in window" };
  }

  for (const pane of panes) {
    pane.isZoomed = false;
  }

  const totalWidth = DEFAULT_TERMINAL_WIDTH;
  const totalHeight = DEFAULT_TERMINAL_HEIGHT;

  switch (layout) {
    case "even-horizontal": {
      const paneWidth = Math.floor(totalWidth / paneCount);
      let x = 0;
      for (let i = 0; i < paneCount; i++) {
        panes[i].x = x;
        panes[i].y = 0;
        panes[i].width =
          i === paneCount - 1 ? totalWidth - x : paneWidth;
        panes[i].height = totalHeight;
        x += panes[i].width;
      }
      break;
    }

    case "even-vertical": {
      const paneHeight = Math.floor(totalHeight / paneCount);
      let y = 0;
      for (let i = 0; i < paneCount; i++) {
        panes[i].x = 0;
        panes[i].y = y;
        panes[i].width = totalWidth;
        panes[i].height =
          i === paneCount - 1 ? totalHeight - y : paneHeight;
        y += panes[i].height;
      }
      break;
    }

    case "main-horizontal": {
      if (paneCount === 1) {
        panes[0].x = 0;
        panes[0].y = 0;
        panes[0].width = totalWidth;
        panes[0].height = totalHeight;
      } else {
        const mainHeight = Math.floor(totalHeight * 0.6);
        panes[0].x = 0;
        panes[0].y = 0;
        panes[0].width = totalWidth;
        panes[0].height = mainHeight;

        const secondaryHeight = totalHeight - mainHeight;
        const secondaryWidth = Math.floor(totalWidth / (paneCount - 1));
        let x = 0;
        for (let i = 1; i < paneCount; i++) {
          panes[i].x = x;
          panes[i].y = mainHeight;
          panes[i].width =
            i === paneCount - 1 ? totalWidth - x : secondaryWidth;
          panes[i].height = secondaryHeight;
          x += panes[i].width;
        }
      }
      break;
    }

    case "main-vertical": {
      if (paneCount === 1) {
        panes[0].x = 0;
        panes[0].y = 0;
        panes[0].width = totalWidth;
        panes[0].height = totalHeight;
      } else {
        const mainWidth = Math.floor(totalWidth * 0.6);
        panes[0].x = 0;
        panes[0].y = 0;
        panes[0].width = mainWidth;
        panes[0].height = totalHeight;

        const secondaryWidth = totalWidth - mainWidth;
        const secondaryHeight = Math.floor(totalHeight / (paneCount - 1));
        let y = 0;
        for (let i = 1; i < paneCount; i++) {
          panes[i].x = mainWidth;
          panes[i].y = y;
          panes[i].width = secondaryWidth;
          panes[i].height =
            i === paneCount - 1 ? totalHeight - y : secondaryHeight;
          y += panes[i].height;
        }
      }
      break;
    }

    case "tiled": {
      const cols = Math.ceil(Math.sqrt(paneCount));
      const rows = Math.ceil(paneCount / cols);
      const cellWidth = Math.floor(totalWidth / cols);
      const cellHeight = Math.floor(totalHeight / rows);

      for (let i = 0; i < paneCount; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const isLastCol = col === cols - 1;
        const isLastRow = row === rows - 1;

        panes[i].x = col * cellWidth;
        panes[i].y = row * cellHeight;
        panes[i].width = isLastCol ? totalWidth - panes[i].x : cellWidth;
        panes[i].height = isLastRow ? totalHeight - panes[i].y : cellHeight;
      }
      break;
    }

    case "custom":
      break;
  }

  window.layout = layout;
  return { state: newState, message: `Layout: ${layout}` };
}
