import type {
  TmuxState,
  TmuxPane,
  TmuxWindow,
  TmuxSession,
} from "../types";
import {
  createDefaultPane,
  createDefaultWindow,
  DEFAULT_TERMINAL_WIDTH,
  DEFAULT_TERMINAL_HEIGHT,
} from "../constants";

export interface TmuxCommandResult {
  state: TmuxState;
  message?: string;
  shouldExit?: boolean;
}

function getActiveSession(state: TmuxState): TmuxSession | undefined {
  return state.sessions.find((s) => s.id === state.activeSessionId);
}

function getActiveWindow(state: TmuxState): TmuxWindow | undefined {
  const session = getActiveSession(state);
  return session?.windows.find((w) => w.id === session.activeWindowId);
}

function getActivePane(state: TmuxState): TmuxPane | undefined {
  const window = getActiveWindow(state);
  return window?.panes.find((p) => p.id === window.activePaneId);
}

function updateSession(state: TmuxState, session: TmuxSession): TmuxState {
  return {
    ...state,
    sessions: state.sessions.map((s) => (s.id === session.id ? session : s)),
  };
}

function updateWindow(session: TmuxSession, window: TmuxWindow): TmuxSession {
  return {
    ...session,
    windows: session.windows.map((w) => (w.id === window.id ? window : w)),
  };
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function enterCommandMode(state: TmuxState): TmuxCommandResult {
  return {
    state: {
      ...state,
      commandPrompt: "",
      prefixActive: false,
    },
    message: ":",
  };
}

export function exitCommandMode(state: TmuxState): TmuxCommandResult {
  return {
    state: {
      ...state,
      commandPrompt: null,
      message: null,
      messageType: null,
    },
    shouldExit: true,
  };
}

export function executeCommand(
  state: TmuxState,
  command: string
): TmuxCommandResult {
  const trimmed = command.trim();

  if (!trimmed) {
    return exitCommandMode(state);
  }

  let newHistory = [...state.commandPromptHistory];
  if (newHistory[newHistory.length - 1] !== trimmed) {
    newHistory = [...newHistory, trimmed];
    if (newHistory.length > 100) {
      newHistory = newHistory.slice(-100);
    }
  }

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  const baseState: TmuxState = {
    ...state,
    commandPrompt: null,
    commandPromptHistory: newHistory,
  };

  switch (cmd) {
    case "new-window":
      return newWindowCommand(baseState, args);
    case "split-window":
      return splitWindowCommand(baseState, args);
    case "select-pane":
      return selectPaneCommand(baseState, args);
    case "resize-pane":
      return resizePaneCommand(baseState, args);
    case "swap-pane":
      return swapPaneCommand(baseState, args);
    case "kill-pane":
      return killPaneCommand(baseState);
    case "list-keys":
      return listKeysCommand(baseState);
    case "show-options":
      return showOptionsCommand(baseState);
    default:
      return {
        state: {
          ...baseState,
          message: `Unknown command: ${cmd}`,
          messageType: "error",
        },
      };
  }
}

function newWindowCommand(
  state: TmuxState,
  args: string[]
): TmuxCommandResult {
  const session = getActiveSession(state);
  if (!session) {
    return {
      state: {
        ...state,
        message: "No active session",
        messageType: "error",
      },
    };
  }

  let name = "window";
  const nameIndex = args.indexOf("-n");
  if (nameIndex !== -1 && args[nameIndex + 1]) {
    name = args[nameIndex + 1];
  }

  const newIndex = Math.max(...session.windows.map((w) => w.index)) + 1;
  const newWindow = createDefaultWindow(generateId("window"), name, newIndex);

  const updatedWindows = session.windows.map((w) => ({
    ...w,
    isActive: false,
  }));

  const updatedSession: TmuxSession = {
    ...session,
    windows: [...updatedWindows, newWindow],
    activeWindowId: newWindow.id,
    lastActiveWindowId: session.activeWindowId,
  };

  return {
    state: {
      ...updateSession(state, updatedSession),
      message: `Created window ${newIndex}: ${name}`,
      messageType: "info",
    },
  };
}

function splitWindowCommand(
  state: TmuxState,
  args: string[]
): TmuxCommandResult {
  const session = getActiveSession(state);
  const window = getActiveWindow(state);
  const activePane = getActivePane(state);

  if (!session || !window || !activePane) {
    return {
      state: {
        ...state,
        message: "No active pane",
        messageType: "error",
      },
    };
  }

  const horizontal = args.includes("-h");
  const newPane = createDefaultPane(generateId("pane"));

  if (horizontal) {
    const halfWidth = Math.floor(activePane.width / 2);
    const updatedActivePane: TmuxPane = {
      ...activePane,
      width: halfWidth,
      isActive: false,
    };
    const newPaneWithPosition: TmuxPane = {
      ...newPane,
      x: activePane.x + halfWidth,
      y: activePane.y,
      width: activePane.width - halfWidth,
      height: activePane.height,
      isActive: true,
    };

    const updatedWindow: TmuxWindow = {
      ...window,
      panes: window.panes.map((p) =>
        p.id === activePane.id ? updatedActivePane : { ...p, isActive: false }
      ).concat(newPaneWithPosition),
      activePaneId: newPaneWithPosition.id,
      lastActivePaneId: activePane.id,
    };

    const updatedSession = updateWindow(session, updatedWindow);
    return {
      state: {
        ...updateSession(state, updatedSession),
        message: "Split window horizontally",
        messageType: "info",
      },
    };
  } else {
    const halfHeight = Math.floor(activePane.height / 2);
    const updatedActivePane: TmuxPane = {
      ...activePane,
      height: halfHeight,
      isActive: false,
    };
    const newPaneWithPosition: TmuxPane = {
      ...newPane,
      x: activePane.x,
      y: activePane.y + halfHeight,
      width: activePane.width,
      height: activePane.height - halfHeight,
      isActive: true,
    };

    const updatedWindow: TmuxWindow = {
      ...window,
      panes: window.panes.map((p) =>
        p.id === activePane.id ? updatedActivePane : { ...p, isActive: false }
      ).concat(newPaneWithPosition),
      activePaneId: newPaneWithPosition.id,
      lastActivePaneId: activePane.id,
    };

    const updatedSession = updateWindow(session, updatedWindow);
    return {
      state: {
        ...updateSession(state, updatedSession),
        message: "Split window vertically",
        messageType: "info",
      },
    };
  }
}

function selectPaneCommand(
  state: TmuxState,
  args: string[]
): TmuxCommandResult {
  const session = getActiveSession(state);
  const window = getActiveWindow(state);
  const activePane = getActivePane(state);

  if (!session || !window || !activePane) {
    return {
      state: {
        ...state,
        message: "No active pane",
        messageType: "error",
      },
    };
  }

  if (window.panes.length <= 1) {
    return {
      state: {
        ...state,
        message: "No other panes",
        messageType: "info",
      },
    };
  }

  let targetPane: TmuxPane | undefined;

  if (args.includes("-L")) {
    targetPane = findPaneInDirection(window.panes, activePane, "left");
  } else if (args.includes("-R")) {
    targetPane = findPaneInDirection(window.panes, activePane, "right");
  } else if (args.includes("-U")) {
    targetPane = findPaneInDirection(window.panes, activePane, "up");
  } else if (args.includes("-D")) {
    targetPane = findPaneInDirection(window.panes, activePane, "down");
  }

  if (!targetPane) {
    return {
      state: {
        ...state,
        message: "No pane in that direction",
        messageType: "info",
      },
    };
  }

  const updatedWindow: TmuxWindow = {
    ...window,
    panes: window.panes.map((p) => ({
      ...p,
      isActive: p.id === targetPane!.id,
    })),
    activePaneId: targetPane.id,
    lastActivePaneId: activePane.id,
  };

  const updatedSession = updateWindow(session, updatedWindow);
  return {
    state: {
      ...updateSession(state, updatedSession),
      message: `Selected pane ${targetPane.id}`,
      messageType: "info",
    },
  };
}

function findPaneInDirection(
  panes: TmuxPane[],
  current: TmuxPane,
  direction: "left" | "right" | "up" | "down"
): TmuxPane | undefined {
  const centerX = current.x + current.width / 2;
  const centerY = current.y + current.height / 2;

  const candidates = panes.filter((p) => {
    if (p.id === current.id) return false;
    const pCenterX = p.x + p.width / 2;
    const pCenterY = p.y + p.height / 2;

    switch (direction) {
      case "left":
        return pCenterX < centerX;
      case "right":
        return pCenterX > centerX;
      case "up":
        return pCenterY < centerY;
      case "down":
        return pCenterY > centerY;
    }
  });

  if (candidates.length === 0) return undefined;

  return candidates.reduce((closest, p) => {
    const pCenterX = p.x + p.width / 2;
    const pCenterY = p.y + p.height / 2;
    const cCenterX = closest.x + closest.width / 2;
    const cCenterY = closest.y + closest.height / 2;

    const pDist = Math.abs(pCenterX - centerX) + Math.abs(pCenterY - centerY);
    const cDist = Math.abs(cCenterX - centerX) + Math.abs(cCenterY - centerY);

    return pDist < cDist ? p : closest;
  });
}

function resizePaneCommand(
  state: TmuxState,
  args: string[]
): TmuxCommandResult {
  const session = getActiveSession(state);
  const window = getActiveWindow(state);
  const activePane = getActivePane(state);

  if (!session || !window || !activePane) {
    return {
      state: {
        ...state,
        message: "No active pane",
        messageType: "error",
      },
    };
  }

  let direction: "L" | "R" | "U" | "D" | null = null;
  let amount = 1;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-L") direction = "L";
    else if (arg === "-R") direction = "R";
    else if (arg === "-U") direction = "U";
    else if (arg === "-D") direction = "D";
    else {
      const num = parseInt(arg, 10);
      if (!isNaN(num)) amount = num;
    }
  }

  if (!direction) {
    return {
      state: {
        ...state,
        message: "Direction required (-L/-R/-U/-D)",
        messageType: "error",
      },
    };
  }

  let updatedPane: TmuxPane = { ...activePane };

  switch (direction) {
    case "L":
      updatedPane.width = Math.max(1, updatedPane.width - amount);
      break;
    case "R":
      updatedPane.width = Math.min(
        DEFAULT_TERMINAL_WIDTH,
        updatedPane.width + amount
      );
      break;
    case "U":
      updatedPane.height = Math.max(1, updatedPane.height - amount);
      break;
    case "D":
      updatedPane.height = Math.min(
        DEFAULT_TERMINAL_HEIGHT,
        updatedPane.height + amount
      );
      break;
  }

  const updatedWindow: TmuxWindow = {
    ...window,
    panes: window.panes.map((p) => (p.id === activePane.id ? updatedPane : p)),
  };

  const updatedSession = updateWindow(session, updatedWindow);
  return {
    state: {
      ...updateSession(state, updatedSession),
      message: `Resized pane ${direction} by ${amount}`,
      messageType: "info",
    },
  };
}

