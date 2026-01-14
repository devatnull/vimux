const DISPLAY_MAP: Record<string, string> = {
  Escape: "Esc",
  Space: "␣",
  Enter: "↵",
  Tab: "⇥",
  Backspace: "⌫",
  Delete: "⌦",
  Up: "↑",
  Down: "↓",
  Left: "←",
  Right: "→",
  PageUp: "PgUp",
  PageDown: "PgDn",
  "Ctrl-": "⌃",
  "Alt-": "⌥",
  "Meta-": "⌘",
  "Shift-": "⇧",
};

export function formatKeyDisplay(key: string): string {
  let result = key;

  for (const [pattern, symbol] of Object.entries(DISPLAY_MAP)) {
    if (pattern.endsWith("-")) {
      result = result.replace(pattern, symbol);
    } else if (result === pattern) {
      return symbol;
    }
  }

  return result;
}
