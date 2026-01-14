"use client";

import { useSimulatorStore } from "@/lib/store";
import { useState, useEffect, useRef } from "react";

interface KeyEntry {
  key: string;
  timestamp: number;
  id: string;
}

export function KeyboardVisualizer() {
  const { state, leaderActive, leaderSequence } = useSimulatorStore();
  const [keyHistory, setKeyHistory] = useState<KeyEntry[]>([]);
  const lastSequenceLengthRef = useRef(0);

  useEffect(() => {
    const currentLength = state.keySequence.length;
    if (currentLength > lastSequenceLengthRef.current && currentLength > 0) {
      const newKey = state.keySequence[currentLength - 1];
      const entry: KeyEntry = {
        key: newKey,
        timestamp: Date.now(),
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      };
      setKeyHistory((prev) => [...prev.slice(-4), entry]);
    }
    lastSequenceLengthRef.current = currentLength;
  }, [state.keySequence]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setKeyHistory((prev) => prev.filter((k) => now - k.timestamp < 3000));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const pendingOperator = state.vim.pendingOperator;
  const prefixActive = state.tmux.prefixActive;

  return (
    <div className="flex items-center gap-2 p-4 bg-[#1a1b26] rounded-lg border border-[#292e42]">
      <span className="text-[#565f89] text-sm mr-2 font-medium">Keys:</span>

      {prefixActive && (
        <span className="inline-flex items-center px-2 py-1 text-xs font-mono font-bold bg-[#bb9af7] text-[#1a1b26] rounded shadow-md animate-pulse">
          &lt;Prefix&gt;-
        </span>
      )}

      {leaderActive && (
        <span className="inline-flex items-center px-2 py-1 text-xs font-mono font-bold bg-[#7aa2f7] text-[#1a1b26] rounded shadow-md animate-pulse">
          &lt;Space&gt;-
          {leaderSequence.length > 0 && leaderSequence.join("")}
        </span>
      )}

      {pendingOperator && (
        <span className="inline-flex items-center px-2 py-1 text-xs font-mono font-bold bg-[#f7768e] text-[#1a1b26] rounded shadow-md">
          {pendingOperator}-
        </span>
      )}

      {keyHistory.length === 0 && !prefixActive && !leaderActive && !pendingOperator ? (
        <span className="text-[#565f89] text-sm italic">Press any key...</span>
      ) : (
        keyHistory.map((entry, i) => {
          const age = Date.now() - entry.timestamp;
          const opacity = Math.max(0.3, 1 - age / 3000);
          const isLatest = i === keyHistory.length - 1;

          return (
            <KeyCap
              key={entry.id}
              keyStr={entry.key}
              opacity={opacity}
              isLatest={isLatest}
            />
          );
        })
      )}
    </div>
  );
}

function KeyCap({
  keyStr,
  opacity,
  isLatest,
}: {
  keyStr: string;
  opacity: number;
  isLatest: boolean;
}) {
  const { display, isModifier, isSpecial } = formatKeyDisplay(keyStr);

  const baseClasses =
    "inline-flex items-center justify-center min-w-[2rem] px-2 py-1.5 text-xs font-mono font-bold rounded shadow-md transition-all duration-150";

  const colorClasses = isLatest
    ? "bg-[#7aa2f7] text-[#1a1b26] ring-2 ring-[#7aa2f7]/50 scale-110"
    : isModifier
      ? "bg-[#bb9af7] text-[#1a1b26]"
      : isSpecial
        ? "bg-[#7dcfff] text-[#1a1b26]"
        : "bg-[#292e42] text-[#c0caf5] border border-[#414868]";

  const keyCapStyle = `
    background: linear-gradient(180deg, 
      ${isLatest ? "#7aa2f7" : isModifier ? "#bb9af7" : isSpecial ? "#7dcfff" : "#3b4261"} 0%, 
      ${isLatest ? "#5d8fdd" : isModifier ? "#9d7cd8" : isSpecial ? "#5aafdf" : "#292e42"} 100%
    );
    box-shadow: 
      0 1px 0 0 ${isLatest ? "#4a6fb3" : isModifier ? "#7a5dac" : isSpecial ? "#4a8faf" : "#1a1b26"},
      0 2px 0 0 ${isLatest ? "#3a5f93" : isModifier ? "#6a4d9c" : isSpecial ? "#3a7f9f" : "#16171f"},
      0 3px 3px rgba(0,0,0,0.3);
  `;

  return (
    <span
      className={`${baseClasses} ${colorClasses}`}
      style={{ opacity, ...parseStyle(keyCapStyle) }}
    >
      {display}
    </span>
  );
}

function parseStyle(styleStr: string): React.CSSProperties {
  const style: Record<string, string> = {};
  const pairs = styleStr.split(";").filter((s) => s.trim());
  for (const pair of pairs) {
    const [key, value] = pair.split(":").map((s) => s.trim());
    if (key && value) {
      const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      style[camelKey] = value;
    }
  }
  return style as React.CSSProperties;
}

function formatKeyDisplay(key: string): {
  display: string;
  isModifier: boolean;
  isSpecial: boolean;
} {
  const modifierParts: string[] = [];
  let mainKey = key;
  let isModifier = false;

  if (mainKey.includes("Ctrl-")) {
    modifierParts.push("Ctrl");
    mainKey = mainKey.replace("Ctrl-", "");
    isModifier = true;
  }
  if (mainKey.includes("Alt-")) {
    modifierParts.push("Alt");
    mainKey = mainKey.replace("Alt-", "");
    isModifier = true;
  }
  if (mainKey.includes("Shift-")) {
    modifierParts.push("Shift");
    mainKey = mainKey.replace("Shift-", "");
    isModifier = true;
  }
  if (mainKey.includes("Meta-")) {
    modifierParts.push("⌘");
    mainKey = mainKey.replace("Meta-", "");
    isModifier = true;
  }

  const specialKeyMap: Record<string, string> = {
    Escape: "Esc",
    " ": "Space",
    Enter: "Enter",
    Backspace: "⌫",
    Tab: "Tab",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Delete: "Del",
    Home: "Home",
    End: "End",
    PageUp: "PgUp",
    PageDown: "PgDn",
  };

  const isSpecial = mainKey in specialKeyMap;
  if (isSpecial) {
    mainKey = specialKeyMap[mainKey];
  }

  const display =
    modifierParts.length > 0
      ? `${modifierParts.join("+")}+${mainKey}`
      : mainKey;

  return { display, isModifier, isSpecial };
}
