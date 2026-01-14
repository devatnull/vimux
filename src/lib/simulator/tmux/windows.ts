import type { TmuxState, TmuxSession, TmuxWindow } from "../types";
import { createDefaultWindow, createDefaultPane } from "../constants";

export interface TmuxWindowResult {
  state: TmuxState;
  message?: string;
}

function getActiveSession(state: TmuxState): TmuxSession | undefined {
  return state.sessions.find((s) => s.id === state.activeSessionId);
}

function getActiveWindow(session: TmuxSession): TmuxWindow | undefined {
  return session.windows.find((w) => w.id === session.activeWindowId);
}

function updateSession(state: TmuxState, session: TmuxSession): TmuxState {
  return {
    ...state,
    sessions: state.sessions.map((s) => (s.id === session.id ? session : s)),
  };
}

function generateWindowId(): string {
  return `window-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function reindexWindows(windows: TmuxWindow[]): TmuxWindow[] {
  return windows.map((w, i) => ({ ...w, index: i }));
}

export function createWindow(state: TmuxState): TmuxWindowResult {
  const session = getActiveSession(state);
  if (!session) {
    return {
      state,
      message: "No active session",
    };
  }

  const currentWindow = getActiveWindow(session);
  const newWindowId = generateWindowId();
  const newIndex = session.windows.length;
  const newWindow = createDefaultWindow(newWindowId, `window-${newIndex}`, newIndex);

  newWindow.panes = [createDefaultPane(`pane-${newWindowId}-1`)];
  newWindow.activePaneId = newWindow.panes[0].id;

  const updatedWindows = session.windows.map((w) => ({ ...w, isActive: false }));
  updatedWindows.push({ ...newWindow, isActive: true });

  const updatedSession: TmuxSession = {
    ...session,
    windows: updatedWindows,
    activeWindowId: newWindowId,
    lastActiveWindowId: currentWindow?.id ?? null,
  };

  return {
    state: updateSession(state, updatedSession),
    message: `Created window ${newIndex}`,
  };
}

export function killWindow(state: TmuxState): TmuxWindowResult {
  const session = getActiveSession(state);
  if (!session) {
    return { state, message: "No active session" };
  }

  if (session.windows.length <= 1) {
    return { state, message: "Cannot kill the only window" };
  }

  const currentWindow = getActiveWindow(session);
  if (!currentWindow) {
    return { state, message: "No active window" };
  }

  const currentIndex = session.windows.findIndex((w) => w.id === currentWindow.id);
  const remainingWindows = session.windows.filter((w) => w.id !== currentWindow.id);
  const reindexedWindows = reindexWindows(remainingWindows);

  const nextIndex = Math.min(currentIndex, reindexedWindows.length - 1);
  const nextWindow = reindexedWindows[nextIndex];

  const updatedWindows = reindexedWindows.map((w) => ({
    ...w,
    isActive: w.id === nextWindow.id,
  }));

  const updatedSession: TmuxSession = {
    ...session,
    windows: updatedWindows,
    activeWindowId: nextWindow.id,
    lastActiveWindowId:
      session.lastActiveWindowId === currentWindow.id ? null : session.lastActiveWindowId,
  };

  return {
    state: updateSession(state, updatedSession),
    message: `Killed window ${currentWindow.index}: ${currentWindow.name}`,
  };
}

export function renameWindow(state: TmuxState, newName: string): TmuxWindowResult {
  const session = getActiveSession(state);
  if (!session) {
    return { state, message: "No active session" };
  }

  const currentWindow = getActiveWindow(session);
  if (!currentWindow) {
    return { state, message: "No active window" };
  }

  const updatedWindows = session.windows.map((w) =>
    w.id === currentWindow.id ? { ...w, name: newName } : w
  );

  const updatedSession: TmuxSession = {
    ...session,
    windows: updatedWindows,
  };

  return {
    state: updateSession(state, updatedSession),
    message: `Renamed window to: ${newName}`,
  };
}

export function moveWindow(state: TmuxState, targetIndex: number): TmuxWindowResult {
  const session = getActiveSession(state);
  if (!session) {
    return { state, message: "No active session" };
  }

  const currentWindow = getActiveWindow(session);
  if (!currentWindow) {
    return { state, message: "No active window" };
  }

  const clampedTarget = Math.max(0, Math.min(targetIndex, session.windows.length - 1));
  if (clampedTarget === currentWindow.index) {
    return { state, message: "Window already at target position" };
  }

  const windowsCopy = [...session.windows];
  const currentIdx = windowsCopy.findIndex((w) => w.id === currentWindow.id);
  const [movedWindow] = windowsCopy.splice(currentIdx, 1);
  windowsCopy.splice(clampedTarget, 0, movedWindow);

  const reindexedWindows = reindexWindows(windowsCopy);

  const updatedSession: TmuxSession = {
    ...session,
    windows: reindexedWindows,
  };

  return {
    state: updateSession(state, updatedSession),
    message: `Moved window to index ${clampedTarget}`,
  };
}

export interface WindowListItem {
  id: string;
  index: number;
  name: string;
  isActive: boolean;
  paneCount: number;
}

export function listWindows(state: TmuxState): WindowListItem[] {
  const session = getActiveSession(state);
  if (!session) {
    return [];
  }

  return session.windows.map((w) => ({
    id: w.id,
    index: w.index,
    name: w.name,
    isActive: w.isActive,
    paneCount: w.panes.length,
  }));
}

export function switchToWindow(state: TmuxState, index: number): TmuxWindowResult {
  const session = getActiveSession(state);
  if (!session) {
    return { state, message: "No active session" };
  }

  const targetWindow = session.windows.find((w) => w.index === index);
  if (!targetWindow) {
    return { state, message: `Window ${index} not found` };
  }

  if (targetWindow.id === session.activeWindowId) {
    return { state, message: `Already on window ${index}` };
  }

  const currentWindow = getActiveWindow(session);

  const updatedWindows = session.windows.map((w) => ({
    ...w,
    isActive: w.id === targetWindow.id,
  }));

  const updatedSession: TmuxSession = {
    ...session,
    windows: updatedWindows,
    activeWindowId: targetWindow.id,
    lastActiveWindowId: currentWindow?.id ?? null,
  };

  return {
    state: updateSession(state, updatedSession),
    message: `Switched to window ${index}: ${targetWindow.name}`,
  };
}

export function goToNextWindow(state: TmuxState): TmuxWindowResult {
  const session = getActiveSession(state);
  if (!session) {
    return { state, message: "No active session" };
  }

  const currentWindow = getActiveWindow(session);
  if (!currentWindow) {
    return { state, message: "No active window" };
  }

  const nextIndex = (currentWindow.index + 1) % session.windows.length;
  return switchToWindow(state, nextIndex);
}

export function goToPreviousWindow(state: TmuxState): TmuxWindowResult {
  const session = getActiveSession(state);
  if (!session) {
    return { state, message: "No active session" };
  }

  const currentWindow = getActiveWindow(session);
  if (!currentWindow) {
    return { state, message: "No active window" };
  }

  const prevIndex =
    currentWindow.index === 0 ? session.windows.length - 1 : currentWindow.index - 1;
  return switchToWindow(state, prevIndex);
}

export function goToLastWindow(state: TmuxState): TmuxWindowResult {
  const session = getActiveSession(state);
  if (!session) {
    return { state, message: "No active session" };
  }

  if (!session.lastActiveWindowId) {
    return { state, message: "No last window" };
  }

  const lastWindow = session.windows.find((w) => w.id === session.lastActiveWindowId);
  if (!lastWindow) {
    return { state, message: "Last window no longer exists" };
  }

  return switchToWindow(state, lastWindow.index);
}

export function findWindowByName(
  state: TmuxState,
  name: string
): TmuxWindowResult {
  const session = getActiveSession(state);
  if (!session) {
    return { state, message: "No active session" };
  }

  const lowerName = name.toLowerCase();
  const matchingWindow = session.windows.find((w) =>
    w.name.toLowerCase().includes(lowerName)
  );

  if (!matchingWindow) {
    return { state, message: `No window matching: ${name}` };
  }

  return switchToWindow(state, matchingWindow.index);
}
