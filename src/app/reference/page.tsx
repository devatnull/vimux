"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import {
  shortcuts,
  getTotalShortcuts,
  getTmuxShortcuts,
  getNeovimShortcuts,
} from "@/lib/shortcuts";
import clsx from "clsx";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Printer,
  X,
} from "lucide-react";
import type { Shortcut } from "@/lib/types";

type CategoryFilter =
  | "all"
  | "tmux"
  | "vim-motions"
  | "vim-operators"
  | "vim-commands"
  | "leader-keys";

const CATEGORY_FILTERS: { id: CategoryFilter; label: string; color: string }[] = [
  { id: "all", label: "All", color: "text-[#c0caf5]" },
  { id: "tmux", label: "tmux", color: "text-[#9ece6a]" },
  { id: "vim-motions", label: "Vim Motions", color: "text-[#7aa2f7]" },
  { id: "vim-operators", label: "Vim Operators", color: "text-[#bb9af7]" },
  { id: "vim-commands", label: "Vim Commands", color: "text-[#f7768e]" },
  { id: "leader-keys", label: "Leader Keys", color: "text-[#e0af68]" },
];

const VIM_MOTION_SUBCATEGORIES = ["Basic Motions", "Search", "Marks"];
const VIM_OPERATOR_SUBCATEGORIES = ["Operators", "Text Objects", "Visual Mode"];
const VIM_COMMAND_SUBCATEGORIES = [
  "Command Mode",
  "Insert Mode",
  "Macros",
  "Folding",
];
const LEADER_KEY_SUBCATEGORIES = [
  "File Navigation",
  "Git",
  "Search Operations",
  "LSP",
  "Window Navigation",
  "Window Resizing",
  "Terminal",
  "Buffers",
  "Neo-tree",
  "Neo-tree Git",
  "Outline",
  "Autocomplete",
  "Toggles",
  "Utility",
  "Session",
  "AI Assistant",
  "Word Navigation",
  "Dashboard",
];

function matchesCategoryFilter(
  shortcut: Shortcut,
  filter: CategoryFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "tmux") return shortcut.category === "tmux";
  if (filter === "vim-motions") {
    return (
      shortcut.category === "neovim" &&
      VIM_MOTION_SUBCATEGORIES.includes(shortcut.subcategory || "")
    );
  }
  if (filter === "vim-operators") {
    return (
      shortcut.category === "neovim" &&
      VIM_OPERATOR_SUBCATEGORIES.includes(shortcut.subcategory || "")
    );
  }
  if (filter === "vim-commands") {
    return (
      shortcut.category === "neovim" &&
      VIM_COMMAND_SUBCATEGORIES.includes(shortcut.subcategory || "")
    );
  }
  if (filter === "leader-keys") {
    return (
      shortcut.category === "neovim" &&
      LEADER_KEY_SUBCATEGORIES.includes(shortcut.subcategory || "")
    );
  }
  return false;
}

