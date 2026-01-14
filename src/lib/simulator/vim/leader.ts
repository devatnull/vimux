import type { VimState, VimBuffer } from "../types";
import { getActiveBuffer as getActiveBufferMaybe } from "./motions";

export const LEADER_TIMEOUT_MS = 2000;

export interface LeaderKeyResult {
  state: VimState;
  action?: string;
  actionMessage?: string;
  handled: boolean;
}

export interface LeaderMapping {
  key: string;
  action: string;
  message: string;
  description: string;
  subMappings?: LeaderMapping[];
}

function getActiveBuffer(state: VimState): VimBuffer {
  const buffer = getActiveBufferMaybe(state);
  if (!buffer) {
    throw new Error(`Active buffer not found: ${state.activeBufferId}`);
  }
  return buffer;
}

export const LEADER_MAPPINGS: LeaderMapping[] = [
  {
    key: " ",
    action: "find-files",
    message: "Find files",
    description: "Open file finder",
  },
  {
    key: "/",
    action: "grep-search",
    message: "Grep search",
    description: "Search in project",
  },
  {
    key: "e",
    action: "toggle-explorer",
    message: "Toggle file explorer",
    description: "Toggle Neo-tree file explorer",
  },
  {
    key: ",",
    action: "show-buffers",
    message: "Show buffers",
    description: "Buffer picker",
  },
  {
    key: "f",
    action: "file-menu",
    message: "",
    description: "File commands",
    subMappings: [
      {
        key: "f",
        action: "find-files",
        message: "Find files",
        description: "Find files by name",
      },
      {
        key: "g",
        action: "live-grep",
        message: "Live grep",
        description: "Search by content",
      },
      {
        key: "r",
        action: "recent-files",
        message: "Recent files",
        description: "Open recent files",
      },
      {
        key: "c",
        action: "find-config",
        message: "Find config files",
        description: "Search config files",
      },
      {
        key: "b",
        action: "find-buffers",
        message: "Find in buffers",
        description: "Search open buffers",
      },
    ],
  },
  {
    key: "g",
    action: "git-menu",
    message: "",
    description: "Git commands",
    subMappings: [
      {
        key: "b",
        action: "git-branches",
        message: "Git branches",
        description: "Show git branches",
      },
      {
        key: "l",
        action: "git-log",
        message: "Git log",
        description: "Show git history",
      },
      {
        key: "s",
        action: "git-status",
        message: "Git status",
        description: "Show git status",
      },
      {
        key: "d",
        action: "git-diff",
        message: "Git diff",
        description: "Show git diff",
      },
      {
        key: "g",
        action: "lazygit",
        message: "Open Lazygit",
        description: "Launch Lazygit terminal",
      },
      {
        key: "c",
        action: "git-commits",
        message: "Git commits",
        description: "Show commits list",
      },
    ],
  },
  {
    key: "s",
    action: "search-menu",
    message: "",
    description: "Search commands",
    subMappings: [
      {
        key: "b",
        action: "search-buffer",
        message: "Search current buffer",
        description: "Search in current file",
      },
      {
        key: "g",
        action: "search-grep",
        message: "Search with grep",
        description: "Grep search project",
      },
      {
        key: "w",
        action: "search-word",
        message: "Search word under cursor",
        description: "Search current word",
      },
      {
        key: "h",
        action: "search-help",
        message: "Search help tags",
        description: "Search vim help",
      },
      {
        key: "k",
        action: "search-keymaps",
        message: "Search keymaps",
        description: "Search key mappings",
      },
      {
        key: "r",
        action: "search-replace",
        message: "Search and replace",
        description: "Find and replace",
      },
    ],
  },
  {
    key: "t",
    action: "terminal-menu",
    message: "",
    description: "Terminal commands",
    subMappings: [
      {
        key: "f",
        action: "terminal-float",
        message: "Open floating terminal",
        description: "Toggle floating terminal",
      },
      {
        key: "b",
        action: "terminal-bottom",
        message: "Open bottom terminal",
        description: "Toggle bottom terminal",
      },
      {
        key: "t",
        action: "terminal-tab",
        message: "Open terminal in new tab",
        description: "New terminal tab",
      },
    ],
  },
  {
    key: "b",
    action: "buffer-menu",
    message: "",
    description: "Buffer commands",
    subMappings: [
      {
        key: "d",
        action: "buffer-delete",
        message: "Buffer deleted",
        description: "Delete current buffer",
      },
      {
        key: "n",
        action: "buffer-next",
        message: "Next buffer",
        description: "Go to next buffer",
      },
      {
        key: "p",
        action: "buffer-prev",
        message: "Previous buffer",
        description: "Go to previous buffer",
      },
      {
        key: "l",
        action: "buffer-list",
        message: "Buffer list",
        description: "Show buffer list",
      },
    ],
  },
  {
    key: "u",
    action: "toggle-menu",
    message: "",
    description: "Toggle options",
    subMappings: [
      {
        key: "s",
        action: "toggle-spell",
        message: "Toggle spell check",
        description: "Toggle spell checking",
      },
      {
        key: "w",
        action: "toggle-wrap",
        message: "Toggle word wrap",
        description: "Toggle line wrapping",
      },
      {
        key: "l",
        action: "toggle-line-numbers",
        message: "Toggle line numbers",
        description: "Toggle line numbers",
      },
      {
        key: "d",
        action: "toggle-diagnostics",
        message: "Toggle diagnostics",
        description: "Toggle diagnostic display",
      },
      {
        key: "r",
        action: "toggle-relative-numbers",
        message: "Toggle relative numbers",
        description: "Toggle relative line numbers",
      },
      {
        key: "h",
        action: "toggle-hlsearch",
        message: "Toggle search highlight",
        description: "Toggle search highlighting",
      },
      {
        key: "c",
        action: "toggle-cursorline",
        message: "Toggle cursor line",
        description: "Toggle cursor line highlight",
      },
      {
        key: "i",
        action: "toggle-indent-guides",
        message: "Toggle indent guides",
        description: "Toggle indent guides",
      },
    ],
  },
  {
    key: "c",
    action: "code-menu",
    message: "",
    description: "Code commands",
    subMappings: [
      {
        key: "a",
        action: "code-action",
        message: "Code action",
        description: "Show code actions",
      },
      {
        key: "r",
        action: "code-rename",
        message: "Rename symbol",
        description: "Rename symbol under cursor",
      },
      {
        key: "d",
        action: "code-definition",
        message: "Go to definition",
        description: "Jump to definition",
      },
      {
        key: "f",
        action: "code-format",
        message: "Format code",
        description: "Format current file",
      },
    ],
  },
  {
    key: "v",
    action: "view-menu",
    message: "",
    description: "View commands",
    subMappings: [
      {
        key: "v",
        action: "format-code",
        message: "Format code",
        description: "Format current buffer",
      },
      {
        key: "s",
        action: "split-vertical",
        message: "Vertical split",
        description: "Split window vertically",
      },
      {
        key: "h",
        action: "split-horizontal",
        message: "Horizontal split",
        description: "Split window horizontally",
      },
    ],
  },
  {
    key: "w",
    action: "window-menu",
    message: "",
    description: "Window commands",
    subMappings: [
      {
        key: "h",
        action: "window-left",
        message: "Focus left window",
        description: "Move to left window",
      },
      {
        key: "j",
        action: "window-down",
        message: "Focus window below",
        description: "Move to window below",
      },
      {
        key: "k",
        action: "window-up",
        message: "Focus window above",
        description: "Move to window above",
      },
      {
        key: "l",
        action: "window-right",
        message: "Focus right window",
        description: "Move to right window",
      },
      {
        key: "q",
        action: "window-close",
        message: "Close window",
        description: "Close current window",
      },
      {
        key: "=",
        action: "window-equalize",
        message: "Equalize windows",
        description: "Make windows equal size",
      },
    ],
  },
  {
    key: "x",
    action: "diagnostics-menu",
    message: "",
    description: "Diagnostics commands",
    subMappings: [
      {
        key: "x",
        action: "diagnostics-list",
        message: "Show diagnostics",
        description: "Open diagnostics list",
      },
      {
        key: "n",
        action: "diagnostics-next",
        message: "Next diagnostic",
        description: "Jump to next diagnostic",
      },
      {
        key: "p",
        action: "diagnostics-prev",
        message: "Previous diagnostic",
        description: "Jump to previous diagnostic",
      },
    ],
  },
  {
    key: "q",
    action: "quit-menu",
    message: "",
    description: "Quit commands",
    subMappings: [
      {
        key: "q",
        action: "quit",
        message: "Quit",
        description: "Quit editor",
      },
      {
        key: "a",
        action: "quit-all",
        message: "Quit all",
        description: "Quit all buffers",
      },
      {
        key: "w",
        action: "write-quit",
        message: "Write and quit",
        description: "Save and quit",
      },
    ],
  },
  {
    key: "h",
    action: "help-menu",
    message: "",
    description: "Help commands",
    subMappings: [
      {
        key: "h",
        action: "help",
        message: "Help",
        description: "Open help",
      },
      {
        key: "k",
        action: "help-keymaps",
        message: "Show keymaps",
        description: "Show all key mappings",
      },
    ],
  },
];

