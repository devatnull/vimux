"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { normalizeKeyFromDomEvent } from "@/lib/keys/normalizeKey";
import * as conn from "@/lib/terminalConnection";
import type { ConnectionStatus } from "@/lib/terminalConnection";

interface RealTerminalProps {
  className?: string;
  onReady?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onKey?: (key: string) => void;
}

export function RealTerminal({
  className = "",
  onReady,
  onDisconnect,
  onError,
  onKey,
}: RealTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const mountedRef = useRef(true);
  const terminalOpenRef = useRef(false);
  const pendingWritesRef = useRef<string[]>([]);

  const [status, setStatus] = useState<ConnectionStatus>(conn.getStatus());
  const [statusMessage, setStatusMessage] = useState("");

  // Stable callback refs to avoid useEffect re-runs
  const onReadyRef = useRef(onReady);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);
  const onKeyRef = useRef(onKey);
  
  useEffect(() => {
    onReadyRef.current = onReady;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
    onKeyRef.current = onKey;
  });

  // Write to terminal, buffering if not yet open
  const writeToTerminal = useCallback((data: string) => {
    if (!mountedRef.current) return;
    
    if (terminalOpenRef.current && terminalInstance.current) {
      try {
        terminalInstance.current.write(data);
      } catch (e) {
        console.error("Failed to write to terminal:", e);
      }
    } else {
      // Buffer writes until terminal is open
      pendingWritesRef.current.push(data);
    }
  }, []);

  // Flush pending writes when terminal opens
  const flushPendingWrites = useCallback(() => {
    if (!terminalInstance.current || !terminalOpenRef.current) return;
    
    const pending = pendingWritesRef.current;
    pendingWritesRef.current = [];
    
    for (const data of pending) {
      try {
        terminalInstance.current.write(data);
      } catch (e) {
        console.error("Failed to flush write:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;
    mountedRef.current = true;
    terminalOpenRef.current = false;
    pendingWritesRef.current = [];

    // Create terminal UI
    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: "#1a1b26",
        foreground: "#a9b1d6",
        cursor: "#c0caf5",
        cursorAccent: "#1a1b26",
        selectionBackground: "#364a82",
        black: "#32344a",
        red: "#f7768e",
        green: "#9ece6a",
        yellow: "#e0af68",
        blue: "#7aa2f7",
        magenta: "#ad8ee6",
        cyan: "#449dab",
        white: "#787c99",
        brightBlack: "#444b6a",
        brightRed: "#ff7a93",
        brightGreen: "#b9f27c",
        brightYellow: "#ff9e64",
        brightBlue: "#7da6ff",
        brightMagenta: "#bb9af7",
        brightCyan: "#0db9d7",
        brightWhite: "#acb0d0",
      },
      allowProposedApi: true,
      scrollback: 10000,
    });

    fitAddon.current = new FitAddon();
    terminal.loadAddon(fitAddon.current);
    terminal.loadAddon(new WebLinksAddon());
    terminalInstance.current = terminal;

    // Wire up terminal input to connection
    terminal.onData((data) => {
      conn.sendInput(data);
    });

    // Wire up key events for lesson validation
    terminal.onKey(({ domEvent }) => {
      const normalizedKey = normalizeKeyFromDomEvent(domEvent);
      if (normalizedKey && onKeyRef.current) {
        onKeyRef.current(normalizedKey);
      }
    });

    // IMPORTANT: Subscribe to messages BEFORE connecting
    // This ensures we don't miss any output
    const unsubMessage = conn.onMessage((data) => {
      writeToTerminal(data);
    });

    // Subscribe to status changes
    const unsubStatus = conn.onStatus((newStatus, message) => {
      if (!mountedRef.current) return;
      setStatus(newStatus);
      setStatusMessage(message);
      
      if (newStatus === "connected") {
        // Focus and resize when connected
        setTimeout(() => {
          if (!mountedRef.current || !terminalInstance.current) return;
          terminalInstance.current.focus();
          if (fitAddon.current) {
            try {
              fitAddon.current.fit();
              conn.sendResize(terminalInstance.current.cols, terminalInstance.current.rows);
            } catch { /* ignore */ }
          }
        }, 50);
        onReadyRef.current?.();
      } else if (newStatus === "disconnected") {
        onDisconnectRef.current?.();
      } else if (newStatus === "error") {
        onErrorRef.current?.(message);
      }
    });

    // Open terminal in DOM
    const openTerminal = () => {
      if (!mountedRef.current || !terminalRef.current || terminalOpenRef.current) return;
      
      try {
        terminal.open(terminalRef.current);
        terminalOpenRef.current = true;
        
        // Fit and flush any pending output
        setTimeout(() => {
          if (!mountedRef.current || !fitAddon.current) return;
          try {
            fitAddon.current.fit();
            flushPendingWrites();
            // Send initial resize
            conn.sendResize(terminal.cols, terminal.rows);
          } catch { /* ignore */ }
        }, 50);
      } catch (e) {
        console.error("Failed to open terminal:", e);
      }
    };

    // Open after a tick to ensure DOM is ready
    const openTimer = setTimeout(openTerminal, 10);

    // Start connection (handlers are already subscribed above)
    conn.connect();

    // Resize observer
    let resizeObserver: ResizeObserver | null = null;
    const setupResizeObserver = () => {
      if (!terminalRef.current || !mountedRef.current) return;
      
      resizeObserver = new ResizeObserver(() => {
        if (!mountedRef.current || !fitAddon.current || !terminalInstance.current || !terminalOpenRef.current) return;
        requestAnimationFrame(() => {
          if (!mountedRef.current || !fitAddon.current || !terminalInstance.current) return;
          try {
            fitAddon.current.fit();
            conn.sendResize(terminalInstance.current.cols, terminalInstance.current.rows);
          } catch { /* ignore */ }
        });
      });
      resizeObserver.observe(terminalRef.current);
    };
    
    const resizeTimer = setTimeout(setupResizeObserver, 100);

    return () => {
      mountedRef.current = false;
      terminalOpenRef.current = false;
      clearTimeout(openTimer);
      clearTimeout(resizeTimer);
      resizeObserver?.disconnect();
      unsubMessage();
      unsubStatus();
      try {
        terminal.dispose();
      } catch { /* Already disposed */ }
      terminalInstance.current = null;
      fitAddon.current = null;
      pendingWritesRef.current = [];
      // DON'T disconnect - keep the connection alive for reuse
    };
  }, [writeToTerminal, flushPendingWrites]);

  const handleReconnect = () => {
    conn.reconnect();
  };

  return (
    <div className={`relative flex flex-col bg-[#1a1b26] overflow-hidden ${className}`}>
      {status !== "connected" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1a1b26]/90">
          <div className="text-center">
            {status === "connecting" && (
              <>
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-300">{statusMessage}</p>
              </>
            )}

            {status === "disconnected" && (
              <>
                <p className="text-gray-300 mb-4">{statusMessage || "Disconnected"}</p>
                <button
                  onClick={handleReconnect}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Connect
                </button>
              </>
            )}

            {status === "error" && (
              <>
                <p className="text-red-400 mb-4">{statusMessage}</p>
                <button
                  onClick={handleReconnect}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div
        ref={terminalRef}
        className="flex-1 p-2 overflow-hidden"
      />

      <div className="flex items-center justify-between px-3 py-1 bg-[#16161e] text-xs text-gray-500 border-t border-gray-800">
        <span>
          {status === "connected" && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Connected
            </span>
          )}
          {status === "connecting" && "Connecting..."}
          {status === "disconnected" && "Disconnected"}
          {status === "error" && "Error"}
        </span>
        <span>Real neovim + tmux</span>
      </div>
    </div>
  );
}

export default RealTerminal;
