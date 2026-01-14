"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Terminal } from "@/components/Terminal";
import { KeyboardHandler } from "@/components/KeyboardHandler";
import { KeyboardVisualizer } from "@/components/KeyboardVisualizer";
import { useSimulatorStore } from "@/lib/store";
import clsx from "clsx";
import { RotateCcw, Info, Keyboard } from "lucide-react";

const tips = [
  {
    category: "tmux",
    tips: [
      "Press Ctrl+a then - to split horizontally",
      "Press Ctrl+a then _ to split vertically",
      "Use Ctrl+a h/j/k/l to navigate between panes",
      "Press Ctrl+a c to create a new window",
      "Press Ctrl+a 0-9 to switch windows",
    ],
  },
  {
    category: "neovim",
    tips: [
      "Use h/j/k/l for cursor movement in normal mode",
      "Press i to enter insert mode, Esc to exit",
      "Use w/b to jump between words",
      "Press 0 for line start, $ for line end",
      "Press gg for file start, G for file end",
      "Press : to enter command mode",
    ],
  },
];

export default function PracticePage() {
  const { state, resetSimulator } = useSimulatorStore();
  const [showTips, setShowTips] = useState(true);

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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#c0caf5] mb-2">
                Practice Mode
              </h1>
              <p className="text-[#a9b1d6]">
                Free practice with tmux and Neovim. No lessons, just explore!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTips(!showTips)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors",
                  showTips
                    ? "bg-[#7aa2f7] text-[#1a1b26]"
                    : "bg-[#24283b] text-[#a9b1d6] hover:bg-[#2a2f45]"
                )}
              >
                <Info className="w-4 h-4" />
                Tips
              </button>
              <button
                onClick={resetSimulator}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#24283b] text-[#a9b1d6] hover:bg-[#2a2f45] transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Terminal */}
            <div className="lg:col-span-2">
              <Terminal />

              {/* Keyboard Visualizer */}
              <div className="mt-4">
                <KeyboardVisualizer />
              </div>

              {/* Status Info */}
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="bg-[#24283b] rounded-lg p-4">
                  <div className="text-xs text-[#565f89] uppercase tracking-wider mb-1">
                    tmux Status
                  </div>
                  <div className="flex items-center gap-2">
                    {state.tmux.prefixActive ? (
                      <span className="text-[#ff9e64] font-medium">
                        PREFIX ACTIVE
                      </span>
                    ) : (
                      <span className="text-[#9ece6a]">Ready</span>
                    )}
                  </div>
                </div>

                <div className="bg-[#24283b] rounded-lg p-4">
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

                <div className="bg-[#24283b] rounded-lg p-4">
                  <div className="text-xs text-[#565f89] uppercase tracking-wider mb-1">
                    Cursor Position
                  </div>
                  <div className="text-[#c0caf5] font-mono">
                    {(activeBuffer?.cursorLine || 0) + 1}:
                    {(activeBuffer?.cursorCol || 0) + 1}
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Panel */}
            {showTips && (
              <div className="space-y-6">
                <div className="bg-[#24283b] rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Keyboard className="w-5 h-5 text-[#7aa2f7]" />
                    <h3 className="font-semibold text-[#c0caf5]">
                      Quick Reference
                    </h3>
                  </div>

                  {tips.map((section) => (
                    <div key={section.category} className="mb-6 last:mb-0">
                      <h4
                        className={clsx(
                          "text-sm font-medium mb-2",
                          section.category === "tmux"
                            ? "text-[#9ece6a]"
                            : "text-[#7aa2f7]"
                        )}
                      >
                        {section.category === "tmux" ? "tmux" : "Neovim"}
                      </h4>
                      <ul className="space-y-2">
                        {section.tips.map((tip, i) => (
                          <li
                            key={i}
                            className="text-sm text-[#a9b1d6] pl-3 border-l-2 border-[#414868]"
                          >
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="bg-[#24283b] rounded-lg p-6">
                  <h3 className="font-semibold text-[#c0caf5] mb-4">
                    Try These Exercises
                  </h3>
                  <ol className="space-y-3 text-sm text-[#a9b1d6]">
                    <li className="flex gap-2">
                      <span className="text-[#7aa2f7] font-mono">1.</span>
                      Split the terminal into 2 panes
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#7aa2f7] font-mono">2.</span>
                      Navigate between panes
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#7aa2f7] font-mono">3.</span>
                      Move to line 5 in the editor
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#7aa2f7] font-mono">4.</span>
                      Enter insert mode and type something
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#7aa2f7] font-mono">5.</span>
                      Return to normal mode
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