export function enterLeaderMode(state: VimState): LeaderKeyResult {
  const newState: VimState = {
    ...state,
    leaderActive: true,
    leaderKeySequence: [],
    leaderTimeoutAt: Date.now() + LEADER_TIMEOUT_MS,
    message: "LEADER",
    messageType: "info",
  };

  return {
    state: newState,
    action: "enter-leader-mode",
    handled: true,
  };
}

export function exitLeaderMode(state: VimState): LeaderKeyResult {
  const newState: VimState = {
    ...state,
    leaderActive: false,
    leaderKeySequence: [],
    leaderTimeoutAt: null,
    message: null,
    messageType: null,
  };

  return {
    state: newState,
    action: "exit-leader-mode",
    handled: true,
  };
}

export function isLeaderTimedOut(state: VimState): boolean {
  if (!state.leaderActive || !state.leaderTimeoutAt) {
    return false;
  }
  return Date.now() > state.leaderTimeoutAt;
}

function findMapping(
  mappings: LeaderMapping[],
  keys: string[]
): { mapping: LeaderMapping | null; partial: boolean } {
  if (keys.length === 0) {
    return { mapping: null, partial: true };
  }

  const [firstKey, ...restKeys] = keys;
  const mapping = mappings.find((m) => m.key === firstKey);

  if (!mapping) {
    return { mapping: null, partial: false };
  }

  if (restKeys.length === 0) {
    if (mapping.subMappings && mapping.subMappings.length > 0) {
      return { mapping: null, partial: true };
    }
    return { mapping, partial: false };
  }

  if (mapping.subMappings) {
    return findMapping(mapping.subMappings, restKeys);
  }

  return { mapping: null, partial: false };
}