function swapPaneCommand(state: TmuxState, _args: string[]): TmuxCommandResult {
  const session = getActiveSession(state);
  const window = getActiveWindow(state);
  const activePane = getActivePane(state);

  if (!session || !window || !activePane) {
    return {
      state: {
        ...state,
        message: "No active pane",
        messageType: "error",
      },
    };
  }

  if (window.panes.length < 2) {
    return {
      state: {
        ...state,
        message: "Need at least 2 panes to swap",
        messageType: "error",
      },
    };
  }

  const activeIndex = window.panes.findIndex((p) => p.id === activePane.id);
  const nextIndex = (activeIndex + 1) % window.panes.length;
  const nextPane = window.panes[nextIndex];

  const swappedPanes = window.panes.map((p, i) => {
    if (i === activeIndex) {
      return {
        ...nextPane,
        x: activePane.x,
        y: activePane.y,
        width: activePane.width,
        height: activePane.height,
      };
    }
    if (i === nextIndex) {
      return {
        ...activePane,
        x: nextPane.x,
        y: nextPane.y,
        width: nextPane.width,
        height: nextPane.height,
      };
    }
    return p;
  });

  const updatedWindow: TmuxWindow = {
    ...window,
    panes: swappedPanes,
  };

  const updatedSession = updateWindow(session, updatedWindow);
  return {
    state: {
      ...updateSession(state, updatedSession),
      message: "Swapped panes",
      messageType: "info",
    },
  };
}

