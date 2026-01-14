import type { TmuxState, TmuxSession, TmuxWindow, TmuxPane } from "../types";
import {
  createDefaultSession,
  createDefaultWindow,
  createDefaultPane,
} from "../constants";

export interface TmuxStateResult {
  state: TmuxState;
  message?: string;
}

let sessionCounter = 1;
let windowCounter = 1;
let paneCounter = 1;

function generateSessionId(): string {
  return `session-${++sessionCounter}`;
}

function generateWindowId(): string {
  return `window-${++windowCounter}`;
}

function generatePaneId(): string {
  return `pane-${++paneCounter}`;
}

export function getActiveSession(state: TmuxState): TmuxSession | undefined {
  return state.sessions.find((s) => s.id === state.activeSessionId);
}

export function getActiveWindow(session: TmuxSession): TmuxWindow | undefined {
  return session.windows.find((w) => w.id === session.activeWindowId);
}

export function getActivePane(window: TmuxWindow): TmuxPane | undefined {
  return window.panes.find((p) => p.id === window.activePaneId);
}

export function createSession(state: TmuxState, name: string): TmuxStateResult {
  const sessionId = generateSessionId();
  const windowId = generateWindowId();
  const paneId = generatePaneId();

  const pane = createDefaultPane(paneId);
  const window: TmuxWindow = {
    ...createDefaultWindow(windowId, "main", 0),
    panes: [pane],
    activePaneId: pane.id,
  };

  const newSession: TmuxSession = {
    id: sessionId,
    name,
    windows: [window],
    activeWindowId: window.id,
    lastActiveWindowId: null,
    createdAt: Date.now(),
    attached: true,
  };

  const updatedSessions = state.sessions.map((s) => ({
    ...s,
    attached: false,
  }));

  return {
    state: {
      ...state,
      sessions: [...updatedSessions, newSession],
      activeSessionId: newSession.id,
      message: null,
      messageType: null,
    },
    message: `Created session "${name}"`,
  };
}

export function renameSession(
  state: TmuxState,
  newName: string
): TmuxStateResult {
  const activeSession = getActiveSession(state);
  if (!activeSession) {
    return {
      state: {
        ...state,
        message: "No active session",
        messageType: "error",
      },
      message: "No active session",
    };
  }

  const existingSession = state.sessions.find(
    (s) => s.name === newName && s.id !== activeSession.id
  );
  if (existingSession) {
    return {
      state: {
        ...state,
        message: `Session name "${newName}" already exists`,
        messageType: "error",
      },
      message: `Session name "${newName}" already exists`,
    };
  }

  const oldName = activeSession.name;
  const updatedSessions = state.sessions.map((s) =>
    s.id === activeSession.id ? { ...s, name: newName } : s
  );

  return {
    state: {
      ...state,
      sessions: updatedSessions,
      message: `Renamed session "${oldName}" to "${newName}"`,
      messageType: "info",
    },
    message: `Renamed session "${oldName}" to "${newName}"`,
  };
}

export interface SessionListItem {
  id: string;
  name: string;
  windowCount: number;
  attached: boolean;
  createdAt: number;
  isActive: boolean;
}

export function listSessions(state: TmuxState): SessionListItem[] {
  return state.sessions.map((session) => ({
    id: session.id,
    name: session.name,
    windowCount: session.windows.length,
    attached: session.attached,
    createdAt: session.createdAt,
    isActive: session.id === state.activeSessionId,
  }));
}

export function goToPreviousSession(state: TmuxState): TmuxStateResult {
  if (state.sessions.length <= 1) {
    return {
      state: {
        ...state,
        message: "No previous session",
        messageType: "info",
      },
      message: "No previous session",
    };
  }

  const currentIndex = state.sessions.findIndex(
    (s) => s.id === state.activeSessionId
  );
  const prevIndex =
    currentIndex <= 0 ? state.sessions.length - 1 : currentIndex - 1;
  const prevSession = state.sessions[prevIndex];

  const updatedSessions = state.sessions.map((s) => ({
    ...s,
    attached: s.id === prevSession.id,
  }));

  return {
    state: {
      ...state,
      sessions: updatedSessions,
      activeSessionId: prevSession.id,
      message: `Switched to session "${prevSession.name}"`,
      messageType: "info",
    },
    message: `Switched to session "${prevSession.name}"`,
  };
}

