"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Navigation } from "@/components/Navigation";
import { KeyboardVisualizer } from "@/components/KeyboardVisualizer";
import { ShortcutReference } from "@/components/ShortcutReference";
import { useKeyHistoryStore } from "@/lib/stores/keyHistoryStore";
import clsx from "clsx";
import { RotateCcw, BookOpen, X } from "lucide-react";

const RealTerminal = dynamic(() => import("@/components/RealTerminal"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-[#1a1b26] rounded-lg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function PracticePage() {
  const [terminalKey, setTerminalKey] = useState(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const { pushKey, clear: clearKeys } = useKeyHistoryStore();

  const handleReset = () => {
    setTerminalKey((k) => k + 1);
    clearKeys();
    setConnected(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#1a1b26]">
      <Navigation />

      <main className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#c0caf5] mb-2">
                Free Practice Mode
              </h1>
              <p className="text-sm md:text-base text-[#a9b1d6]">
                Real tmux + neovim terminal. Practice splits, vim commands, and explore freely.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#24283b] text-sm">
                <span
                  className={clsx(
                    "w-2 h-2 rounded-full",
                    connected ? "bg-[#9ece6a]" : error ? "bg-[#f7768e]" : "bg-[#565f89]"
                  )}
                />
                <span className="text-[#a9b1d6] hidden sm:inline">
                  {connected ? "Connected" : error ? "Error" : "Connecting..."}
                </span>
              </div>

              <button
                onClick={() => setShowShortcuts(!showShortcuts)}
                className={clsx(
                  "flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm transition-colors",
                  showShortcuts
                    ? "bg-[#7aa2f7] text-[#1a1b26]"
                    : "bg-[#24283b] text-[#a9b1d6] hover:bg-[#2a2f45]"
                )}
              >
                {showShortcuts ? <X className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                <span className="hidden sm:inline">{showShortcuts ? "Hide Shortcuts" : "Shortcuts"}</span>
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-[#24283b] text-[#a9b1d6] hover:bg-[#2a2f45] transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>

          {/* Main Layout */}
          <div className={clsx("flex flex-col lg:flex-row gap-6", showShortcuts && "")}>
            {/* Terminal - Main Focus */}
            <div className={clsx("w-full", showShortcuts ? "lg:w-2/3" : "")}>
              <RealTerminal
                key={terminalKey}
                onKey={pushKey}
                onReady={() => setConnected(true)}
                onDisconnect={() => setConnected(false)}
                onError={setError}
                className="h-[500px] max-w-4xl rounded-lg overflow-hidden border border-[#3b4261]"
              />

              {/* Key Visualizer - Always Visible */}
              <div className="mt-4 overflow-x-auto">
                <KeyboardVisualizer />
              </div>

              {/* Quick Tips */}
              <div className="mt-4 bg-[#24283b] rounded-lg p-3 md:p-4">
                <div className="text-xs text-[#565f89] uppercase tracking-wider mb-2">
                  Quick Start
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
                  <div>
                    <span className="text-[#9ece6a]">tmux:</span>
                    <span className="text-[#a9b1d6] ml-2">Ctrl+a then - or _</span>
                  </div>
                  <div>
                    <span className="text-[#9ece6a]">Navigate:</span>
                    <span className="text-[#a9b1d6] ml-2">Ctrl+a then h/j/k/l</span>
                  </div>
                  <div>
                    <span className="text-[#7aa2f7]">Vim:</span>
                    <span className="text-[#a9b1d6] ml-2">h/j/k/l, i, Esc</span>
                  </div>
                  <div>
                    <span className="text-[#7aa2f7]">Commands:</span>
                    <span className="text-[#a9b1d6] ml-2">:w :q dd yy p</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shortcut Reference Panel */}
            {showShortcuts && (
              <div className="w-full lg:w-1/3">
                <ShortcutReference />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
