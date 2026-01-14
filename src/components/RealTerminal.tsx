"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

// =============================================================================
// Types
// =============================================================================

interface RealTerminalProps {
  wsUrl?: string;
  className?: string;
  onReady?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

// =============================================================================
// Component
// =============================================================================

export function RealTerminal({
  wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws",
  className = "",
  onReady,
  onDisconnect,
  onError,
}: RealTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [statusMessage, setStatusMessage] = useState("Connecting...");

  // ===========================================================================
  // WebSocket Connection
  // ===========================================================================

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    setStatusMessage("Connecting to terminal server...");

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setStatusMessage("Starting terminal...");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "session":
            console.log("Session ID:", message.id);
            break;

          case "status":
            setStatusMessage(message.message);
            break;

          case "ready":
            setStatus("connected");
            setStatusMessage("");
            terminalInstance.current?.focus();
            onReady?.();
            
            // Send initial resize
            if (terminalInstance.current && fitAddon.current) {
              ws.send(JSON.stringify({
                type: "resize",
                cols: terminalInstance.current.cols,
                rows: terminalInstance.current.rows,
              }));
            }
            break;

          case "output":
            terminalInstance.current?.write(message.data);
            break;

          case "error":
            setStatus("error");
            setStatusMessage(message.message);
            onError?.(message.message);
            break;

          case "timeout":
            setStatus("disconnected");
            setStatusMessage(message.message);
            onDisconnect?.();
            break;

          case "shutdown":
            setStatus("disconnected");
            setStatusMessage("Server is restarting...");
            onDisconnect?.();
            break;

          case "pong":
            // Heartbeat response
            break;
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setStatus("error");
      setStatusMessage("Connection error");
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      wsRef.current = null;

      if (status === "connected") {
        setStatus("disconnected");
        setStatusMessage("Disconnected from server");
        onDisconnect?.();
      }

      // Attempt reconnect after 5 seconds (unless it was intentional)
      if (event.code !== 1000 && event.code !== 1001) {
        reconnectTimeout.current = setTimeout(() => {
          console.log("Attempting reconnect...");
          connect();
        }, 5000);
      }
    };
  }, [wsUrl, status, onReady, onDisconnect, onError]);

  // ===========================================================================
  // Terminal Setup
  // ===========================================================================

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
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

    // Add addons
    fitAddon.current = new FitAddon();
    terminal.loadAddon(fitAddon.current);
    terminal.loadAddon(new WebLinksAddon());

    // Open terminal
    terminal.open(terminalRef.current);
    fitAddon.current.fit();
    terminalInstance.current = terminal;

    // Handle user input
    terminal.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "input", data }));
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddon.current) {
        fitAddon.current.fit();
        if (wsRef.current?.readyState === WebSocket.OPEN && terminal.cols && terminal.rows) {
          wsRef.current.send(JSON.stringify({
            type: "resize",
            cols: terminal.cols,
            rows: terminal.rows,
          }));
        }
      }
    });
    resizeObserver.observe(terminalRef.current);

    // Connect to server
    connect();

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    // Cleanup
    return () => {
      clearInterval(heartbeat);
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      resizeObserver.disconnect();
      terminal.dispose();
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
      }
    };
  }, [connect]);

  // ===========================================================================
  // Reconnect Handler
  // ===========================================================================

  const handleReconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    terminalInstance.current?.clear();
    connect();
  }, [connect]);

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className={`relative flex flex-col h-full bg-[#1a1b26] ${className}`}>
      {/* Status overlay */}
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
                <p className="text-gray-300 mb-4">{statusMessage}</p>
                <button
                  onClick={handleReconnect}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Reconnect
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

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="flex-1 p-2"
        style={{ minHeight: "400px" }}
      />

      {/* Status bar */}
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
