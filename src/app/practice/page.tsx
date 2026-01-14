"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Terminal } from "@/components/Terminal";
import { KeyboardHandler } from "@/components/KeyboardHandler";
import { KeyboardVisualizer } from "@/components/KeyboardVisualizer";
import { ShortcutReference } from "@/components/ShortcutReference";
import { useSimulatorStore } from "@/lib/store";
import clsx from "clsx";
import { RotateCcw, BookOpen, X } from "lucide-react";

const sampleFiles = [
  {
    name: "app.tsx",
    content: [
      "import React from 'react';",
      "import { useState, useEffect } from 'react';",
      "",
      "interface User {",
      "  id: string;",
      "  name: string;",
      "  email: string;",
      "}",
      "",
      "export function App() {",
      "  const [users, setUsers] = useState<User[]>([]);",
      "  const [loading, setLoading] = useState(true);",
      "",
      "  useEffect(() => {",
      "    fetchUsers().then(data => {",
      "      setUsers(data);",
      "      setLoading(false);",
      "    });",
      "  }, []);",
      "",
      "  if (loading) return <div>Loading...</div>;",
      "",
      "  return (",
      "    <div className=\"container\">",
      "      <h1>User Management</h1>",
      "      <UserList users={users} />",
      "    </div>",
      "  );",
      "}",
    ],
  },
  {
    name: "utils.ts",
    content: [
      "// Utility functions",
      "",
      "export function debounce<T extends (...args: any[]) => any>(",
      "  func: T,",
      "  wait: number",
      "): (...args: Parameters<T>) => void {",
      "  let timeout: NodeJS.Timeout | null = null;",
      "",
      "  return function (...args: Parameters<T>) {",
      "    if (timeout) clearTimeout(timeout);",
      "    timeout = setTimeout(() => func(...args), wait);",
      "  };",
      "}",
      "",
      "export function formatDate(date: Date): string {",
      "  return new Intl.DateTimeFormat('en-US', {",
      "    year: 'numeric',",
      "    month: 'long',",
      "    day: 'numeric',",
      "  }).format(date);",
      "}",
      "",
      "export function clamp(value: number, min: number, max: number): number {",
      "  return Math.min(Math.max(value, min), max);",
      "}",
    ],
  },
  {
    name: "config.json",
    content: [
      "{",
      '  "name": "my-app",',
      '  "version": "1.0.0",',
      '  "scripts": {',
      '    "dev": "next dev",',
      '    "build": "next build",',
      '    "start": "next start",',
      '    "lint": "eslint . --ext .ts,.tsx"',
      "  },",
      '  "dependencies": {',
      '    "react": "^18.2.0",',
      '    "next": "^14.0.0",',
      '    "typescript": "^5.0.0"',
      "  }",
      "}",
    ],
  },
];

export default function PracticePage() {
  const { state, resetSimulator } = useSimulatorStore();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const activeBuffer = state.vim.buffers.find(
    (b) => b.id === state.vim.activeBufferId
  );

  return (
    <div className="min-h-screen bg-[#1a1b26]">
      <Navigation />
      <KeyboardHandler />

      <main className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#c0caf5] mb-2">
                Free Practice Mode
              </h1>
              <p className="text-sm md:text-base text-[#a9b1d6]">
                Full simulator with no constraints. Practice tmux splits, vim commands, and explore freely.
              </p>
            </div>

            <div className="flex items-center gap-2">
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
                onClick={resetSimulator}
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
              <Terminal />

              {/* Key Visualizer - Always Visible */}
              <div className="mt-4 overflow-x-auto">
                <KeyboardVisualizer />
              </div>

              {/* Status Bar */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                <div className="bg-[#24283b] rounded-lg p-3">
                  <div className="text-xs text-[#565f89] uppercase tracking-wider mb-1">
                    tmux Status
                  </div>
                  <div className="flex items-center gap-2">
                    {state.tmux.prefixActive ? (
                      <span className="text-[#ff9e64] font-medium">PREFIX</span>
                    ) : (
                      <span className="text-[#9ece6a]">Ready</span>
                    )}
                  </div>
                </div>

                <div className="bg-[#24283b] rounded-lg p-3">
                  <div className="text-xs text-[#565f89] uppercase tracking-wider mb-1">
                    Vim Mode
                  </div>
                  <div
                    className={clsx(
                      "font-medium uppercase",
                      activeBuffer?.mode === "normal" && "text-[#7aa2f7]",
                      activeBuffer?.mode === "insert" && "text-[#9ece6a]",
                      activeBuffer?.mode === "visual" && "text-[#bb9af7]",
                      activeBuffer?.mode === "command" && "text-[#ff9e64]"
                    )}
                  >
                    {activeBuffer?.mode || "normal"}
                  </div>
                </div>

                <div className="bg-[#24283b] rounded-lg p-3">
                  <div className="text-xs text-[#565f89] uppercase tracking-wider mb-1">
                    Cursor
                  </div>
                  <div className="text-[#c0caf5] font-mono text-sm">
                    {(activeBuffer?.cursorLine || 0) + 1}:{(activeBuffer?.cursorCol || 0) + 1}
                  </div>
                </div>

                <div className="bg-[#24283b] rounded-lg p-3">
                  <div className="text-xs text-[#565f89] uppercase tracking-wider mb-1">
                    Panes
                  </div>
                  <div className="text-[#c0caf5] font-mono text-sm">
                    {state.tmux.sessions.find((s) => s.id === state.tmux.activeSessionId)?.windows.find((w) => w.id === state.tmux.sessions.find((s) => s.id === state.tmux.activeSessionId)?.activeWindowId)?.panes.length || 1}
                  </div>
                </div>
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
