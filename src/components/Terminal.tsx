"use client";

import { useEffect, useRef } from "react";
import { useSimulatorStore } from "@/lib/store";
import { VimMode } from "@/lib/types";
import clsx from "clsx";

const modeColors: Record<VimMode, string> = {
  normal: "bg-[#7aa2f7] text-[#1a1b26]",
  insert: "bg-[#9ece6a] text-[#1a1b26]",
  visual: "bg-[#bb9af7] text-[#1a1b26]",
  command: "bg-[#ff9e64] text-[#1a1b26]",
};

const modeLabels: Record<VimMode, string> = {
  normal: "NORMAL",
  insert: "INSERT",
  visual: "VISUAL",
  command: "COMMAND",
};

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, handleKeyPress } = useSimulatorStore();
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

  const handleClick = () => {
    containerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent default for keys we handle
    const shouldPrevent = [
      "Tab", "Escape", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Backspace", "Enter"
    ].includes(e.key);

    if (e.ctrlKey || e.metaKey || shouldPrevent) {
      // Allow Ctrl+C, Ctrl+V for system clipboard
      if (e.ctrlKey && (e.key === "c" || e.key === "v")) {
        return;
      }
      e.preventDefault();
    }

    // Map key names
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
  };

  if (!session || !window || !activeBuffer) return null;

  return (
    <div 
      ref={containerRef}
      className="terminal w-full max-w-5xl mx-auto outline-none cursor-text"
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
      <div className="relative bg-[#1a1b26] min-h-[400px]">
        {window.panes.length === 1 ? (
          <VimPane buffer={activeBuffer} state={state} />
        ) : (
          <div className="flex flex-wrap h-full">
            {window.panes.map((pane, index) => (
              <div
                key={pane.id}
                className={clsx(
                  "border border-[#414868] relative",
                  pane.isActive && "border-[#7aa2f7]",
                  window.panes.length === 2 && "w-1/2",
                  window.panes.length > 2 && "w-1/2"
                )}
                style={{
                  minHeight: "200px",
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
      <div className="flex items-center bg-[#24283b] text-sm">
        <div className={clsx("px-2 py-1 font-bold", modeColors[activeBuffer.mode])}>
          {modeLabels[activeBuffer.mode]}
          {state.vim.pendingOperator && (
            <span className="ml-1 text-[#1a1b26]">-{state.vim.pendingOperator}</span>
          )}
        </div>
        <div className="px-3 py-1 text-[#a9b1d6]">
          {activeBuffer.filename}
          {activeBuffer.modified && (
            <span className="text-[#f7768e] ml-1">[+]</span>
          )}
        </div>
        <div className="flex-1" />
        <div className="px-3 py-1 text-[#565f89]">
          Ln {activeBuffer.cursorLine + 1}, Col {activeBuffer.cursorCol + 1}
        </div>
        {state.vim.commandMode && (
          <div className="px-3 py-1 text-[#c0caf5]">
            :{state.vim.commandLine}
            <span className="cursor-line">|</span>
          </div>
        )}
      </div>

      {/* Tmux Status Bar */}
      <div className="tmux-status">
        <div className="tmux-status-left">
          <span className="text-[#9ece6a]">❐ {session.name}</span>
          {session.windows.map((win, i) => (
            <span
              key={win.id}
              className={clsx("tmux-window", win.isActive && "active")}
            >
              {i}:{win.name}
            </span>
          ))}
        </div>
        <div className="tmux-status-right">
          {state.tmux.prefixActive && (
            <span className="text-[#ff9e64] font-bold animate-pulse mr-2">
              ⌨ PREFIX
            </span>
          )}
          {state.tmux.copyMode && (
            <span className="text-[#bb9af7] mr-2">COPY</span>
          )}
          <span className="text-[#565f89]">
            {state.keySequence.slice(-3).join(" → ") || "Ready"}
          </span>
        </div>
      </div>
    </div>
  );
}

import type { VimBuffer, SimulatorState } from "@/lib/types";

function VimPane({
  buffer,
  state,
}: {
  buffer: VimBuffer;
  state: SimulatorState;
}) {
  const visibleLines = 18;
  const startLine = Math.max(0, buffer.cursorLine - Math.floor(visibleLines / 2));
  const endLine = Math.min(buffer.content.length, startLine + visibleLines);
  const displayLines = buffer.content.slice(startLine, endLine);

  return (
    <div className="p-2 font-mono text-sm overflow-hidden select-none">
      {/* Line numbers gutter + content */}
      {displayLines.map((line, index) => {
        const lineNum = startLine + index;
        const isCurrent = lineNum === buffer.cursorLine;

        return (
          <div key={lineNum} className={clsx("flex", isCurrent && "bg-[#24283b]")}>
            {/* Line number */}
            <span
              className={clsx(
                "line-number select-none w-8 text-right pr-2",
                isCurrent ? "text-[#c0caf5]" : "text-[#565f89]"
              )}
            >
              {lineNum + 1}
            </span>

            {/* Line content */}
            <span className="flex-1 whitespace-pre">
              {renderLine(line, isCurrent ? buffer.cursorCol : -1, buffer.mode)}
            </span>
          </div>
        );
      })}

      {/* Fill remaining space with ~ */}
      {Array.from({ length: Math.max(0, visibleLines - displayLines.length) }).map(
        (_, i) => (
          <div key={`empty-${i}`} className="flex">
            <span className="line-number w-8 text-right pr-2 text-[#565f89]">~</span>
            <span className="flex-1" />
          </div>
        )
      )}

      {/* Message line */}
      {state.vim.message && (
        <div
          className={clsx(
            "mt-2 px-2 text-sm",
            state.vim.messageType === "error" && "text-[#f7768e]",
            state.vim.messageType === "warning" && "text-[#e0af68]",
            state.vim.messageType === "info" && "text-[#7dcfff]"
          )}
        >
          {state.vim.message}
        </div>
      )}
    </div>
  );
}

function renderLine(line: string, cursorCol: number, mode: VimMode) {
  if (cursorCol < 0) {
    return <SyntaxHighlight text={line} />;
  }

  const before = line.slice(0, cursorCol);
  const cursor = line[cursorCol] || " ";
  const after = line.slice(cursorCol + 1);

  return (
    <>
      <SyntaxHighlight text={before} />
      <span className={mode === "insert" ? "cursor-line" : "cursor-block"}>
        {cursor}
      </span>
      <SyntaxHighlight text={after} />
    </>
  );
}

function SyntaxHighlight({ text }: { text: string }) {
  if (!text) return null;
  
  // Comments
  if (text.includes("//")) {
    const idx = text.indexOf("//");
    return (
      <>
        <SyntaxHighlight text={text.slice(0, idx)} />
        <span className="text-[#565f89]">{text.slice(idx)}</span>
      </>
    );
  }

  // Strings
  const stringMatch = text.match(/(['"`])(?:[^\\]|\\.)*?\1/);
  if (stringMatch) {
    const idx = text.indexOf(stringMatch[0]);
    return (
      <>
        <SyntaxHighlight text={text.slice(0, idx)} />
        <span className="text-[#9ece6a]">{stringMatch[0]}</span>
        <SyntaxHighlight text={text.slice(idx + stringMatch[0].length)} />
      </>
    );
  }

  // Keywords
  const keywords = ["function", "const", "let", "var", "if", "else", "return", "for", "while", "import", "export", "from", "class", "extends", "new", "this", "true", "false", "null", "undefined"];
  for (const kw of keywords) {
    const regex = new RegExp(`\\b(${kw})\\b`);
    const match = text.match(regex);
    if (match && match.index !== undefined) {
      return (
        <>
          <SyntaxHighlight text={text.slice(0, match.index)} />
          <span className="text-[#bb9af7]">{kw}</span>
          <SyntaxHighlight text={text.slice(match.index + kw.length)} />
        </>
      );
    }
  }

  // Numbers
  const numMatch = text.match(/\b(\d+)\b/);
  if (numMatch && numMatch.index !== undefined) {
    return (
      <>
        <span className="text-[#c0caf5]">{text.slice(0, numMatch.index)}</span>
        <span className="text-[#ff9e64]">{numMatch[0]}</span>
        <SyntaxHighlight text={text.slice(numMatch.index + numMatch[0].length)} />
      </>
    );
  }

  return <span className="text-[#c0caf5]">{text}</span>;
}