function killPaneCommand(state: TmuxState): TmuxCommandResult {
  const session = getActiveSession(state);
  const window = getActiveWindow(state);
  const activePane = getActivePane(state);

  if (!session || !window || !activePane) {
    return {
      state: {
        ...state,
        message: "No active pane",
        messageType: "error",
      },
    };
  }

  if (window.panes.length === 1) {
    if (session.windows.length === 1) {
      return {
        state: {
          ...state,
          message: "Cannot close last pane in last window",
          messageType: "error",
        },
      };
    }

    const windowIndex = session.windows.findIndex((w) => w.id === window.id);
    const nextWindowIndex =
      windowIndex === 0 ? 1 : windowIndex - 1;
    const nextWindow = session.windows[nextWindowIndex];

    const updatedSession: TmuxSession = {
      ...session,
      windows: session.windows.filter((w) => w.id !== window.id),
      activeWindowId: nextWindow.id,
      lastActiveWindowId: window.id,
    };

    return {
      state: {
        ...updateSession(state, updatedSession),
        message: "Closed window",
        messageType: "info",
      },
    };
  }

  const paneIndex = window.panes.findIndex((p) => p.id === activePane.id);
  const nextPaneIndex = paneIndex === 0 ? 1 : paneIndex - 1;
  const remainingPanes = window.panes.filter((p) => p.id !== activePane.id);
  const nextPane = remainingPanes[nextPaneIndex];

  const updatedPanes = remainingPanes.map((p) => ({
    ...p,
    isActive: p.id === nextPane.id,
  }));

  const updatedWindow: TmuxWindow = {
    ...window,
    panes: updatedPanes,
    activePaneId: nextPane.id,
    lastActivePaneId: activePane.id,
  };

  const updatedSession = updateWindow(session, updatedWindow);
  return {
    state: {
      ...updateSession(state, updatedSession),
      message: "Closed pane",
      messageType: "info",
    },
  };
}

