"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createDefaultFileSystem, FileSystem } from "@/lib/simulator/filesystem";
import clsx from "clsx";

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
  expanded?: boolean;
}

interface FileExplorerProps {
  onOpenFile?: (path: string, content: string) => void;
  currentFile?: string;
}

type InputMode = "none" | "newFile" | "newDir" | "rename" | "search";

export function FileExplorer({ onOpenFile, currentFile }: FileExplorerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fs] = useState<FileSystem>(() => createDefaultFileSystem());
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [flatNodes, setFlatNodes] = useState<TreeNode[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [inputValue, setInputValue] = useState("");
  const [clipboard, setClipboard] = useState<{ path: string; cut: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const buildTree = useCallback((dirPath: string): TreeNode[] => {
    try {
      const entries = fs.listDirectory(dirPath);
      return entries
        .filter((name) => showHidden || !name.startsWith("."))
        .map((name) => {
          const fullPath = dirPath === "/" ? `/${name}` : `${dirPath}/${name}`;
          const isDir = fs.isDirectory(fullPath);
          return {
            name,
            path: fullPath,
            isDirectory: isDir,
            expanded: false,
            children: isDir ? [] : undefined,
          };
        })
        .sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
    } catch {
      return [];
    }
  }, [fs, showHidden]);

  const refreshTree = useCallback(() => {
    setTree(buildTree("/"));
  }, [buildTree]);

  useEffect(() => {
    refreshTree();
  }, [refreshTree]);

  const flattenTree = useCallback((nodes: TreeNode[], depth = 0): (TreeNode & { depth: number })[] => {
    const result: (TreeNode & { depth: number })[] = [];
    for (const node of nodes) {
      result.push({ ...node, depth });
      if (node.isDirectory && node.expanded && node.children) {
        result.push(...flattenTree(node.children, depth + 1));
      }
    }
    return result;
  }, []);

  useEffect(() => {
    setFlatNodes(flattenTree(tree));
  }, [tree, flattenTree]);

  const toggleExpand = useCallback((path: string) => {
    const updateNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((node) => {
        if (node.path === path) {
          const expanded = !node.expanded;
          return {
            ...node,
            expanded,
            children: expanded && node.isDirectory ? buildTree(path) : node.children,
          };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setTree(updateNodes(tree));
  }, [tree, buildTree]);

  const handleOpen = useCallback(() => {
    const node = flatNodes[selectedIndex];
    if (!node) return;
    if (node.isDirectory) {
      toggleExpand(node.path);
    } else {
      try {
        const content = fs.readFile(node.path);
        onOpenFile?.(node.path, content);
      } catch {
        // ignore
      }
    }
  }, [flatNodes, selectedIndex, toggleExpand, fs, onOpenFile]);

  const createFile = useCallback((name: string) => {
    const node = flatNodes[selectedIndex];
    const parentPath = node?.isDirectory ? node.path : node?.path.split("/").slice(0, -1).join("/") || "/";
    const newPath = parentPath === "/" ? `/${name}` : `${parentPath}/${name}`;
    try {
      fs.createFile(newPath, "");
      refreshTree();
    } catch {
      // ignore
    }
  }, [flatNodes, selectedIndex, fs, refreshTree]);

  const createDirectory = useCallback((name: string) => {
    const node = flatNodes[selectedIndex];
    const parentPath = node?.isDirectory ? node.path : node?.path.split("/").slice(0, -1).join("/") || "/";
    const newPath = parentPath === "/" ? `/${name}` : `${parentPath}/${name}`;
    try {
      fs.createDirectory(newPath);
      refreshTree();
    } catch {
      // ignore
    }
  }, [flatNodes, selectedIndex, fs, refreshTree]);

  const deleteNode = useCallback((path: string) => {
    try {
      fs.deleteFile(path);
      refreshTree();
      setConfirmDelete(null);
    } catch {
      // ignore
    }
  }, [fs, refreshTree]);

  const renameNode = useCallback((newName: string) => {
    const node = flatNodes[selectedIndex];
    if (!node) return;
    const parentPath = node.path.split("/").slice(0, -1).join("/") || "/";
    const newPath = parentPath === "/" ? `/${newName}` : `${parentPath}/${newName}`;
    try {
      fs.renameFile(node.path, newPath);
      refreshTree();
    } catch {
      // ignore
    }
  }, [flatNodes, selectedIndex, fs, refreshTree]);

  const copyToClipboard = useCallback((cut: boolean) => {
    const node = flatNodes[selectedIndex];
    if (node) {
      setClipboard({ path: node.path, cut });
    }
  }, [flatNodes, selectedIndex]);

  const paste = useCallback(() => {
    if (!clipboard) return;
    const node = flatNodes[selectedIndex];
    const destDir = node?.isDirectory ? node.path : node?.path.split("/").slice(0, -1).join("/") || "/";
    const fileName = clipboard.path.split("/").pop() || "file";
    const newPath = destDir === "/" ? `/${fileName}` : `${destDir}/${fileName}`;
    
    try {
      if (clipboard.cut) {
        fs.renameFile(clipboard.path, newPath);
        setClipboard(null);
      } else {
        const content = fs.readFile(clipboard.path);
        fs.createFile(newPath, content);
      }
      refreshTree();
    } catch {
      // ignore
    }
  }, [clipboard, flatNodes, selectedIndex, fs, refreshTree]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (inputMode !== "none") {
      if (e.key === "Escape") {
        setInputMode("none");
        setInputValue("");
        containerRef.current?.focus();
      } else if (e.key === "Enter") {
        if (inputMode === "newFile" && inputValue) createFile(inputValue);
        if (inputMode === "newDir" && inputValue) createDirectory(inputValue);
        if (inputMode === "rename" && inputValue) renameNode(inputValue);
        setInputMode("none");
        setInputValue("");
        containerRef.current?.focus();
      }
      return;
    }

    if (confirmDelete) {
      if (e.key === "y" || e.key === "Y") {
        deleteNode(confirmDelete);
      } else {
        setConfirmDelete(null);
      }
      return;
    }

    const key = e.key;
    const modifiers = { ctrl: e.ctrlKey, shift: e.shiftKey };

    if ((key === "F9") || (key === "e" && e.code === "KeyE" && !e.ctrlKey && !e.altKey)) {
      return;
    }

    if (key === "q" || key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (key === "j" || key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatNodes.length - 1));
      return;
    }

    if (key === "k" || key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (key === "Enter") {
      e.preventDefault();
      handleOpen();
      return;
    }

    if (key === "a" && !modifiers.shift) {
      e.preventDefault();
      setInputMode("newFile");
      setInputValue("");
      return;
    }

    if (key === "A" || (key === "a" && modifiers.shift)) {
      e.preventDefault();
      setInputMode("newDir");
      setInputValue("");
      return;
    }

    if (key === "d") {
      e.preventDefault();
      const node = flatNodes[selectedIndex];
      if (node) setConfirmDelete(node.path);
      return;
    }

    if (key === "r") {
      e.preventDefault();
      const node = flatNodes[selectedIndex];
      if (node) {
        setInputMode("rename");
        setInputValue(node.name);
      }
      return;
    }

    if (key === "y" && !modifiers.shift) {
      e.preventDefault();
      const node = flatNodes[selectedIndex];
      if (node) navigator.clipboard?.writeText(node.name);
      return;
    }

    if (key === "Y" || (key === "y" && modifiers.shift)) {
      e.preventDefault();
      const node = flatNodes[selectedIndex];
      if (node) navigator.clipboard?.writeText(node.path);
      return;
    }

    if (key === "x") {
      e.preventDefault();
      copyToClipboard(true);
      return;
    }

    if (key === "p") {
      e.preventDefault();
      paste();
      return;
    }

    if (key === "H") {
      e.preventDefault();
      setShowHidden((h) => !h);
      return;
    }

    if (key === "/") {
      e.preventDefault();
      setInputMode("search");
      setInputValue("");
      return;
    }
  }, [inputMode, confirmDelete, flatNodes, selectedIndex, handleOpen, createFile, createDirectory, deleteNode, renameNode, copyToClipboard, paste]);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === "F9") {
        e.preventDefault();
        setIsOpen((o) => !o);
        return;
      }
      if (e.key === " " && !e.ctrlKey && !e.altKey && !e.metaKey && document.activeElement?.tagName !== "INPUT") {
        const terminalFocused = document.querySelector(".terminal:focus, .terminal:focus-within");
        if (terminalFocused) {
          return;
        }
      }
      if (e.key === "e" && e.code === "KeyE" && !e.ctrlKey && !e.altKey && !e.metaKey && document.activeElement?.tagName !== "INPUT") {
        const terminalFocused = document.querySelector(".terminal:focus, .terminal:focus-within");
        if (terminalFocused) {
          e.preventDefault();
          setIsOpen((o) => !o);
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  useEffect(() => {
    if (isOpen) {
      containerRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (inputMode !== "none") {
      inputRef.current?.focus();
    }
  }, [inputMode]);

  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const handler = (e: KeyboardEvent) => handleKeyDown(e);
    container.addEventListener("keydown", handler);
    return () => container.removeEventListener("keydown", handler);
  }, [isOpen, handleKeyDown]);

  const filteredNodes = inputMode === "search" && inputValue
    ? flatNodes.filter((n) => n.name.toLowerCase().includes(inputValue.toLowerCase()))
    : flatNodes;

  if (!isOpen) return null;

  return (
    <div
      className={clsx(
        "fixed inset-y-0 left-0 z-50 w-72 bg-[#1a1b26] border-r border-[#414868] shadow-xl",
        "transform transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div
        ref={containerRef}
        tabIndex={0}
        className="h-full flex flex-col outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#24283b] border-b border-[#414868]">
          <div className="flex items-center gap-2">
            <span className="text-[#7aa2f7]">󰙅</span>
            <span className="text-sm text-[#a9b1d6] font-medium">File Explorer</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-[#565f89] hover:text-[#c0caf5] text-sm"
          >
            ✕
          </button>
        </div>

        {/* Input bar for new file/dir/rename/search */}
        {inputMode !== "none" && (
          <div className="px-3 py-2 bg-[#24283b] border-b border-[#414868]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#565f89]">
                {inputMode === "newFile" && "New file:"}
                {inputMode === "newDir" && "New directory:"}
                {inputMode === "rename" && "Rename:"}
                {inputMode === "search" && "/"}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 bg-[#1a1b26] text-[#c0caf5] text-sm px-2 py-1 rounded border border-[#414868] outline-none focus:border-[#7aa2f7]"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="px-3 py-2 bg-[#f7768e]/20 border-b border-[#f7768e]">
            <span className="text-sm text-[#f7768e]">
              Delete {confirmDelete.split("/").pop()}? (y/n)
            </span>
          </div>
        )}

        {/* Tree */}
        <div className="flex-1 overflow-auto py-1">
          {filteredNodes.map((node, index) => {
            const actualIndex = inputMode === "search" && inputValue ? flatNodes.indexOf(node) : index;
            const isSelected = actualIndex === selectedIndex;
            const isCurrent = currentFile === node.path;
            const depth = (node as TreeNode & { depth: number }).depth || 0;

            return (
              <div
                key={node.path}
                className={clsx(
                  "flex items-center gap-1 px-2 py-0.5 cursor-pointer text-sm",
                  isSelected && "bg-[#364a82]",
                  isCurrent && !isSelected && "bg-[#24283b]",
                  "hover:bg-[#24283b]"
                )}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={() => {
                  setSelectedIndex(actualIndex);
                  handleOpen();
                }}
              >
                {node.isDirectory ? (
                  <>
                    <span className={clsx("text-[#e0af68]", node.expanded && "rotate-90 transform")}>
                      {node.expanded ? "▼" : "▶"}
                    </span>
                    <span className="text-[#7aa2f7]">📁</span>
                  </>
                ) : (
                  <>
                    <span className="w-3" />
                    <span className="text-[#565f89]">📄</span>
                  </>
                )}
                <span
                  className={clsx(
                    "truncate",
                    node.isDirectory ? "text-[#7aa2f7]" : "text-[#a9b1d6]",
                    isCurrent && "text-[#9ece6a] font-medium"
                  )}
                >
                  {node.name}
                </span>
                {clipboard?.path === node.path && (
                  <span className="text-xs text-[#bb9af7] ml-auto">
                    {clipboard.cut ? "cut" : "copy"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer with shortcuts */}
        <div className="px-3 py-2 bg-[#24283b] border-t border-[#414868] text-xs text-[#565f89]">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span><kbd className="text-[#7aa2f7]">j/k</kbd> nav</span>
            <span><kbd className="text-[#7aa2f7]">Enter</kbd> open</span>
            <span><kbd className="text-[#7aa2f7]">a</kbd> file</span>
            <span><kbd className="text-[#7aa2f7]">A</kbd> dir</span>
            <span><kbd className="text-[#7aa2f7]">d</kbd> del</span>
            <span><kbd className="text-[#7aa2f7]">r</kbd> rename</span>
            <span><kbd className="text-[#7aa2f7]">q</kbd> close</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FileExplorer;
