"use client";

import { useState } from "react";
import { shortcuts, getSubcategories } from "@/lib/shortcuts";
import clsx from "clsx";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

interface ShortcutReferenceProps {
  category?: "tmux" | "neovim";
}

export function ShortcutReference({ category }: ShortcutReferenceProps) {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Basic Motions", "Session Management", "File Navigation"])
  );

  const filteredShortcuts = shortcuts.filter((s) => {
    const matchesCategory = !category || s.category === category;
    const matchesSearch =
      !search ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.keys.some((k) => k.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const groupedShortcuts = filteredShortcuts.reduce(
    (acc, shortcut) => {
      const key = `${shortcut.category}-${shortcut.subcategory}`;
      if (!acc[key]) {
        acc[key] = {
          category: shortcut.category,
          subcategory: shortcut.subcategory || "Other",
          shortcuts: [],
        };
      }
      acc[key].shortcuts.push(shortcut);
      return acc;
    },
    {} as Record<
      string,
      { category: string; subcategory: string; shortcuts: typeof shortcuts }
    >
  );

  const toggleCategory = (key: string) => {
    const next = new Set(expandedCategories);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpandedCategories(next);
  };

  const isMac =
    typeof navigator !== "undefined" && navigator.platform.includes("Mac");

  const formatKey = (key: string): string => {
    return key
      .replace("Ctrl-", isMac ? "⌃" : "Ctrl+")
      .replace("Alt-", isMac ? "⌥" : "Alt+")
      .replace("Shift-", isMac ? "⇧" : "Shift+")
      .replace("Meta-", isMac ? "⌘" : "Win+")
      .replace("Space", "␣");
  };

  return (
    <div className="bg-[#24283b] rounded-lg p-6">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#565f89]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shortcuts..."
          className="w-full pl-10 pr-4 py-2 bg-[#1a1b26] border border-[#414868] rounded-lg text-[#c0caf5] placeholder-[#565f89] focus:outline-none focus:border-[#7aa2f7]"
        />
      </div>

      {/* Category Filter */}
      {!category && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSearch("")}
            className={clsx(
              "px-3 py-1 rounded text-sm transition-colors",
              !search
                ? "bg-[#414868] text-[#c0caf5]"
                : "text-[#565f89] hover:text-[#a9b1d6]"
            )}
          >
            All
          </button>
          <button
            onClick={() => setSearch("tmux")}
            className={clsx(
              "px-3 py-1 rounded text-sm transition-colors",
              search === "tmux"
                ? "bg-[#9ece6a] text-[#1a1b26]"
                : "text-[#9ece6a] hover:bg-[#9ece6a]/20"
            )}
          >
            tmux
          </button>
          <button
            onClick={() => setSearch("neovim")}
            className={clsx(
              "px-3 py-1 rounded text-sm transition-colors",
              search === "neovim"
                ? "bg-[#7aa2f7] text-[#1a1b26]"
                : "text-[#7aa2f7] hover:bg-[#7aa2f7]/20"
            )}
          >
            Neovim
          </button>
        </div>
      )}

      {/* Shortcuts List */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {Object.entries(groupedShortcuts).map(([key, group]) => {
          const isExpanded = expandedCategories.has(group.subcategory);
          return (
            <div key={key} className="border border-[#414868] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(group.subcategory)}
                className="w-full flex items-center gap-2 p-3 bg-[#1a1b26] hover:bg-[#2a2f45] transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-[#565f89]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#565f89]" />
                )}
                <span
                  className={clsx(
                    "font-medium",
                    group.category === "tmux"
                      ? "text-[#9ece6a]"
                      : "text-[#7aa2f7]"
                  )}
                >
                  {group.subcategory}
                </span>
                <span className="text-xs text-[#565f89] ml-auto">
                  {group.shortcuts.length} shortcuts
                </span>
              </button>

              {isExpanded && (
                <div className="divide-y divide-[#414868]">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between p-3 hover:bg-[#1a1b26]/50"
                    >
                      <span className="text-sm text-[#a9b1d6]">
                        {shortcut.description}
                      </span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, i) => (
                          <span key={i}>
                            <span className="key text-xs">{formatKey(key)}</span>
                            {i < shortcut.keys.length - 1 && (
                              <span className="text-[#565f89] mx-1">then</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredShortcuts.length === 0 && (
        <div className="text-center py-8 text-[#565f89]">
          No shortcuts found matching "{search}"
        </div>
      )}
    </div>
  );
}