export default function ReferencePage() {
  const [search, setSearchInternal] = useState("");
  const [categoryFilter, setCategoryFilterInternal] = useState<CategoryFilter>("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const setSearch = useCallback((value: string) => {
    setSearchInternal(value);
    setSelectedIndex(-1);
  }, []);

  const setCategoryFilter = useCallback((value: CategoryFilter) => {
    setCategoryFilterInternal(value);
    setSelectedIndex(-1);
  }, []);

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

  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter((s) => {
      const matchesCategory = matchesCategoryFilter(s, categoryFilter);
      const matchesSearch =
        !search ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        s.keys.some((k) => k.toLowerCase().includes(search.toLowerCase())) ||
        s.subcategory?.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, categoryFilter]);

  const groupedShortcuts = useMemo(() => {
    return filteredShortcuts.reduce(
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
        { category: string; subcategory: string; shortcuts: Shortcut[] }
      >
    );
  }, [filteredShortcuts]);

  const flatList = useMemo(() => {
    const items: { type: "group" | "shortcut"; id: string; data: unknown }[] = [];
    Object.entries(groupedShortcuts).forEach(([key, group]) => {
      items.push({ type: "group", id: key, data: group });
      if (expandedItems.has(key)) {
        group.shortcuts.forEach((s) => {
          items.push({ type: "shortcut", id: s.id, data: s });
        });
      }
    });
    return items;
  }, [groupedShortcuts, expandedItems]);

  const toggleExpand = useCallback((key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleShortcutExpand = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      const detailKey = `detail-${id}`;
      if (next.has(detailKey)) {
        next.delete(detailKey);
      } else {
        next.add(detailKey);
      }
      return next;
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        if (e.key === "Escape") {
          (e.target as HTMLInputElement).blur();
          setSelectedIndex(0);
        }
        return;
      }

      const moveDown = e.key === "j" || e.key === "ArrowDown";
      const moveUp = e.key === "k" || e.key === "ArrowUp";
      const expand = e.key === "Enter" || e.key === "l" || e.key === "ArrowRight";
      const collapse = e.key === "h" || e.key === "ArrowLeft";
      const focusSearch = e.key === "/";

      if (focusSearch) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (moveDown) {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatList.length - 1));
      } else if (moveUp) {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (expand && selectedIndex >= 0) {
        e.preventDefault();
        const item = flatList[selectedIndex];
        if (item.type === "group") {
          if (!expandedItems.has(item.id)) {
            toggleExpand(item.id);
          }
        } else {
          toggleShortcutExpand(item.id);
        }
      } else if (collapse && selectedIndex >= 0) {
        e.preventDefault();
        const item = flatList[selectedIndex];
        if (item.type === "group") {
          if (expandedItems.has(item.id)) {
            toggleExpand(item.id);
          }
        } else {
          const detailKey = `detail-${item.id}`;
          if (expandedItems.has(detailKey)) {
            toggleShortcutExpand(item.id);
          }
        }
      }
    },
    [flatList, selectedIndex, expandedItems, toggleExpand, toggleShortcutExpand]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < flatList.length) {
      const item = flatList[selectedIndex];
      const el = itemRefs.current.get(item.id);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex, flatList]);

  const tmuxCount = getTmuxShortcuts();
  const neovimCount = getNeovimShortcuts();
  const totalCount = getTotalShortcuts();

  const getContext = (shortcut: Shortcut): string => {
    return shortcut.category === "tmux" ? "tmux" : "vim";
  };

  return (
    <div className="min-h-screen bg-[#1a1b26]">
      <Navigation />

      <main className="pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[#c0caf5] mb-2">
                Shortcut Reference
              </h1>
              <p className="text-[#a9b1d6]">
                Complete reference of all {totalCount} shortcuts ({tmuxCount}{" "}
                tmux, {neovimCount} Neovim)
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#24283b] text-[#a9b1d6] hover:bg-[#2a2f45] transition-colors text-sm"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#24283b] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[#9ece6a] mb-2">
                tmux Prefix
              </h3>
              <div className="flex items-center gap-2">
                <kbd className="key">Ctrl</kbd>
                <span className="text-[#565f89]">+</span>
                <kbd className="key">a</kbd>
                <span className="text-[#a9b1d6] text-sm ml-2">(or Ctrl+b)</span>
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

          <div className="bg-[#24283b] rounded-lg p-6">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#565f89]" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shortcuts... (press / to focus)"
                className="w-full pl-10 pr-10 py-2 bg-[#1a1b26] border border-[#414868] rounded-lg text-[#c0caf5] placeholder-[#565f89] focus:outline-none focus:border-[#7aa2f7]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#565f89] hover:text-[#c0caf5]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORY_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setCategoryFilter(filter.id)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    categoryFilter === filter.id
                      ? `bg-[#414868] ${filter.color}`
                      : "text-[#565f89] hover:text-[#a9b1d6] hover:bg-[#1a1b26]"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-[#565f89] mb-4 flex items-center gap-4">
              <span>
                {filteredShortcuts.length} shortcut
                {filteredShortcuts.length !== 1 ? "s" : ""}
              </span>
              <span className="hidden sm:inline">
                Navigate: <kbd className="key text-xs mx-1">j</kbd>/
                <kbd className="key text-xs mx-1">k</kbd> or arrows
              </span>
              <span className="hidden sm:inline">
                Expand: <kbd className="key text-xs mx-1">Enter</kbd>
              </span>
            </div>

            <div
              ref={listRef}
              className="space-y-2 max-h-[600px] overflow-y-auto"
              role="listbox"
              tabIndex={0}
            >
              {Object.entries(groupedShortcuts).map(([key, group]) => {
                const isExpanded = expandedItems.has(key);
                const groupIndex = flatList.findIndex(
                  (item) => item.type === "group" && item.id === key
                );
                const isGroupSelected = selectedIndex === groupIndex;

                return (
                  <div
                    key={key}
                    className="border border-[#414868] rounded-lg overflow-hidden"
                  >
                    <button
                      ref={(el) => {
                        if (el) itemRefs.current.set(key, el);
                      }}
                      onClick={() => toggleExpand(key)}
                      className={clsx(
                        "w-full flex items-center gap-2 p-3 transition-colors",
                        isGroupSelected
                          ? "bg-[#414868] ring-2 ring-[#7aa2f7] ring-inset"
                          : "bg-[#1a1b26] hover:bg-[#2a2f45]"
                      )}
                      role="option"
                      aria-selected={isGroupSelected}
                      aria-expanded={isExpanded}
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
                      <span
                        className={clsx(
                          "text-xs px-2 py-0.5 rounded ml-2",
                          group.category === "tmux"
                            ? "bg-[#9ece6a]/20 text-[#9ece6a]"
                            : "bg-[#7aa2f7]/20 text-[#7aa2f7]"
                        )}
                      >
                        {group.category}
                      </span>
                      <span className="text-xs text-[#565f89] ml-auto">
                        {group.shortcuts.length} shortcut
                        {group.shortcuts.length !== 1 ? "s" : ""}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="divide-y divide-[#414868]">
                        {group.shortcuts.map((shortcut) => {
                          const shortcutIndex = flatList.findIndex(
                            (item) =>
                              item.type === "shortcut" && item.id === shortcut.id
                          );
                          const isSelected = selectedIndex === shortcutIndex;
                          const isDetailExpanded = expandedItems.has(
                            `detail-${shortcut.id}`
                          );

                          return (
                            <div key={shortcut.id}>
                              <button
                                ref={(el) => {
                                  if (el) itemRefs.current.set(shortcut.id, el);
                                }}
                                onClick={() => toggleShortcutExpand(shortcut.id)}
                                className={clsx(
                                  "w-full flex items-center justify-between p-3 transition-colors text-left",
                                  isSelected
                                    ? "bg-[#414868] ring-2 ring-[#7aa2f7] ring-inset"
                                    : "hover:bg-[#1a1b26]/50"
                                )}
                                role="option"
                                aria-selected={isSelected}
                                aria-expanded={isDetailExpanded}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {isDetailExpanded ? (
                                    <ChevronDown className="w-3 h-3 text-[#565f89] flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-[#565f89] flex-shrink-0" />
                                  )}
                                  <span className="text-sm text-[#a9b1d6] truncate">
                                    {shortcut.description}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                  <span
                                    className={clsx(
                                      "text-xs px-1.5 py-0.5 rounded",
                                      getContext(shortcut) === "tmux"
                                        ? "bg-[#9ece6a]/10 text-[#9ece6a]"
                                        : "bg-[#7aa2f7]/10 text-[#7aa2f7]"
                                    )}
                                  >
                                    {getContext(shortcut)}
                                  </span>
                                  <div className="flex gap-1">
                                    {shortcut.keys.map((k, i) => (
                                      <span key={i} className="flex items-center">
                                        <kbd className="key text-xs">
                                          {formatKey(k)}
                                        </kbd>
                                        {i < shortcut.keys.length - 1 && (
                                          <span className="text-[#565f89] mx-1 text-xs">
                                            →
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </button>
                              {isDetailExpanded && (
                                <div className="px-3 pb-3 pt-1 bg-[#1a1b26]/30 border-t border-[#414868]">
                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                      <span className="text-[#565f89]">ID:</span>
                                      <span className="text-[#a9b1d6] ml-2 font-mono">
                                        {shortcut.id}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[#565f89]">
                                        Category:
                                      </span>
                                      <span className="text-[#a9b1d6] ml-2">
                                        {shortcut.category}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[#565f89]">
                                        Subcategory:
                                      </span>
                                      <span className="text-[#a9b1d6] ml-2">
                                        {shortcut.subcategory || "None"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[#565f89]">
                                        Context:
                                      </span>
                                      <span className="text-[#a9b1d6] ml-2">
                                        {getContext(shortcut)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-[#414868]">
                                    <span className="text-[#565f89] text-xs">
                                      Keys:
                                    </span>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {shortcut.keys.map((k, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center gap-1"
                                        >
                                          <kbd className="key">{formatKey(k)}</kbd>
                                          {i < shortcut.keys.length - 1 && (
                                            <span className="text-[#565f89]">
                                              then
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredShortcuts.length === 0 && (
              <div className="text-center py-8 text-[#565f89]">
                No shortcuts found matching &quot;{search}&quot;
              </div>
            )}
          </div>

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