export function goToNextSession(state: TmuxState): TmuxStateResult {
  if (state.sessions.length <= 1) {
    return {
      state: {
        ...state,
        message: "No next session",
        messageType: "info",
      },
      message: "No next session",
    };
  }

  const currentIndex = state.sessions.findIndex(
    (s) => s.id === state.activeSessionId
  );
  const nextIndex = (currentIndex + 1) % state.sessions.length;
  const nextSession = state.sessions[nextIndex];

  const updatedSessions = state.sessions.map((s) => ({
    ...s,
    attached: s.id === nextSession.id,
  }));

  return {
    state: {
      ...state,
      sessions: updatedSessions,
      activeSessionId: nextSession.id,
      message: `Switched to session "${nextSession.name}"`,
      messageType: "info",
    },
    message: `Switched to session "${nextSession.name}"`,
  };
}

let lastSessionId: string | null = null;

export function switchToLastSession(state: TmuxState): TmuxStateResult {
  if (!lastSessionId || state.sessions.length <= 1) {
    return {
      state: {
        ...state,
        message: "No last session",
        messageType: "info",
      },
      message: "No last session",
    };
  }

  const targetSession = state.sessions.find((s) => s.id === lastSessionId);
  if (!targetSession) {
    return {
      state: {
        ...state,
        message: "Last session no longer exists",
        messageType: "error",
      },
      message: "Last session no longer exists",
    };
  }

  const previousActiveSessionId = state.activeSessionId;
  lastSessionId = previousActiveSessionId;

  const updatedSessions = state.sessions.map((s) => ({
    ...s,
    attached: s.id === targetSession.id,
  }));

  return {
    state: {
      ...state,
      sessions: updatedSessions,
      activeSessionId: targetSession.id,
      message: `Switched to session "${targetSession.name}"`,
      messageType: "info",
    },
    message: `Switched to session "${targetSession.name}"`,
  };
}

export function switchToSession(
  state: TmuxState,
  sessionId: string
): TmuxStateResult {
  const targetSession = state.sessions.find((s) => s.id === sessionId);
  if (!targetSession) {
    return {
      state: {
        ...state,
        message: "Session not found",
        messageType: "error",
      },
      message: "Session not found",
    };
  }

  if (targetSession.id === state.activeSessionId) {
    return {
      state,
      message: "Already in this session",
    };
  }

  lastSessionId = state.activeSessionId;

  const updatedSessions = state.sessions.map((s) => ({
    ...s,
    attached: s.id === targetSession.id,
  }));

  return {
    state: {
      ...state,
      sessions: updatedSessions,
      activeSessionId: targetSession.id,
      message: `Switched to session "${targetSession.name}"`,
      messageType: "info",
    },
    message: `Switched to session "${targetSession.name}"`,
  };
}

export function detachSession(state: TmuxState): TmuxStateResult {
  const activeSession = getActiveSession(state);
  if (!activeSession) {
    return {
      state: {
        ...state,
        message: "No active session",
        messageType: "error",
      },
      message: "No active session",
    };
  }

  const updatedSessions = state.sessions.map((s) =>
    s.id === activeSession.id ? { ...s, attached: false } : s
  );

  return {
    state: {
      ...state,
      sessions: updatedSessions,
      message: `[detached (from session ${activeSession.name})]`,
      messageType: "info",
    },
    message: `[detached (from session ${activeSession.name})]`,
  };
}

export function killSession(
  state: TmuxState,
  sessionId?: string
): TmuxStateResult {
  const targetId = sessionId || state.activeSessionId;
  const targetSession = state.sessions.find((s) => s.id === targetId);

  if (!targetSession) {
    return {
      state: {
        ...state,
        message: "Session not found",
        messageType: "error",
      },
      message: "Session not found",
    };
  }

  if (state.sessions.length === 1) {
    return {
      state: {
        ...state,
        message: "Cannot kill the last session",
        messageType: "error",
      },
      message: "Cannot kill the last session",
    };
  }

  const remainingSessions = state.sessions.filter((s) => s.id !== targetId);
  const newActiveSessionId =
    targetId === state.activeSessionId
      ? remainingSessions[0].id
      : state.activeSessionId;

  const updatedSessions = remainingSessions.map((s) => ({
    ...s,
    attached: s.id === newActiveSessionId,
  }));

  if (lastSessionId === targetId) {
    lastSessionId = null;
  }

  return {
    state: {
      ...state,
      sessions: updatedSessions,
      activeSessionId: newActiveSessionId,
      message: `Killed session "${targetSession.name}"`,
      messageType: "info",
    },
    message: `Killed session "${targetSession.name}"`,
  };
}

export function resetSessionCounters(): void {
  sessionCounter = 1;
  windowCounter = 1;
  paneCounter = 1;
  lastSessionId = null;
}
