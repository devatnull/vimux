const SPECIAL_KEYS: Record<string, string> = {
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  " ": "Space",
  Escape: "Escape",
  Tab: "Tab",
  Enter: "Enter",
  Backspace: "Backspace",
  Delete: "Delete",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
};

export function normalizeKeyFromDomEvent(e: KeyboardEvent): string | null {
  const { key, ctrlKey, altKey, shiftKey, metaKey } = e;

  if (
    key === "Control" ||
    key === "Alt" ||
    key === "Shift" ||
    key === "Meta"
  ) {
    return null;
  }

  let normalized = SPECIAL_KEYS[key] ?? key;

  if (normalized.length === 1 && shiftKey && !ctrlKey && !altKey && !metaKey) {
    return normalized;
  }

  const modifiers: string[] = [];
  if (ctrlKey) modifiers.push("Ctrl");
  if (altKey) modifiers.push("Alt");
  if (metaKey) modifiers.push("Meta");
  if (shiftKey && (ctrlKey || altKey || metaKey || normalized.length > 1)) {
    modifiers.push("Shift");
  }

  if (modifiers.length > 0) {
    if (normalized.length === 1 && ctrlKey && !altKey && !metaKey) {
      normalized = normalized.toLowerCase();
    }
    return `${modifiers.join("-")}-${normalized}`;
  }

  return normalized;
}