export function getLeaderKeyDescription(keys: string[]): string | null {
  const { mapping, partial } = findMapping(LEADER_MAPPINGS, keys);

  if (mapping) {
    return mapping.description;
  }

  if (partial && keys.length > 0) {
    const parentMapping = findMapping(LEADER_MAPPINGS, keys.slice(0, -1));
    if (parentMapping.mapping?.subMappings) {
      const lastKey = keys[keys.length - 1];
      const sub = parentMapping.mapping.subMappings.find((m) => m.key === lastKey);
      if (sub) {
        return sub.description;
      }
    }
  }

  return null;
}

export function getAvailableLeaderMappings(keys: string[]): LeaderMapping[] {
  if (keys.length === 0) {
    return LEADER_MAPPINGS;
  }

  let currentMappings = LEADER_MAPPINGS;
  for (const key of keys) {
    const mapping = currentMappings.find((m) => m.key === key);
    if (mapping?.subMappings) {
      currentMappings = mapping.subMappings;
    } else {
      return [];
    }
  }

  return currentMappings;
}

export function handleLeaderKey(state: VimState, key: string): LeaderKeyResult {
  if (!state.leaderActive) {
    return {
      state,
      handled: false,
    };
  }

  if (isLeaderTimedOut(state)) {
    return exitLeaderMode(state);
  }

  if (key === "Escape") {
    return exitLeaderMode(state);
  }

  const newSequence = [...state.leaderKeySequence, key];
  const { mapping, partial } = findMapping(LEADER_MAPPINGS, newSequence);

  if (mapping) {
    const resultState = executeLeaderAction(state, mapping);
    return {
      state: {
        ...resultState,
        leaderActive: false,
        leaderKeySequence: [],
        leaderTimeoutAt: null,
      },
      action: mapping.action,
      actionMessage: mapping.message,
      handled: true,
    };
  }

  if (partial) {
    const sequenceDisplay = newSequence.map((k) => (k === " " ? "Space" : k)).join(" ");
    return {
      state: {
        ...state,
        leaderKeySequence: newSequence,
        leaderTimeoutAt: Date.now() + LEADER_TIMEOUT_MS,
        message: `LEADER: ${sequenceDisplay}`,
        messageType: "info",
      },
      handled: true,
    };
  }

  return exitLeaderMode({
    ...state,
    message: `Unknown leader key: ${newSequence.join(" ")}`,
    messageType: "warning",
  });
}

