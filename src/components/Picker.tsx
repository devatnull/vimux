"use client";

import { useState, useEffect, useRef, useMemo, useCallback, type ReactElement } from "react";
import clsx from "clsx";

export interface PickerItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  preview?: string[];
  category?: string;
  path?: string;
}

export type PickerMode = "files" | "buffers" | "commands" | "search";

interface PickerProps {
  items: PickerItem[];
  mode: PickerMode;
  onSelect: (item: PickerItem) => void;
  onClose: () => void;
  placeholder: string;
}

const modeIcons: Record<PickerMode, string> = {
  files: "📁",
  buffers: "📄",
  commands: "⌘",
  search: "🔍",
};

const modeLabels: Record<PickerMode, string> = {
  files: "Files",
  buffers: "Buffers",
  commands: "Commands",
  search: "Search",
};

function fuzzyMatch(query: string, text: string): { matches: boolean; score: number; indices: number[] } {
  if (!query) return { matches: true, score: 0, indices: [] };
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const indices: number[] = [];
  let queryIdx = 0;
  let score = 0;
  let consecutive = 0;
  
  for (let i = 0; i < textLower.length && queryIdx < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIdx]) {
      indices.push(i);
      queryIdx++;
      consecutive++;
      score += consecutive * 2;
      if (i === 0 || text[i - 1] === "/" || text[i - 1] === " " || text[i - 1] === "-" || text[i - 1] === "_") {
        score += 10;
      }
    } else {
      consecutive = 0;
    }
  }
  
  return {
    matches: queryIdx === queryLower.length,
    score,
    indices,
  };
}

function HighlightedText({ text, indices }: { text: string; indices: number[] }) {
  if (!indices.length) {
    return <span>{text}</span>;
  }
  
  const indicesSet = new Set(indices);
  const parts: ReactElement[] = [];
  let currentRun = "";
  let isHighlighted = false;
  
  for (let i = 0; i < text.length; i++) {
    const shouldHighlight = indicesSet.has(i);
    
    if (shouldHighlight !== isHighlighted) {
      if (currentRun) {
        parts.push(
          <span key={parts.length} className={isHighlighted ? "text-[#7aa2f7] font-bold" : ""}>
            {currentRun}
          </span>
        );
      }
      currentRun = text[i];
      isHighlighted = shouldHighlight;
    } else {
      currentRun += text[i];
    }
  }
  
  if (currentRun) {
    parts.push(
      <span key={parts.length} className={isHighlighted ? "text-[#7aa2f7] font-bold" : ""}>
        {currentRun}
      </span>
    );
  }
  
  return <>{parts}</>;
}

export function Picker({ items, mode, onSelect, onClose, placeholder }: PickerProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return items.map(item => ({ item, indices: [] as number[], score: 0 }));
    }
    
    return items
      .map(item => {
        const labelMatch = fuzzyMatch(query, item.label);
        const descMatch = item.description ? fuzzyMatch(query, item.description) : { matches: false, score: 0, indices: [] };
        const pathMatch = item.path ? fuzzyMatch(query, item.path) : { matches: false, score: 0, indices: [] };
        
        const matches = labelMatch.matches || descMatch.matches || pathMatch.matches;
        const score = Math.max(labelMatch.score, descMatch.score * 0.5, pathMatch.score * 0.7);
        
        return {
          item,
          indices: labelMatch.matches ? labelMatch.indices : (pathMatch.matches ? pathMatch.indices : []),
          score,
          matches,
        };
      })
      .filter(r => r.matches)
      .sort((a, b) => b.score - a.score);
  }, [items, query]);

  const selectedItem = filteredItems[selectedIndex]?.item;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const selectedEl = listRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        onClose();
        break;
      case "Enter":
        e.preventDefault();
        if (selectedItem) {
          onSelect(selectedItem);
        }
        break;
      case "ArrowDown":
      case "j":
        if (e.key === "j" && !e.ctrlKey) break;
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
        break;
      case "ArrowUp":
      case "k":
        if (e.key === "k" && !e.ctrlKey) break;
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case "Tab":
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedIndex(i => Math.max(i - 1, 0));
        } else {
          setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
        }
        break;
    }
  }, [filteredItems.length, onClose, onSelect, selectedItem]);

  const handleItemKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "j" || e.key === "k") {
      e.preventDefault();
      if (e.key === "j") {
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
      } else {
        setSelectedIndex(i => Math.max(i - 1, 0));
      }
    }
  }, [filteredItems.length]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#1a1b26] border border-[#414868] rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#414868] bg-[#24283b]">
          <span className="text-sm">{modeIcons[mode]}</span>
          <span className="text-sm font-medium text-[#7aa2f7]">{modeLabels[mode]}</span>
          <span className="text-xs text-[#565f89]">
            {filteredItems.length} / {items.length}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-[#1a1b26] text-[#c0caf5] placeholder-[#565f89] outline-none border-b border-[#414868] font-mono text-sm"
            spellCheck={false}
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#565f89] hover:text-[#c0caf5] transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto"
          onKeyDown={handleItemKeyDown}
        >
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#565f89]">
              No results found
            </div>
          ) : (
            filteredItems.map(({ item, indices }, index) => (
              <div
                key={item.id}
                className={clsx(
                  "flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors",
                  index === selectedIndex
                    ? "bg-[#364a82] text-[#c0caf5]"
                    : "hover:bg-[#24283b] text-[#a9b1d6]"
                )}
                onClick={() => onSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {item.icon && (
                  <span className="text-sm flex-shrink-0">{item.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm truncate">
                    <HighlightedText text={item.label} indices={indices} />
                  </div>
                  {item.description && (
                    <div className="text-xs text-[#565f89] truncate">
                      {item.description}
                    </div>
                  )}
                </div>
                {item.category && (
                  <span className="text-xs px-2 py-0.5 rounded bg-[#414868] text-[#7dcfff] flex-shrink-0">
                    {item.category}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Preview Pane */}
        {selectedItem?.preview && selectedItem.preview.length > 0 && (
          <div className="border-t border-[#414868] bg-[#16161e] max-h-[30vh] overflow-y-auto">
            <div className="px-4 py-2 text-xs text-[#565f89] border-b border-[#414868] bg-[#1a1b26]">
              Preview: {selectedItem.label}
            </div>
            <pre className="p-4 font-mono text-xs text-[#a9b1d6] overflow-x-auto">
              {selectedItem.preview.slice(0, 20).map((line, i) => (
                <div key={i} className="flex">
                  <span className="w-8 text-right pr-3 text-[#565f89] select-none">{i + 1}</span>
                  <span>{line}</span>
                </div>
              ))}
              {selectedItem.preview.length > 20 && (
                <div className="text-[#565f89] mt-2">
                  ... {selectedItem.preview.length - 20} more lines
                </div>
              )}
            </pre>
          </div>
        )}

        {/* Footer with keybindings */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[#414868] bg-[#24283b] text-xs text-[#565f89]">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#414868] text-[#c0caf5] font-mono">↑↓</kbd>
            <span className="ml-1">navigate</span>
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#414868] text-[#c0caf5] font-mono">j/k</kbd>
            <span className="ml-1">vim nav</span>
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#414868] text-[#c0caf5] font-mono">Enter</kbd>
            <span className="ml-1">select</span>
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#414868] text-[#c0caf5] font-mono">Esc</kbd>
            <span className="ml-1">close</span>
          </span>
        </div>
      </div>
    </div>
  );
}
