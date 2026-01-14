import { describe, it, expect } from "vitest";
import type { TmuxState, TmuxSession, TmuxWindow, TmuxPane } from "../types";
import {
  splitHorizontal,
  splitVertical,
  closePane,
  selectPane,
  selectPaneDirection,
  toggleZoom,
  resizePane,
  getPaneCount,
} from "../tmux/panes";
import {
  createWindow,
  killWindow,
  renameWindow,
  switchToWindow,
  goToNextWindow,
  goToPreviousWindow,
  listWindows,
} from "../tmux/windows";
import {
  createDefaultTmuxState,
  createDefaultPane,
  createDefaultWindow,
  createDefaultSession,
  DEFAULT_TERMINAL_WIDTH,
  DEFAULT_TERMINAL_HEIGHT,
} from "../constants";

function createTestTmuxState(): TmuxState {
  return createDefaultTmuxState();
}

function createTmuxStateWithPanes(paneCount: number): TmuxState {
  const state = createTestTmuxState();
  for (let i = 1; i < paneCount; i++) {
    const result = splitVertical(state);
    Object.assign(state, result.state);
  }
  return state;
}

describe("Pane operations", () => {
  describe("splitHorizontal", () => {
    it("splits pane horizontally creating two panes", () => {
      const state = createTestTmuxState();
      expect(getPaneCount(state)).toBe(1);
      const { state: newState, message } = splitHorizontal(state);
      expect(getPaneCount(newState)).toBe(2);
      expect(message).toContain("Split");
    });

    it("new pane becomes active after split", () => {
      const state = createTestTmuxState();
      const { state: newState } = splitHorizontal(state);
      const session = newState.sessions[0];
      const window = session.windows[0];
      const activePane = window.panes.find((p) => p.id === window.activePaneId);
      expect(activePane?.isActive).toBe(true);
    });

    it("adjusts pane heights after horizontal split", () => {
      const state = createTestTmuxState();
      const originalHeight = state.sessions[0].windows[0].panes[0].height;
      const { state: newState } = splitHorizontal(state);
      const panes = newState.sessions[0].windows[0].panes;
      const totalHeight = panes.reduce((sum, p) => sum + p.height, 0);
      expect(totalHeight).toBe(originalHeight);
    });
  });

  describe("splitVertical", () => {
    it("splits pane vertically creating two panes", () => {
      const state = createTestTmuxState();
      const { state: newState, message } = splitVertical(state);
      expect(getPaneCount(newState)).toBe(2);
      expect(message).toContain("Split");
    });

    it("adjusts pane widths after vertical split", () => {
      const state = createTestTmuxState();
      const originalWidth = state.sessions[0].windows[0].panes[0].width;
      const { state: newState } = splitVertical(state);
      const panes = newState.sessions[0].windows[0].panes;
      const totalWidth = panes.reduce((sum, p) => sum + p.width, 0);
      expect(totalWidth).toBe(originalWidth);
    });
  });

  describe("closePane", () => {
    it("closes pane and reduces pane count", () => {
      let state = createTestTmuxState();
      state = splitVertical(state).state;
      expect(getPaneCount(state)).toBe(2);
      const { state: newState, message } = closePane(state);
      expect(getPaneCount(newState)).toBe(1);
      expect(message).toBe("Pane closed");
    });

    it("cannot close the only pane", () => {
      const state = createTestTmuxState();
      const { state: newState, message } = closePane(state);
      expect(getPaneCount(newState)).toBe(1);
      expect(message).toContain("Cannot close");
    });
  });

  describe("selectPane", () => {
    it("selects pane by id", () => {
      let state = createTestTmuxState();
      state = splitVertical(state).state;
      const window = state.sessions[0].windows[0];
      const inactivePane = window.panes.find((p) => !p.isActive);
      expect(inactivePane).toBeDefined();
      const { state: newState } = selectPane(state, inactivePane!.id);
      expect(newState.sessions[0].windows[0].activePaneId).toBe(inactivePane!.id);
    });

    it("returns error for non-existent pane", () => {
      const state = createTestTmuxState();
      const { message } = selectPane(state, "non-existent-pane");
      expect(message).toContain("not found");
    });
  });

  describe("selectPaneDirection", () => {
    it("selects pane to the right", () => {
      let state = createTestTmuxState();
      state = splitVertical(state).state;
      const window = state.sessions[0].windows[0];
      const leftPane = window.panes.find((p) => p.x === 0);
      state = selectPane(state, leftPane!.id).state;
      const { state: newState } = selectPaneDirection(state, "right");
      expect(newState.sessions[0].windows[0].activePaneId).not.toBe(leftPane!.id);
    });

    it("returns message when no pane in direction", () => {
      const state = createTestTmuxState();
      const { message } = selectPaneDirection(state, "right");
      expect(message).toContain("No pane");
    });
  });

  describe("toggleZoom", () => {
    it("zooms the active pane", () => {
      let state = createTestTmuxState();
      state = splitVertical(state).state;
      const { state: newState, message } = toggleZoom(state);
      const window = newState.sessions[0].windows[0];
      const activePane = window.panes.find((p) => p.id === window.activePaneId);
      expect(activePane?.isZoomed).toBe(true);
      expect(message).toContain("zoomed");
    });

    it("unzooms when already zoomed", () => {
      let state = createTestTmuxState();
      state = splitVertical(state).state;
      state = toggleZoom(state).state;
      const { state: newState, message } = toggleZoom(state);
      const window = newState.sessions[0].windows[0];
      const activePane = window.panes.find((p) => p.id === window.activePaneId);
      expect(activePane?.isZoomed).toBe(false);
      expect(message).toContain("unzoomed");
    });
  });

  describe("resizePane", () => {
    it("increases pane width when resizing right", () => {
      let state = createTestTmuxState();
      state = splitVertical(state).state;
      const window = state.sessions[0].windows[0];
      const activePane = window.panes.find((p) => p.id === window.activePaneId);
      const originalWidth = activePane!.width;
      const { state: newState } = resizePane(state, "right", 5);
      const newWindow = newState.sessions[0].windows[0];
      const resizedPane = newWindow.panes.find((p) => p.id === window.activePaneId);
      expect(resizedPane!.width).toBe(originalWidth + 5);
    });
  });
});

