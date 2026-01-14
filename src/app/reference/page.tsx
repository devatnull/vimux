"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { ShortcutReference } from "@/components/ShortcutReference";
import { shortcuts, getTotalShortcuts, getTmuxShortcuts, getNeovimShortcuts } from "@/lib/shortcuts";
import clsx from "clsx";
import { Download, Printer } from "lucide-react";

type Tab = "all" | "tmux" | "neovim";

export default function ReferencePage() {
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const tabs: { id: Tab; label: string; color: string }[] = [
    { id: "all", label: "All Shortcuts", color: "text-[#c0caf5]" },
    { id: "tmux", label: "tmux", color: "text-[#9ece6a]" },
    { id: "neovim", label: "Neovim", color: "text-[#7aa2f7]" },
  ];

  const tmuxCount = getTmuxShortcuts();
  const neovimCount = getNeovimShortcuts();
  const totalCount = getTotalShortcuts();

  return (
    <div className="min-h-screen bg-[#1a1b26]">
      <Navigation />

      <main className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#c0caf5] mb-2">
                Shortcut Reference
              </h1>
              <p className="text-[#a9b1d6]">
                Complete reference of all {totalCount} shortcuts (
                {tmuxCount} tmux, {neovimCount} Neovim)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#24283b] text-[#a9b1d6] hover:bg-[#2a2f45] transition-colors text-sm"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>

          {/* Key Info */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-[#24283b] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[#9ece6a] mb-2">
                tmux Prefix
              </h3>
              <div className="flex items-center gap-2">
                <kbd className="key">Ctrl</kbd>
                <span className="text-[#565f89]">+</span>
                <kbd className="key">a</kbd>
                <span className="text-[#a9b1d6] text-sm ml-2">
                  (or Ctrl+b)
                </span>
              </div>
              <p className="text-xs text-[#565f89] mt-2">
                Press prefix before tmux commands
              </p>
            </div>

            <div className="bg-[#24283b] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[#7aa2f7] mb-2">
                Neovim Leader
              </h3>
              <div className="flex items-center gap-2">
                <kbd className="key special">Space</kbd>
              </div>
              <p className="text-xs text-[#565f89] mt-2">
                Press Space before leader commands
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-[#24283b] " + tab.color
                    : "text-[#565f89] hover:text-[#a9b1d6]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Shortcuts */}
          <ShortcutReference
            category={activeTab === "all" ? undefined : activeTab}
          />

          {/* Platform Note */}
          <div className="mt-8 p-4 bg-[#24283b] rounded-lg">
            <h3 className="font-medium text-[#c0caf5] mb-2">
              Platform-Specific Keys
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="text-[#565f89] mb-1">macOS</h4>
                <ul className="text-[#a9b1d6] space-y-1">
                  <li>
                    <kbd className="key text-xs">⌃</kbd> = Control
                  </li>
                  <li>
                    <kbd className="key text-xs">⌥</kbd> = Option/Alt
                  </li>
                  <li>
                    <kbd className="key text-xs">⇧</kbd> = Shift
                  </li>
                  <li>
                    <kbd className="key text-xs">⌘</kbd> = Command
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-[#565f89] mb-1">Windows/Linux</h4>
                <ul className="text-[#a9b1d6] space-y-1">
                  <li>
                    <kbd className="key text-xs">Ctrl</kbd> = Control
                  </li>
                  <li>
                    <kbd className="key text-xs">Alt</kbd> = Alt
                  </li>
                  <li>
                    <kbd className="key text-xs">Shift</kbd> = Shift
                  </li>
                  <li>
                    <kbd className="key text-xs">Win</kbd> = Windows/Super
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