function listKeysCommand(state: TmuxState): TmuxCommandResult {
  const keybindings = [
    "prefix + c     Create new window",
    "prefix + %     Split horizontally",
    'prefix + "     Split vertically',
    "prefix + o     Next pane",
    "prefix + ;     Last pane",
    "prefix + x     Kill pane",
    "prefix + z     Zoom pane",
    "prefix + n     Next window",
    "prefix + p     Previous window",
    "prefix + w     List windows",
    "prefix + d     Detach session",
    "prefix + [     Copy mode",
    "prefix + :     Command mode",
    "prefix + ?     List keys",
  ].join("\n");

  return {
    state: {
      ...state,
      message: keybindings,
      messageType: "info",
    },
  };
}

function showOptionsCommand(state: TmuxState): TmuxCommandResult {
  const session = getActiveSession(state);
  const window = getActiveWindow(state);

  const options = [
    `prefix-key: Ctrl-b`,
    `mouse-mode: ${state.mouseMode ? "on" : "off"}`,
    `copy-mode: ${state.copyMode.enabled ? "on" : "off"}`,
    `sessions: ${state.sessions.length}`,
    `windows: ${session?.windows.length ?? 0}`,
    `panes: ${window?.panes.length ?? 0}`,
    `paste-buffer-size: ${state.pasteBuffer.length}`,
  ].join("\n");

  return {
    state: {
      ...state,
      message: options,
      messageType: "info",
    },
  };
}

export function handleCommandInput(
  state: TmuxState,
  char: string
): TmuxCommandResult {
  if (state.commandPrompt === null) {
    return { state };
  }

  if (char === "Escape") {
    return exitCommandMode(state);
  }

  if (char === "Enter") {
    return executeCommand(state, state.commandPrompt);
  }

  if (char === "Backspace") {
    if (state.commandPrompt.length === 0) {
      return exitCommandMode(state);
    }
    return {
      state: {
        ...state,
        commandPrompt: state.commandPrompt.slice(0, -1),
      },
    };
  }

  if (char.length === 1) {
    return {
      state: {
        ...state,
        commandPrompt: state.commandPrompt + char,
      },
    };
  }

  return { state };
}

export function navigateHistory(
  state: TmuxState,
  direction: "up" | "down"
): TmuxCommandResult {
  if (state.commandPrompt === null) {
    return { state };
  }

  const history = state.commandPromptHistory;
  if (history.length === 0) {
    return { state };
  }

  const currentIndex = history.indexOf(state.commandPrompt);
  let newIndex: number;

  if (direction === "up") {
    if (currentIndex === -1) {
      newIndex = history.length - 1;
    } else if (currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else {
      newIndex = 0;
    }
  } else {
    if (currentIndex === -1 || currentIndex === history.length - 1) {
      return {
        state: {
          ...state,
          commandPrompt: "",
        },
      };
    }
    newIndex = currentIndex + 1;
  }

  return {
    state: {
      ...state,
      commandPrompt: history[newIndex],
    },
  };
}

const TMUX_COMMANDS = [
  "new-window",
  "split-window",
  "select-pane",
  "resize-pane",
  "swap-pane",
  "kill-pane",
  "list-keys",
  "show-options",
  "new-session",
  "kill-session",
  "rename-window",
  "rename-session",
  "select-window",
  "last-window",
  "next-window",
  "previous-window",
  "send-keys",
  "copy-mode",
  "paste-buffer",
  "set-option",
];

export function completeCommand(state: TmuxState): TmuxCommandResult {
  if (state.commandPrompt === null) {
    return { state };
  }

  const input = state.commandPrompt.trim();
  if (!input) {
    return { state };
  }

  const matches = TMUX_COMMANDS.filter((cmd) => cmd.startsWith(input));

  if (matches.length === 1) {
    return {
      state: {
        ...state,
        commandPrompt: matches[0],
      },
    };
  }

  if (matches.length > 1) {
    const commonPrefix = matches.reduce((prefix, cmd) => {
      while (!cmd.startsWith(prefix)) {
        prefix = prefix.slice(0, -1);
      }
      return prefix;
    }, matches[0]);

    if (commonPrefix.length > input.length) {
      return {
        state: {
          ...state,
          commandPrompt: commonPrefix,
        },
      };
    }

    return {
      state: {
        ...state,
        message: matches.join("  "),
        messageType: "info",
      },
    };
  }

  return { state };
}