describe("Window operations", () => {
  describe("createWindow", () => {
    it("creates a new window", () => {
      const state = createTestTmuxState();
      const { state: newState, message } = createWindow(state);
      expect(newState.sessions[0].windows).toHaveLength(2);
      expect(message).toContain("Created window");
    });

    it("new window becomes active", () => {
      const state = createTestTmuxState();
      const { state: newState } = createWindow(state);
      const newWindow = newState.sessions[0].windows[1];
      expect(newWindow.isActive).toBe(true);
      expect(newState.sessions[0].activeWindowId).toBe(newWindow.id);
    });

    it("new window has one pane", () => {
      const state = createTestTmuxState();
      const { state: newState } = createWindow(state);
      const newWindow = newState.sessions[0].windows[1];
      expect(newWindow.panes).toHaveLength(1);
    });
  });

  describe("killWindow", () => {
    it("kills active window", () => {
      let state = createTestTmuxState();
      state = createWindow(state).state;
      expect(state.sessions[0].windows).toHaveLength(2);
      const { state: newState, message } = killWindow(state);
      expect(newState.sessions[0].windows).toHaveLength(1);
      expect(message).toContain("Killed window");
    });

    it("cannot kill the only window", () => {
      const state = createTestTmuxState();
      const { state: newState, message } = killWindow(state);
      expect(newState.sessions[0].windows).toHaveLength(1);
      expect(message).toContain("Cannot kill");
    });
  });

  describe("renameWindow", () => {
    it("renames the active window", () => {
      const state = createTestTmuxState();
      const { state: newState, message } = renameWindow(state, "editor");
      const window = newState.sessions[0].windows[0];
      expect(window.name).toBe("editor");
      expect(message).toContain("Renamed");
    });
  });

  describe("switchToWindow", () => {
    it("switches to window by index", () => {
      let state = createTestTmuxState();
      state = createWindow(state).state;
      state = switchToWindow(state, 0).state;
      expect(state.sessions[0].activeWindowId).toBe(state.sessions[0].windows[0].id);
      const { state: newState, message } = switchToWindow(state, 1);
      expect(newState.sessions[0].activeWindowId).toBe(newState.sessions[0].windows[1].id);
      expect(message).toContain("Switched to window");
    });

    it("returns error for non-existent window", () => {
      const state = createTestTmuxState();
      const { message } = switchToWindow(state, 99);
      expect(message).toContain("not found");
    });
  });

  describe("goToNextWindow", () => {
    it("switches to next window", () => {
      let state = createTestTmuxState();
      state = createWindow(state).state;
      state = switchToWindow(state, 0).state;
      const { state: newState } = goToNextWindow(state);
      expect(newState.sessions[0].activeWindowId).toBe(newState.sessions[0].windows[1].id);
    });

    it("wraps around to first window", () => {
      let state = createTestTmuxState();
      state = createWindow(state).state;
      const { state: newState } = goToNextWindow(state);
      expect(newState.sessions[0].activeWindowId).toBe(newState.sessions[0].windows[0].id);
    });
  });

  describe("goToPreviousWindow", () => {
    it("switches to previous window", () => {
      let state = createTestTmuxState();
      state = createWindow(state).state;
      const { state: newState } = goToPreviousWindow(state);
      expect(newState.sessions[0].activeWindowId).toBe(newState.sessions[0].windows[0].id);
    });

    it("wraps around to last window", () => {
      let state = createTestTmuxState();
      state = createWindow(state).state;
      state = switchToWindow(state, 0).state;
      const { state: newState } = goToPreviousWindow(state);
      expect(newState.sessions[0].activeWindowId).toBe(newState.sessions[0].windows[1].id);
    });
  });

  describe("listWindows", () => {
    it("lists all windows in session", () => {
      let state = createTestTmuxState();
      state = createWindow(state).state;
      const windows = listWindows(state);
      expect(windows).toHaveLength(2);
      expect(windows[0]).toHaveProperty("id");
      expect(windows[0]).toHaveProperty("name");
      expect(windows[0]).toHaveProperty("index");
      expect(windows[0]).toHaveProperty("isActive");
      expect(windows[0]).toHaveProperty("paneCount");
    });

    it("marks active window correctly", () => {
      let state = createTestTmuxState();
      state = createWindow(state).state;
      const windows = listWindows(state);
      const activeWindow = windows.find((w) => w.isActive);
      expect(activeWindow).toBeDefined();
      expect(activeWindow?.index).toBe(1);
    });
  });
});