function executeLeaderAction(state: VimState, mapping: LeaderMapping): VimState {
  const buffer = getActiveBuffer(state);

  switch (mapping.action) {
    case "toggle-wrap": {
      const newSettings = {
        ...state.settings,
        wrap: !state.settings.wrap,
      };
      return {
        ...state,
        settings: newSettings,
        message: `Wrap: ${newSettings.wrap ? "on" : "off"}`,
        messageType: "info",
      };
    }

    case "toggle-line-numbers": {
      const newSettings = {
        ...state.settings,
        number: !state.settings.number,
      };
      return {
        ...state,
        settings: newSettings,
        message: `Line numbers: ${newSettings.number ? "on" : "off"}`,
        messageType: "info",
      };
    }

    case "toggle-relative-numbers": {
      const newSettings = {
        ...state.settings,
        relativenumber: !state.settings.relativenumber,
      };
      return {
        ...state,
        settings: newSettings,
        message: `Relative numbers: ${newSettings.relativenumber ? "on" : "off"}`,
        messageType: "info",
      };
    }

    case "toggle-hlsearch": {
      const newSettings = {
        ...state.settings,
        hlsearch: !state.settings.hlsearch,
      };
      return {
        ...state,
        settings: newSettings,
        message: `Search highlight: ${newSettings.hlsearch ? "on" : "off"}`,
        messageType: "info",
      };
    }

    case "toggle-cursorline": {
      const newSettings = {
        ...state.settings,
        cursorline: !state.settings.cursorline,
      };
      return {
        ...state,
        settings: newSettings,
        message: `Cursor line: ${newSettings.cursorline ? "on" : "off"}`,
        messageType: "info",
      };
    }

    case "buffer-delete": {
      if (state.buffers.length <= 1) {
        return {
          ...state,
          message: "Cannot delete last buffer",
          messageType: "warning",
        };
      }

      const bufferIndex = state.buffers.findIndex((b) => b.id === buffer.id);
      const newBuffers = state.buffers.filter((b) => b.id !== buffer.id);
      const newActiveIndex = Math.min(bufferIndex, newBuffers.length - 1);

      return {
        ...state,
        buffers: newBuffers,
        activeBufferId: newBuffers[newActiveIndex].id,
        message: mapping.message,
        messageType: "info",
      };
    }

    case "buffer-next": {
      const currentIndex = state.buffers.findIndex((b) => b.id === buffer.id);
      const nextIndex = (currentIndex + 1) % state.buffers.length;
      return {
        ...state,
        activeBufferId: state.buffers[nextIndex].id,
        message: mapping.message,
        messageType: "info",
      };
    }

    case "buffer-prev": {
      const currentIndex = state.buffers.findIndex((b) => b.id === buffer.id);
      const prevIndex = currentIndex === 0 ? state.buffers.length - 1 : currentIndex - 1;
      return {
        ...state,
        activeBufferId: state.buffers[prevIndex].id,
        message: mapping.message,
        messageType: "info",
      };
    }

    default:
      return {
        ...state,
        message: mapping.message || `Action: ${mapping.action}`,
        messageType: "info",
      };
  }
}

export function formatLeaderStatus(state: VimState): string {
  if (!state.leaderActive) {
    return "";
  }

  if (state.leaderKeySequence.length === 0) {
    return "LEADER";
  }

  const sequenceDisplay = state.leaderKeySequence
    .map((k) => (k === " " ? "Space" : k))
    .join(" ");
  return `LEADER: ${sequenceDisplay}`;
}

export function getLeaderMappingHelp(): string {
  const lines: string[] = ["Leader key mappings (Space = leader):"];
  lines.push("");

  for (const mapping of LEADER_MAPPINGS) {
    const keyDisplay = mapping.key === " " ? "Space Space" : `Space ${mapping.key}`;
    if (mapping.subMappings) {
      lines.push(`${keyDisplay}... - ${mapping.description}`);
      for (const sub of mapping.subMappings) {
        lines.push(`  ${keyDisplay} ${sub.key} - ${sub.description}`);
      }
    } else {
      lines.push(`${keyDisplay} - ${mapping.description}`);
    }
  }

  return lines.join("\n");
}
