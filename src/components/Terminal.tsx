"use client";

import React, { useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSimulatorStore } from "@/lib/store";
import { VimMode } from "@/lib/types";
import clsx from "clsx";

const modeColors: Record<VimMode, string> = {
  normal: "bg-[#7aa2f7] text-[#1a1b26]",
  insert: "bg-[#9ece6a] text-[#1a1b26]",
  visual: "bg-[#bb9af7] text-[#1a1b26]",
  "visual-line": "bg-[#bb9af7] text-[#1a1b26]",
  "visual-block": "bg-[#bb9af7] text-[#1a1b26]",
  command: "bg-[#ff9e64] text-[#1a1b26]",
  search: "bg-[#ff9e64] text-[#1a1b26]",
  "operator-pending": "bg-[#7aa2f7] text-[#1a1b26]",
  replace: "bg-[#f7768e] text-[#1a1b26]",
};

const modeLabels: Record<VimMode, string> = {
  normal: "NORMAL",
  insert: "INSERT",
  visual: "VISUAL",
  "visual-line": "V-LINE",
  "visual-block": "V-BLOCK",
  command: "COMMAND",
  search: "SEARCH",
  "operator-pending": "PENDING",
  replace: "REPLACE",
};

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, handleKeyPress } = useSimulatorStore(
    useShallow((s) => ({ state: s.state, handleKeyPress: s.handleKeyPress }))
  );
  const session = state.tmux.sessions.find(
    (s) => s.id === state.tmux.activeSessionId
  );
  const window = session?.windows.find(
    (w) => w.id === session.activeWindowId
  );
  const activeBuffer = state.vim.buffers.find(
    (b) => b.id === state.vim.activeBufferId
  );

  // Auto-focus terminal on mount and click
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleClick = useCallback(() => {
    containerRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const shouldPrevent = [
      "Tab", "Escape", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Backspace", "Enter"
    ].includes(e.key);

    if (e.ctrlKey || e.metaKey || shouldPrevent) {
      if (e.ctrlKey && (e.key === "c" || e.key === "v")) {
        return;
      }
      e.preventDefault();
    }

    let key = e.key;
    if (key === "ArrowLeft") key = "Left";
    if (key === "ArrowRight") key = "Right";
    if (key === "ArrowUp") key = "Up";
    if (key === "ArrowDown") key = "Down";

    handleKeyPress(key, {
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey,
    });
  }, [handleKeyPress]);

  const filePercentage = useMemo(() => {
    if (!activeBuffer) return 0;
    const totalLines = activeBuffer.content.length;
    return totalLines > 0 
      ? Math.round(((activeBuffer.cursorLine + 1) / totalLines) * 100)
      : 0;
  }, [activeBuffer]);

  if (!session || !window || !activeBuffer) return null;

  return (
    <div 
      ref={containerRef}
      className="terminal w-full max-w-full md:max-w-5xl mx-auto outline-none cursor-text"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Click to focus hint */}
      <div className="text-center text-xs text-[#565f89] py-1 bg-[#1a1b26] border-b border-[#414868]">
        Click here and start typing • Keys: h/j/k/l (move) • i (insert) • Esc (normal) • Ctrl+a (tmux prefix)
      </div>

      {/* Terminal Header */}
      <div className="terminal-header">
        <div className="terminal-btn close" />
        <div className="terminal-btn minimize" />
        <div className="terminal-btn maximize" />
        <span className="ml-4 text-sm text-[#565f89]">
          tmux: {session.name} — nvim
        </span>
      </div>

      {/* Panes Container */}
      <div className="relative bg-[#1a1b26] min-h-[300px] md:min-h-[400px]">
        {window.panes.length === 1 ? (
          <VimPane buffer={activeBuffer} state={state} />
        ) : (
          <div className="flex flex-col md:flex-row flex-wrap h-full">
            {window.panes.map((pane, index) => (
              <div
                key={pane.id}
                className={clsx(
                  "border border-[#414868] relative",
                  pane.isActive && "border-[#7aa2f7]",
                  window.panes.length === 2 && "w-full md:w-1/2",
                  window.panes.length > 2 && "w-full md:w-1/2"
                )}
                style={{
                  minHeight: "150px",
                }}
              >
                {pane.isActive ? (
                  <VimPane buffer={activeBuffer} state={state} />
                ) : (
                  <div className="p-4 text-[#565f89] text-sm">
                    <div className="mb-2">$ _</div>
                    <div className="text-xs">Pane {index + 1}</div>
                  </div>
                )}
                {/* Pane indicator */}
                <div
                  className={clsx(
                    "absolute top-1 right-1 text-xs px-1 rounded",
                    pane.isActive
                      ? "bg-[#7aa2f7] text-[#1a1b26]"
                      : "bg-[#414868] text-[#565f89]"
                  )}
                >
                  {index}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vim Status Line */}
      <div className="flex items-center bg-[#24283b] text-xs md:text-sm sticky bottom-12 z-10">
        <div className={clsx("px-2 py-1 font-bold", modeColors[activeBuffer.mode])}>
          {modeLabels[activeBuffer.mode]}
          {state.vim.pendingOperator && (
            <span className="ml-1 text-[#1a1b26]">-{state.vim.pendingOperator}</span>
          )}
        </div>
        <div className="px-2 md:px-3 py-1 text-[#a9b1d6] truncate">
          {activeBuffer.filename}
          {activeBuffer.modified && (
            <span className="text-[#f7768e] ml-1">[+]</span>
          )}
        </div>
        <div className="flex-1" />
        <div className="px-2 md:px-3 py-1 text-[#565f89] hidden sm:block">
          Ln {activeBuffer.cursorLine + 1}, Col {activeBuffer.cursorCol + 1}
        </div>
        <div className="px-2 md:px-3 py-1 text-[#565f89]">
          {filePercentage}%
        </div>
      </div>

      {/* Command Line Area */}
      <div className="h-6 bg-[#1a1b26] text-sm px-2 flex items-center">
        {activeBuffer.mode === "command" ? (
          <span className="text-[#c0caf5]">
            :{state.vim.commandLine}
            <span className="animate-blink">▎</span>
          </span>
        ) : state.vim.lastSearchPattern && state.vim.message?.startsWith("/") ? (
          <span className="text-[#c0caf5]">
            {state.vim.message}
            <span className="animate-blink">▎</span>
          </span>
        ) : state.vim.message ? (
          <span
            className={clsx(
              state.vim.messageType === "error" && "text-[#f7768e]",
              state.vim.messageType === "warning" && "text-[#e0af68]",
              state.vim.messageType === "info" && "text-[#7dcfff]",
              !state.vim.messageType && "text-[#c0caf5]"
            )}
          >
            {state.vim.message}
          </span>
        ) : null}
      </div>

      {/* Tmux Status Bar */}
      <div className="tmux-status sticky bottom-0 z-10">
        <div className="tmux-status-left overflow-hidden">
          <span className="text-[#9ece6a]">❐ {session.name}</span>
          <span className="hidden sm:inline">
            {session.windows.map((win, i) => (
              <span
                key={win.id}
                className={clsx("tmux-window", win.isActive && "active")}
              >
                {i}:{win.name}
              </span>
            ))}
          </span>
        </div>
        <div className="tmux-status-right">
          {state.tmux.prefixActive && (
            <span className="text-[#ff9e64] font-bold animate-pulse mr-2">
              ⌨ PREFIX
            </span>
          )}
          {state.tmux.copyMode.enabled && (
            <span className="text-[#bb9af7] mr-2">COPY</span>
          )}
          <span className="text-[#565f89] hidden md:inline">
            {state.keySequence.slice(-3).join(" → ") || "Ready"}
          </span>
        </div>
      </div>

      {/* CSS for blinking cursor */}
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s step-end infinite;
        }
      `}</style>
    </div>
  );
}

import type { VimBuffer, SimulatorState } from "@/lib/types";

interface VisualSelection {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

function getVisualSelection(buffer: VimBuffer, state: SimulatorState): VisualSelection | null {
  if (buffer.mode !== "visual" || !state.vim.visualSelection) return null;
  
  const { start, end } = state.vim.visualSelection;
  const startLine = start.line;
  const startCol = start.col;
  const endLine = end.line;
  const endCol = end.col;
  
  // Normalize so start is before end
  if (startLine < endLine || (startLine === endLine && startCol <= endCol)) {
    return { startLine, startCol, endLine, endCol };
  }
  return { startLine: endLine, startCol: endCol, endLine: startLine, endCol: startCol };
}

function isInVisualSelection(
  lineNum: number,
  colNum: number,
  selection: VisualSelection | null
): boolean {
  if (!selection) return false;
  
  const { startLine, startCol, endLine, endCol } = selection;
  
  if (lineNum < startLine || lineNum > endLine) return false;
  if (lineNum === startLine && lineNum === endLine) {
    return colNum >= startCol && colNum <= endCol;
  }
  if (lineNum === startLine) return colNum >= startCol;
  if (lineNum === endLine) return colNum <= endCol;
  return true;
}

function getSearchMatches(line: string, pattern: string | undefined): number[] {
  if (!pattern) return [];
  const matches: number[] = [];
  try {
    const regex = new RegExp(pattern, "gi");
    let match;
    while ((match = regex.exec(line)) !== null) {
      for (let i = 0; i < match[0].length; i++) {
        matches.push(match.index + i);
      }
    }
  } catch {
    // Invalid regex, try literal match
    let idx = 0;
    while ((idx = line.toLowerCase().indexOf(pattern.toLowerCase(), idx)) !== -1) {
      for (let i = 0; i < pattern.length; i++) {
        matches.push(idx + i);
      }
      idx += 1;
    }
  }
  return matches;
}

const VimPane = memo(function VimPane({
  buffer,
  state,
}: {
  buffer: VimBuffer;
  state: SimulatorState;
}) {
  const visibleLines = 18;
  
  const { startLine, displayLines } = useMemo(() => {
    const start = Math.max(0, buffer.cursorLine - Math.floor(visibleLines / 2));
    const end = Math.min(buffer.content.length, start + visibleLines);
    return {
      startLine: start,
      displayLines: buffer.content.slice(start, end),
    };
  }, [buffer.cursorLine, buffer.content, visibleLines]);
  
  const totalLines = buffer.content.length;
  const lineNumWidth = useMemo(() => {
    const digits = Math.max(2, String(totalLines).length);
    return `${digits + 1}ch`;
  }, [totalLines]);
  
  const visualSelection = useMemo(
    () => getVisualSelection(buffer, state),
    [buffer, state]
  );
  
  const searchPattern = state.vim.lastSearchPattern;
  
  const searchMatchesByLine = useMemo(() => {
    const matches = new Map<number, number[]>();
    displayLines.forEach((line, index) => {
      const lineNum = startLine + index;
      matches.set(lineNum, getSearchMatches(line, searchPattern ?? undefined));
    });
    return matches;
  }, [displayLines, startLine, searchPattern]);

  const emptyLines = useMemo(
    () => Array.from({ length: Math.max(0, visibleLines - displayLines.length) }),
    [visibleLines, displayLines.length]
  );

  return (
    <div className="p-2 font-mono text-sm overflow-hidden select-none">
      {displayLines.map((line, index) => {
        const lineNum = startLine + index;
        const isCurrent = lineNum === buffer.cursorLine;
        const searchMatches = searchMatchesByLine.get(lineNum) || [];

        return (
          <div
            key={lineNum}
            className={clsx(
              "flex",
              isCurrent && "bg-[#292e42]"
            )}
          >
            <span
              className={clsx(
                "line-number select-none text-right pr-2 flex-shrink-0",
                isCurrent ? "text-[#c0caf5]" : "text-[#565f89]"
              )}
              style={{ width: lineNumWidth }}
            >
              {lineNum + 1}
            </span>

            <span className="flex-1 whitespace-pre">
              {renderLine(
                line,
                lineNum,
                isCurrent ? buffer.cursorCol : -1,
                buffer.mode,
                visualSelection,
                searchMatches,
                buffer.cursorLine,
                buffer.cursorCol
              )}
            </span>
          </div>
        );
      })}

      {emptyLines.map((_, i) => (
        <div key={`empty-${i}`} className="flex">
          <span
            className="line-number text-right pr-2 text-[#565f89] flex-shrink-0"
            style={{ width: lineNumWidth }}
          >
            ~
          </span>
          <span className="flex-1" />
        </div>
      ))}
    </div>
  );
});

function renderLine(
  line: string,
  lineNum: number,
  cursorCol: number,
  mode: VimMode,
  visualSelection: VisualSelection | null,
  searchMatches: number[],
  cursorLine: number,
  cursorColAbsolute: number
) {
  const chars: React.ReactNode[] = [];
  const lineContent = line || " ";
  
  for (let i = 0; i <= lineContent.length; i++) {
    const char = lineContent[i] || (i === lineContent.length && cursorCol === i ? " " : null);
    if (char === null) continue;
    
    const isCursor = cursorCol === i;
    const isVisualSelected = isInVisualSelection(lineNum, i, visualSelection);
    const isSearchMatch = searchMatches.includes(i);
    const isCurrentSearchMatch = isSearchMatch && lineNum === cursorLine && i === cursorColAbsolute;
    
    let className = "";
    let backgroundColor: string | undefined;
    
    if (isCursor) {
      if (mode === "insert") {
        className = "cursor-insert";
      } else if (mode === "visual") {
        className = "cursor-block-visual";
      } else {
        className = "cursor-block";
      }
    } else if (isVisualSelected) {
      backgroundColor = "rgba(187, 154, 247, 0.3)";
    } else if (isCurrentSearchMatch) {
      backgroundColor = "rgba(255, 158, 100, 0.5)";
    } else if (isSearchMatch) {
      backgroundColor = "rgba(255, 158, 100, 0.2)";
    }
    
    const style: React.CSSProperties = backgroundColor ? { backgroundColor } : {};
    
    chars.push(
      <span key={i} className={className} style={style}>
        <SyntaxHighlightChar char={char} />
      </span>
    );
  }
  
  return <>{chars}</>;
}

// Tokenize the entire line for syntax highlighting context
interface Token {
  type: "keyword" | "string" | "comment" | "number" | "operator" | "text";
  start: number;
  end: number;
}

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < line.length) {
    // Check for comments
    if (line.slice(i, i + 2) === "//") {
      tokens.push({ type: "comment", start: i, end: line.length });
      break;
    }
    
    // Check for strings
    if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
      const quote = line[i];
      const start = i;
      i++;
      while (i < line.length && line[i] !== quote) {
        if (line[i] === "\\") i++;
        i++;
      }
      tokens.push({ type: "string", start, end: i + 1 });
      i++;
      continue;
    }
    
    // Check for numbers
    if (/\d/.test(line[i]) && (i === 0 || !/\w/.test(line[i - 1]))) {
      const start = i;
      while (i < line.length && /[\d.]/.test(line[i])) i++;
      tokens.push({ type: "number", start, end: i });
      continue;
    }
    
    // Check for keywords
    const keywords = ["function", "const", "let", "var", "if", "else", "return", "for", "while", "import", "export", "from", "class", "extends", "new", "this", "true", "false", "null", "undefined", "async", "await", "try", "catch", "throw", "typeof", "instanceof"];
    let matchedKeyword = false;
    for (const kw of keywords) {
      if (line.slice(i, i + kw.length) === kw) {
        const before = i > 0 ? line[i - 1] : " ";
        const after = line[i + kw.length] || " ";
        if (!/\w/.test(before) && !/\w/.test(after)) {
          tokens.push({ type: "keyword", start: i, end: i + kw.length });
          i += kw.length;
          matchedKeyword = true;
          break;
        }
      }
    }
    if (matchedKeyword) continue;
    
    // Check for operators
    if (/[=+\-*/<>!&|^%]/.test(line[i])) {
      tokens.push({ type: "operator", start: i, end: i + 1 });
      i++;
      continue;
    }
    
    i++;
  }
  
  return tokens;
}

const tokenCache = new Map<string, Token[]>();

function getTokenAtPosition(line: string, pos: number): Token | null {
  let tokens = tokenCache.get(line);
  if (!tokens) {
    tokens = tokenizeLine(line);
    tokenCache.set(line, tokens);
    // Limit cache size
    if (tokenCache.size > 1000) {
      const firstKey = tokenCache.keys().next().value;
      if (firstKey !== undefined) {
        tokenCache.delete(firstKey);
      }
    }
  }
  
  for (const token of tokens) {
    if (pos >= token.start && pos < token.end) {
      return token;
    }
  }
  return null;
}

const SyntaxHighlightChar = memo(function SyntaxHighlightChar({ char }: { char: string }) {
  return <>{char}</>;
});

const SyntaxHighlight = memo(function SyntaxHighlight({ text }: { text: string }) {
  if (!text) return null;
  
  const tokens = tokenizeLine(text);
  const result: React.ReactNode[] = [];
  let lastEnd = 0;
  
  for (const token of tokens) {
    // Add any text before this token
    if (token.start > lastEnd) {
      result.push(
        <span key={`text-${lastEnd}`} className="text-[#c0caf5]">
          {text.slice(lastEnd, token.start)}
        </span>
      );
    }
    
    const tokenText = text.slice(token.start, token.end);
    const colorClass = {
      keyword: "text-[#bb9af7]",
      string: "text-[#9ece6a]",
      comment: "text-[#565f89]",
      number: "text-[#ff9e64]",
      operator: "text-[#89ddff]",
      text: "text-[#c0caf5]",
    }[token.type];
    
    result.push(
      <span key={`${token.type}-${token.start}`} className={colorClass}>
        {tokenText}
      </span>
    );
    
    lastEnd = token.end;
  }
  
  if (lastEnd < text.length) {
    result.push(
      <span key={`text-${lastEnd}`} className="text-[#c0caf5]">
        {text.slice(lastEnd)}
      </span>
    );
  }
  
  return <>{result}</>;
});
