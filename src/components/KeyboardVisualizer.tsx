"use client";

import { useSimulatorStore } from "@/lib/store";
import clsx from "clsx";

export function KeyboardVisualizer() {
  const { state } = useSimulatorStore();
  const lastKeys = state.keySequence.slice(-5);

  return (
    <div className="flex items-center gap-2 p-4 bg-[#24283b] rounded-lg">
      <span className="text-[#565f89] text-sm mr-2">Keys:</span>
      {lastKeys.length === 0 ? (
        <span className="text-[#565f89] text-sm italic">
          Press any key...
        </span>
      ) : (
        lastKeys.map((key, i) => (
          <span
            key={`${key}-${i}`}
            className={clsx(
              "key",
              i === lastKeys.length - 1 && "pressed",
              key.includes("Ctrl") || key.includes("Alt") || key.includes("Shift")
                ? "special"
                : ""
            )}
          >
            {formatKey(key)}
          </span>
        ))
      )}
    </div>
  );
}

function formatKey(key: string): string {
  // Format key for display
  const replacements: Record<string, string> = {
    "Ctrl-": "⌃",
    "Alt-": "⌥",
    "Shift-": "⇧",
    "Meta-": "⌘",
    Escape: "Esc",
    " ": "Space",
    Enter: "↵",
    Backspace: "⌫",
    Tab: "⇥",
  };

  let formatted = key;
  for (const [from, to] of Object.entries(replacements)) {
    formatted = formatted.replace(from, to);
  }
  return formatted;
}
