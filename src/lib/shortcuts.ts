import type { Shortcut } from "./types";

export const shortcuts: Shortcut[] = [
  // ============================================
  // TMUX - SESSION MANAGEMENT
  // ============================================
  { id: "tmux-new-session", keys: ["Ctrl-a", "c"], description: "Create new session", category: "tmux", subcategory: "Session Management" },
  { id: "tmux-new-session-alt", keys: ["Ctrl-a", "Ctrl-c"], description: "Create new session (alt)", category: "tmux", subcategory: "Session Management" },
  { id: "tmux-last-session", keys: ["Ctrl-a", "Shift-Tab"], description: "Switch to last session", category: "tmux", subcategory: "Session Management" },
  { id: "tmux-find-session", keys: ["Ctrl-a", "Ctrl-f"], description: "Find session (prompt)", category: "tmux", subcategory: "Session Management" },
  { id: "tmux-rename-session", keys: ["Ctrl-a", "$"], description: "Rename session", category: "tmux", subcategory: "Session Management" },

  // ============================================
  // TMUX - WINDOW MANAGEMENT
  // ============================================
  { id: "tmux-split-h", keys: ["Ctrl-a", "-"], description: "Split horizontally", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-split-v", keys: ["Ctrl-a", "_"], description: "Split vertically", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-new-window", keys: ["Ctrl-a", "c"], description: "Create new window", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-prev-window", keys: ["Ctrl-a", "Ctrl-h"], description: "Previous window", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-next-window", keys: ["Ctrl-a", "Ctrl-l"], description: "Next window", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-last-window", keys: ["Ctrl-a", "Tab"], description: "Last active window", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-swap-left", keys: ["Ctrl-a", "Ctrl-Shift-H"], description: "Swap window left", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-swap-right", keys: ["Ctrl-a", "Ctrl-Shift-L"], description: "Swap window right", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-kill-window", keys: ["Ctrl-a", "&"], description: "Kill window", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-rename-window", keys: ["Ctrl-a", ","], description: "Rename window", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-move-window", keys: ["Ctrl-a", "."], description: "Move window", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-list-windows", keys: ["Ctrl-a", "w"], description: "List windows", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-window-0", keys: ["Ctrl-a", "0"], description: "Select window 0", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-window-1", keys: ["Ctrl-a", "1"], description: "Select window 1", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-window-2", keys: ["Ctrl-a", "2"], description: "Select window 2", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-window-3", keys: ["Ctrl-a", "3"], description: "Select window 3", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-window-4", keys: ["Ctrl-a", "4"], description: "Select window 4", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-window-5", keys: ["Ctrl-a", "5"], description: "Select window 5", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-window-6", keys: ["Ctrl-a", "6"], description: "Select window 6", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-window-7", keys: ["Ctrl-a", "7"], description: "Select window 7", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-window-8", keys: ["Ctrl-a", "8"], description: "Select window 8", category: "tmux", subcategory: "Window Management" },
  { id: "tmux-window-9", keys: ["Ctrl-a", "9"], description: "Select window 9", category: "tmux", subcategory: "Window Management" },

  // ============================================
  // TMUX - PANE NAVIGATION
  // ============================================
  { id: "tmux-pane-left", keys: ["Ctrl-a", "h"], description: "Move to left pane", category: "tmux", subcategory: "Pane Navigation" },
  { id: "tmux-pane-down", keys: ["Ctrl-a", "j"], description: "Move to down pane", category: "tmux", subcategory: "Pane Navigation" },
  { id: "tmux-pane-up", keys: ["Ctrl-a", "k"], description: "Move to up pane", category: "tmux", subcategory: "Pane Navigation" },
  { id: "tmux-pane-right", keys: ["Ctrl-a", "l"], description: "Move to right pane", category: "tmux", subcategory: "Pane Navigation" },
  { id: "tmux-swap-next", keys: ["Ctrl-a", ">"], description: "Swap with next pane", category: "tmux", subcategory: "Pane Navigation" },
  { id: "tmux-swap-prev", keys: ["Ctrl-a", "<"], description: "Swap with previous pane", category: "tmux", subcategory: "Pane Navigation" },
  { id: "tmux-maximize", keys: ["Ctrl-a", "+"], description: "Maximize/restore pane", category: "tmux", subcategory: "Pane Navigation" },
  { id: "tmux-next-pane", keys: ["Ctrl-a", "o"], description: "Next pane", category: "tmux", subcategory: "Pane Navigation" },
  { id: "tmux-last-pane", keys: ["Ctrl-a", ";"], description: "Last pane", category: "tmux", subcategory: "Pane Navigation" },
  { id: "tmux-show-pane-nums", keys: ["Ctrl-a", "q"], description: "Show pane numbers", category: "tmux", subcategory: "Pane Navigation" },
  { id: "tmux-kill-pane", keys: ["Ctrl-a", "x"], description: "Kill pane", category: "tmux", subcategory: "Pane Navigation" },
  { id: "tmux-break-pane", keys: ["Ctrl-a", "!"], description: "Break pane to new window", category: "tmux", subcategory: "Pane Navigation" },
  { id: "tmux-zoom", keys: ["Ctrl-a", "z"], description: "Toggle pane zoom", category: "tmux", subcategory: "Pane Navigation" },

  // ============================================
  // TMUX - PANE RESIZING
  // ============================================
  { id: "tmux-resize-left", keys: ["Ctrl-a", "H"], description: "Resize pane left", category: "tmux", subcategory: "Pane Resizing" },
  { id: "tmux-resize-down", keys: ["Ctrl-a", "J"], description: "Resize pane down", category: "tmux", subcategory: "Pane Resizing" },
  { id: "tmux-resize-up", keys: ["Ctrl-a", "K"], description: "Resize pane up", category: "tmux", subcategory: "Pane Resizing" },
  { id: "tmux-resize-right", keys: ["Ctrl-a", "L"], description: "Resize pane right", category: "tmux", subcategory: "Pane Resizing" },

  // ============================================
  // TMUX - COPY MODE
  // ============================================
  { id: "tmux-copy-mode", keys: ["Ctrl-a", "Enter"], description: "Enter copy mode", category: "tmux", subcategory: "Copy Mode" },
  { id: "tmux-copy-mode-alt", keys: ["Ctrl-a", "["], description: "Enter copy mode (alt)", category: "tmux", subcategory: "Copy Mode" },
  { id: "tmux-copy-select", keys: ["v"], description: "Begin selection (in copy mode)", category: "tmux", subcategory: "Copy Mode" },
  { id: "tmux-copy-rect", keys: ["Ctrl-v"], description: "Rectangle toggle", category: "tmux", subcategory: "Copy Mode" },
  { id: "tmux-copy-yank", keys: ["y"], description: "Copy selection and exit", category: "tmux", subcategory: "Copy Mode" },
  { id: "tmux-copy-cancel", keys: ["Escape"], description: "Cancel selection", category: "tmux", subcategory: "Copy Mode" },
  { id: "tmux-copy-start-line", keys: ["H"], description: "Start of line (copy mode)", category: "tmux", subcategory: "Copy Mode" },
  { id: "tmux-copy-end-line", keys: ["L"], description: "End of line (copy mode)", category: "tmux", subcategory: "Copy Mode" },
  { id: "tmux-copy-quit", keys: ["q"], description: "Quit copy mode", category: "tmux", subcategory: "Copy Mode" },

  // ============================================
  // TMUX - PASTE & BUFFERS
  // ============================================
  { id: "tmux-list-buffers", keys: ["Ctrl-a", "b"], description: "List paste buffers", category: "tmux", subcategory: "Paste & Buffers" },
  { id: "tmux-paste", keys: ["Ctrl-a", "p"], description: "Paste from top buffer", category: "tmux", subcategory: "Paste & Buffers" },
  { id: "tmux-choose-buffer", keys: ["Ctrl-a", "P"], description: "Choose buffer to paste", category: "tmux", subcategory: "Paste & Buffers" },
  { id: "tmux-paste-alt", keys: ["Ctrl-a", "]"], description: "Paste buffer", category: "tmux", subcategory: "Paste & Buffers" },

  // ============================================
  // TMUX - CONFIGURATION & UTILITY
  // ============================================
  { id: "tmux-edit-config", keys: ["Ctrl-a", "e"], description: "Edit configuration", category: "tmux", subcategory: "Configuration" },
  { id: "tmux-reload", keys: ["Ctrl-a", "r"], description: "Reload configuration", category: "tmux", subcategory: "Configuration" },
  { id: "tmux-mouse", keys: ["Ctrl-a", "m"], description: "Toggle mouse mode", category: "tmux", subcategory: "Configuration" },
  { id: "tmux-clock", keys: ["Ctrl-a", "t"], description: "Show clock", category: "tmux", subcategory: "Configuration" },
  { id: "tmux-help", keys: ["Ctrl-a", "?"], description: "List key bindings", category: "tmux", subcategory: "Configuration" },
  { id: "tmux-command", keys: ["Ctrl-a", ":"], description: "Command prompt", category: "tmux", subcategory: "Configuration" },
  { id: "tmux-detach", keys: ["Ctrl-a", "d"], description: "Detach client", category: "tmux", subcategory: "Configuration" },
  { id: "tmux-detach-choose", keys: ["Ctrl-a", "D"], description: "Choose client to detach", category: "tmux", subcategory: "Configuration" },
  { id: "tmux-messages", keys: ["Ctrl-a", "~"], description: "Show messages", category: "tmux", subcategory: "Configuration" },
  { id: "tmux-find-window", keys: ["Ctrl-a", "f"], description: "Find window", category: "tmux", subcategory: "Configuration" },
  { id: "tmux-info", keys: ["Ctrl-a", "i"], description: "Display information", category: "tmux", subcategory: "Configuration" },

  // ============================================
  // TMUX - TPM (Plugin Manager)
  // ============================================
  { id: "tmux-tpm-install", keys: ["Ctrl-a", "I"], description: "Install plugins", category: "tmux", subcategory: "TPM Plugins" },
  { id: "tmux-tpm-update", keys: ["Ctrl-a", "u"], description: "Update plugins", category: "tmux", subcategory: "TPM Plugins" },
  { id: "tmux-tpm-uninstall", keys: ["Ctrl-a", "Alt-u"], description: "Uninstall plugins", category: "tmux", subcategory: "TPM Plugins" },

  // ============================================
  // NEOVIM - BASIC MOTIONS
  // ============================================
  { id: "vim-left", keys: ["h"], description: "Move left", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-down", keys: ["j"], description: "Move down", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-up", keys: ["k"], description: "Move up", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-right", keys: ["l"], description: "Move right", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-word-forward", keys: ["w"], description: "Word forward", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-word-back", keys: ["b"], description: "Word back", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-word-end", keys: ["e"], description: "End of word", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-line-start", keys: ["0"], description: "Start of line", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-line-first", keys: ["^"], description: "First non-blank character", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-line-end", keys: ["$"], description: "End of line", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-file-top", keys: ["g", "g"], description: "Top of file", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-file-bottom", keys: ["G"], description: "Bottom of file", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-para-back", keys: ["{"], description: "Previous paragraph", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-para-forward", keys: ["}"], description: "Next paragraph", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-sentence-back", keys: ["("], description: "Previous sentence", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-sentence-forward", keys: [")"], description: "Next sentence", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-half-down", keys: ["Ctrl-d"], description: "Half page down", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-half-up", keys: ["Ctrl-u"], description: "Half page up", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-page-down", keys: ["Ctrl-f"], description: "Full page down", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-page-up", keys: ["Ctrl-b"], description: "Full page up", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-center", keys: ["z", "z"], description: "Center screen on cursor", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-top", keys: ["z", "t"], description: "Cursor line to top", category: "neovim", subcategory: "Basic Motions" },
  { id: "vim-bottom", keys: ["z", "b"], description: "Cursor line to bottom", category: "neovim", subcategory: "Basic Motions" },

  // ============================================
  // NEOVIM - INSERT MODE ENTRY
  // ============================================
  { id: "vim-insert", keys: ["i"], description: "Insert before cursor", category: "neovim", subcategory: "Insert Mode" },
  { id: "vim-insert-start", keys: ["I"], description: "Insert at line start", category: "neovim", subcategory: "Insert Mode" },
  { id: "vim-append", keys: ["a"], description: "Append after cursor", category: "neovim", subcategory: "Insert Mode" },
  { id: "vim-append-end", keys: ["A"], description: "Append at line end", category: "neovim", subcategory: "Insert Mode" },
  { id: "vim-open-below", keys: ["o"], description: "Open line below", category: "neovim", subcategory: "Insert Mode" },
  { id: "vim-open-above", keys: ["O"], description: "Open line above", category: "neovim", subcategory: "Insert Mode" },
  { id: "vim-escape", keys: ["Escape"], description: "Exit to normal mode", category: "neovim", subcategory: "Insert Mode" },

  // ============================================
  // NEOVIM - VISUAL MODE
  // ============================================
  { id: "vim-visual", keys: ["v"], description: "Character-wise visual", category: "neovim", subcategory: "Visual Mode" },
  { id: "vim-visual-line", keys: ["V"], description: "Line-wise visual", category: "neovim", subcategory: "Visual Mode" },
  { id: "vim-visual-block", keys: ["Ctrl-v"], description: "Block-wise visual", category: "neovim", subcategory: "Visual Mode" },

  // ============================================
  // NEOVIM - OPERATORS
  // ============================================
  { id: "vim-delete-char", keys: ["x"], description: "Delete character under cursor", category: "neovim", subcategory: "Operators" },
  { id: "vim-delete-char-before", keys: ["X"], description: "Delete character before cursor", category: "neovim", subcategory: "Operators" },
  { id: "vim-delete", keys: ["d"], description: "Delete operator (+ motion)", category: "neovim", subcategory: "Operators" },
  { id: "vim-delete-line", keys: ["d", "d"], description: "Delete entire line", category: "neovim", subcategory: "Operators" },
  { id: "vim-delete-word", keys: ["d", "w"], description: "Delete word", category: "neovim", subcategory: "Operators" },
  { id: "vim-delete-to-end", keys: ["D"], description: "Delete to end of line", category: "neovim", subcategory: "Operators" },
  { id: "vim-yank", keys: ["y"], description: "Yank (copy) operator (+ motion)", category: "neovim", subcategory: "Operators" },
  { id: "vim-yank-line", keys: ["y", "y"], description: "Yank entire line", category: "neovim", subcategory: "Operators" },
  { id: "vim-yank-word", keys: ["y", "w"], description: "Yank word", category: "neovim", subcategory: "Operators" },
  { id: "vim-yank-to-end", keys: ["Y"], description: "Yank to end of line", category: "neovim", subcategory: "Operators" },
  { id: "vim-change", keys: ["c"], description: "Change operator (+ motion)", category: "neovim", subcategory: "Operators" },
  { id: "vim-change-line", keys: ["c", "c"], description: "Change entire line", category: "neovim", subcategory: "Operators" },
  { id: "vim-change-word", keys: ["c", "w"], description: "Change word", category: "neovim", subcategory: "Operators" },
  { id: "vim-change-to-end", keys: ["C"], description: "Change to end of line", category: "neovim", subcategory: "Operators" },
  { id: "vim-put-after", keys: ["p"], description: "Put (paste) after cursor", category: "neovim", subcategory: "Operators" },
  { id: "vim-put-before", keys: ["P"], description: "Put (paste) before cursor", category: "neovim", subcategory: "Operators" },
  { id: "vim-replace-char", keys: ["r"], description: "Replace single character", category: "neovim", subcategory: "Operators" },
  { id: "vim-replace-mode", keys: ["R"], description: "Enter replace mode", category: "neovim", subcategory: "Operators" },
  { id: "vim-substitute", keys: ["s"], description: "Substitute character", category: "neovim", subcategory: "Operators" },
  { id: "vim-substitute-line", keys: ["S"], description: "Substitute entire line", category: "neovim", subcategory: "Operators" },
  { id: "vim-join", keys: ["J"], description: "Join lines", category: "neovim", subcategory: "Operators" },
  { id: "vim-undo", keys: ["u"], description: "Undo", category: "neovim", subcategory: "Operators" },
  { id: "vim-redo", keys: ["Ctrl-r"], description: "Redo", category: "neovim", subcategory: "Operators" },
  { id: "vim-repeat", keys: ["."], description: "Repeat last change", category: "neovim", subcategory: "Operators" },
  { id: "vim-increment", keys: ["+"], description: "Increment number", category: "neovim", subcategory: "Operators" },
  { id: "vim-decrement", keys: ["-"], description: "Decrement number", category: "neovim", subcategory: "Operators" },

  // ============================================
  // NEOVIM - TEXT OBJECTS
  // ============================================
  { id: "vim-inner-word", keys: ["i", "w"], description: "Inner word", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-a-word", keys: ["a", "w"], description: "A word (with space)", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-inner-WORD", keys: ["i", "W"], description: "Inner WORD", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-a-WORD", keys: ["a", "W"], description: "A WORD (with space)", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-inner-sentence", keys: ["i", "s"], description: "Inner sentence", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-a-sentence", keys: ["a", "s"], description: "A sentence", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-inner-paragraph", keys: ["i", "p"], description: "Inner paragraph", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-a-paragraph", keys: ["a", "p"], description: "A paragraph", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-inner-paren", keys: ["i", "("], description: "Inner parentheses", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-a-paren", keys: ["a", "("], description: "A parentheses", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-inner-bracket", keys: ["i", "["], description: "Inner brackets", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-a-bracket", keys: ["a", "["], description: "A brackets", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-inner-brace", keys: ["i", "{"], description: "Inner braces", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-a-brace", keys: ["a", "{"], description: "A braces", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-inner-angle", keys: ["i", "<"], description: "Inner angle brackets", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-a-angle", keys: ["a", "<"], description: "A angle brackets", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-inner-quote", keys: ["i", '"'], description: 'Inner double quotes', category: "neovim", subcategory: "Text Objects" },
  { id: "vim-a-quote", keys: ["a", '"'], description: 'A double quotes', category: "neovim", subcategory: "Text Objects" },
  { id: "vim-inner-squote", keys: ["i", "'"], description: "Inner single quotes", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-a-squote", keys: ["a", "'"], description: "A single quotes", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-inner-backtick", keys: ["i", "`"], description: "Inner backticks", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-a-backtick", keys: ["a", "`"], description: "A backticks", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-inner-tag", keys: ["i", "t"], description: "Inner tag", category: "neovim", subcategory: "Text Objects" },
  { id: "vim-a-tag", keys: ["a", "t"], description: "A tag", category: "neovim", subcategory: "Text Objects" },

  // ============================================
  // NEOVIM - SEARCH
  // ============================================
  { id: "vim-search-forward", keys: ["/"], description: "Search forward", category: "neovim", subcategory: "Search" },
  { id: "vim-search-backward", keys: ["?"], description: "Search backward", category: "neovim", subcategory: "Search" },
  { id: "vim-search-next", keys: ["n"], description: "Next search result", category: "neovim", subcategory: "Search" },
  { id: "vim-search-prev", keys: ["N"], description: "Previous search result", category: "neovim", subcategory: "Search" },
  { id: "vim-search-word", keys: ["*"], description: "Search word under cursor forward", category: "neovim", subcategory: "Search" },
  { id: "vim-search-word-back", keys: ["#"], description: "Search word under cursor backward", category: "neovim", subcategory: "Search" },
  { id: "vim-find-char", keys: ["f"], description: "Find character forward", category: "neovim", subcategory: "Search" },
  { id: "vim-find-char-back", keys: ["F"], description: "Find character backward", category: "neovim", subcategory: "Search" },
  { id: "vim-till-char", keys: ["t"], description: "Till character forward", category: "neovim", subcategory: "Search" },
  { id: "vim-till-char-back", keys: ["T"], description: "Till character backward", category: "neovim", subcategory: "Search" },
  { id: "vim-repeat-find", keys: [";"], description: "Repeat f/F/t/T forward", category: "neovim", subcategory: "Search" },
  { id: "vim-repeat-find-back", keys: [","], description: "Repeat f/F/t/T backward", category: "neovim", subcategory: "Search" },

  // ============================================
  // NEOVIM - MARKS
  // ============================================
  { id: "vim-set-mark", keys: ["m"], description: "Set mark (+ letter)", category: "neovim", subcategory: "Marks" },
  { id: "vim-goto-mark-line", keys: ["'"], description: "Go to mark line (+ letter)", category: "neovim", subcategory: "Marks" },
  { id: "vim-goto-mark-exact", keys: ["`"], description: "Go to mark exact position (+ letter)", category: "neovim", subcategory: "Marks" },

  // ============================================
  // NEOVIM - MACROS
  // ============================================
  { id: "vim-record-macro", keys: ["q"], description: "Record macro (+ letter to start, q to stop)", category: "neovim", subcategory: "Macros" },
  { id: "vim-play-macro", keys: ["@"], description: "Play macro (+ letter)", category: "neovim", subcategory: "Macros" },
  { id: "vim-replay-macro", keys: ["@", "@"], description: "Replay last macro", category: "neovim", subcategory: "Macros" },

  // ============================================
  // NEOVIM - FOLDING
  // ============================================
  { id: "vim-fold-toggle", keys: ["z", "a"], description: "Toggle fold", category: "neovim", subcategory: "Folding" },
  { id: "vim-fold-close", keys: ["z", "c"], description: "Close fold", category: "neovim", subcategory: "Folding" },
  { id: "vim-fold-open", keys: ["z", "o"], description: "Open fold", category: "neovim", subcategory: "Folding" },
  { id: "vim-fold-close-all", keys: ["z", "M"], description: "Close all folds", category: "neovim", subcategory: "Folding" },
  { id: "vim-fold-open-all", keys: ["z", "R"], description: "Open all folds", category: "neovim", subcategory: "Folding" },

  // ============================================
  // NEOVIM - COMMAND MODE
  // ============================================
  { id: "vim-command", keys: [":"], description: "Enter command mode", category: "neovim", subcategory: "Command Mode" },
  { id: "vim-shell", keys: ["!"], description: "Shell command filter", category: "neovim", subcategory: "Command Mode" },

  // ============================================
  // NEOVIM - FILE NAVIGATION (SNACKS)
  // ============================================
  { id: "vim-find-files", keys: ["Space", "Space"], description: "Smart find files", category: "neovim", subcategory: "File Navigation" },
  { id: "vim-buffers", keys: ["Space", ","], description: "Switch buffers", category: "neovim", subcategory: "File Navigation" },
  { id: "vim-grep", keys: ["Space", "/"], description: "Grep search", category: "neovim", subcategory: "File Navigation" },
  { id: "vim-cmd-history", keys: ["Space", ":"], description: "Command history", category: "neovim", subcategory: "File Navigation" },
  { id: "vim-explorer", keys: ["Space", "e"], description: "File explorer", category: "neovim", subcategory: "File Navigation" },
  { id: "vim-find-files-ff", keys: ["Space", "f", "f"], description: "Find files", category: "neovim", subcategory: "File Navigation" },
  { id: "vim-find-git", keys: ["Space", "f", "g"], description: "Find git files", category: "neovim", subcategory: "File Navigation" },
  { id: "vim-projects", keys: ["Space", "f", "p"], description: "Projects", category: "neovim", subcategory: "File Navigation" },
  { id: "vim-recent", keys: ["Space", "f", "r"], description: "Recent files", category: "neovim", subcategory: "File Navigation" },
  { id: "vim-find-config", keys: ["Space", "f", "c"], description: "Find config files", category: "neovim", subcategory: "File Navigation" },
  { id: "vim-find-buffers", keys: ["Space", "f", "b"], description: "Find buffers", category: "neovim", subcategory: "File Navigation" },
  { id: "vim-file-tree", keys: ["F9"], description: "Toggle file tree", category: "neovim", subcategory: "File Navigation" },

  // ============================================
  // NEOVIM - GIT
  // ============================================
  { id: "vim-git-branches", keys: ["Space", "g", "b"], description: "Git branches", category: "neovim", subcategory: "Git" },
  { id: "vim-git-log", keys: ["Space", "g", "l"], description: "Git log", category: "neovim", subcategory: "Git" },
  { id: "vim-git-log-line", keys: ["Space", "g", "L"], description: "Git log line", category: "neovim", subcategory: "Git" },
  { id: "vim-git-status", keys: ["Space", "g", "s"], description: "Git status", category: "neovim", subcategory: "Git" },
  { id: "vim-git-stash", keys: ["Space", "g", "S"], description: "Git stash", category: "neovim", subcategory: "Git" },
  { id: "vim-git-diff", keys: ["Space", "g", "d"], description: "Git diff (hunks)", category: "neovim", subcategory: "Git" },
  { id: "vim-git-file-log", keys: ["Space", "g", "f"], description: "Git log file", category: "neovim", subcategory: "Git" },
  { id: "vim-git-browse", keys: ["Space", "g", "B"], description: "Git browse (open in browser)", category: "neovim", subcategory: "Git" },
  { id: "vim-lazygit", keys: ["Space", "g", "g"], description: "Lazygit", category: "neovim", subcategory: "Git" },
  { id: "vim-git-float", keys: ["F8"], description: "Git status float", category: "neovim", subcategory: "Git" },
  { id: "vim-diff-open", keys: ["Space", "d", "f"], description: "Diff view open", category: "neovim", subcategory: "Git" },
  { id: "vim-diff-close", keys: ["Space", "d", "c"], description: "Diff view close", category: "neovim", subcategory: "Git" },

  // ============================================
  // NEOVIM - SEARCH OPERATIONS (SNACKS)
  // ============================================
  { id: "vim-search-buffer-lines", keys: ["Space", "s", "b"], description: "Buffer lines", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-open-buffers", keys: ["Space", "s", "B"], description: "Grep open buffers", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-grep", keys: ["Space", "s", "g"], description: "Grep in project", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-word", keys: ["Space", "s", "w"], description: "Grep word/visual selection", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-registers", keys: ["Space", 's', '"'], description: "Registers", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-history", keys: ["Space", "s", "/"], description: "Search history", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-autocmds", keys: ["Space", "s", "a"], description: "Autocmds", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-cmd-history", keys: ["Space", "s", "c"], description: "Command history", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-commands", keys: ["Space", "s", "C"], description: "Commands", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-diagnostics", keys: ["Space", "s", "d"], description: "Diagnostics (all)", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-buffer-diag", keys: ["Space", "s", "D"], description: "Buffer diagnostics", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-help", keys: ["Space", "s", "h"], description: "Help pages", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-highlights", keys: ["Space", "s", "H"], description: "Highlights", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-icons", keys: ["Space", "s", "i"], description: "Icons", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-jumps", keys: ["Space", "s", "j"], description: "Jumps", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-keymaps", keys: ["Space", "s", "k"], description: "Keymaps", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-loclist", keys: ["Space", "s", "l"], description: "Location list", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-marks", keys: ["Space", "s", "m"], description: "Marks", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-man", keys: ["Space", "s", "M"], description: "Man pages", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-plugins", keys: ["Space", "s", "p"], description: "Plugin specs (lazy)", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-quickfix", keys: ["Space", "s", "q"], description: "Quickfix list", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-resume", keys: ["Space", "s", "R"], description: "Resume last search", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-undo", keys: ["Space", "s", "u"], description: "Undo history", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-search-notifications", keys: ["Space", "s", "n"], description: "Notification history", category: "neovim", subcategory: "Search Operations" },
  { id: "vim-colorschemes", keys: ["Space", "u", "C"], description: "Colorschemes picker", category: "neovim", subcategory: "Search Operations" },

  // ============================================
  // NEOVIM - LSP
  // ============================================
  { id: "vim-goto-def", keys: ["g", "d"], description: "Goto definition", category: "neovim", subcategory: "LSP" },
  { id: "vim-goto-decl", keys: ["g", "D"], description: "Goto declaration", category: "neovim", subcategory: "LSP" },
  { id: "vim-references", keys: ["g", "r"], description: "Find references", category: "neovim", subcategory: "LSP" },
  { id: "vim-implementation", keys: ["g", "I"], description: "Goto implementation", category: "neovim", subcategory: "LSP" },
  { id: "vim-type-def", keys: ["g", "y"], description: "Goto type definition", category: "neovim", subcategory: "LSP" },
  { id: "vim-hover", keys: ["K"], description: "Hover documentation", category: "neovim", subcategory: "LSP" },
  { id: "vim-signature", keys: ["Ctrl-m"], description: "Signature help", category: "neovim", subcategory: "LSP" },
  { id: "vim-lsp-symbols", keys: ["Space", "s", "s"], description: "LSP symbols", category: "neovim", subcategory: "LSP" },
  { id: "vim-lsp-workspace-symbols", keys: ["Space", "s", "S"], description: "LSP workspace symbols", category: "neovim", subcategory: "LSP" },
  { id: "vim-rename", keys: ["Space", "r", "e"], description: "Rename symbol", category: "neovim", subcategory: "LSP" },
  { id: "vim-format", keys: ["Space", "v", "v"], description: "Format code", category: "neovim", subcategory: "LSP" },
  { id: "vim-diagnostic-float", keys: ["Space", "e"], description: "Open diagnostic float", category: "neovim", subcategory: "LSP" },
  { id: "vim-prev-diag", keys: ["[", "d"], description: "Previous diagnostic", category: "neovim", subcategory: "LSP" },
  { id: "vim-next-diag", keys: ["]", "d"], description: "Next diagnostic", category: "neovim", subcategory: "LSP" },
  { id: "vim-diagnostic-loclist", keys: ["Space", "q"], description: "Diagnostic setloclist", category: "neovim", subcategory: "LSP" },
  { id: "vim-workspace-add", keys: ["Space", "w", "a"], description: "Add workspace folder", category: "neovim", subcategory: "LSP" },
  { id: "vim-workspace-remove", keys: ["Space", "w", "r"], description: "Remove workspace folder", category: "neovim", subcategory: "LSP" },
  { id: "vim-workspace-list", keys: ["Space", "w", "l"], description: "List workspace folders", category: "neovim", subcategory: "LSP" },
  { id: "vim-type-definition", keys: ["Space", "D"], description: "Type definition", category: "neovim", subcategory: "LSP" },
  { id: "vim-code-action", keys: ["Space", "c", "a"], description: "Code action", category: "neovim", subcategory: "LSP" },

  // ============================================
  // NEOVIM - WINDOW NAVIGATION
  // ============================================
  { id: "vim-win-left", keys: ["Ctrl-h"], description: "Jump left window", category: "neovim", subcategory: "Window Navigation" },
  { id: "vim-win-down", keys: ["Ctrl-j"], description: "Jump down window", category: "neovim", subcategory: "Window Navigation" },
  { id: "vim-win-up", keys: ["Ctrl-k"], description: "Jump up window", category: "neovim", subcategory: "Window Navigation" },
  { id: "vim-win-right", keys: ["Ctrl-l"], description: "Jump right window", category: "neovim", subcategory: "Window Navigation" },

  // ============================================
  // NEOVIM - WINDOW RESIZING
  // ============================================
  { id: "vim-resize-left", keys: ["Space", "r", "h"], description: "Resize left", category: "neovim", subcategory: "Window Resizing" },
  { id: "vim-resize-down", keys: ["Space", "r", "j"], description: "Resize down", category: "neovim", subcategory: "Window Resizing" },
  { id: "vim-resize-up", keys: ["Space", "r", "k"], description: "Resize up", category: "neovim", subcategory: "Window Resizing" },
  { id: "vim-resize-right", keys: ["Space", "r", "l"], description: "Resize right", category: "neovim", subcategory: "Window Resizing" },

  // ============================================
  // NEOVIM - TERMINAL
  // ============================================
  { id: "vim-term-float", keys: ["Space", "t", "f"], description: "Toggle float terminal", category: "neovim", subcategory: "Terminal" },
  { id: "vim-term-bottom", keys: ["Space", "t", "b"], description: "Toggle bottom terminal", category: "neovim", subcategory: "Terminal" },
  { id: "vim-term-toggle", keys: ["Ctrl-/"], description: "Toggle snacks terminal", category: "neovim", subcategory: "Terminal" },
  { id: "vim-term-toggle-alt", keys: ["Ctrl-_"], description: "Toggle snacks terminal (alt)", category: "neovim", subcategory: "Terminal" },

  // ============================================
  // NEOVIM - BUFFERS & TABS
  // ============================================
  { id: "vim-buf-pick", keys: ["Space", "t", "t"], description: "Pick tab (bufferline)", category: "neovim", subcategory: "Buffers" },
  { id: "vim-buf-delete", keys: ["Space", "b", "d"], description: "Delete buffer (snacks)", category: "neovim", subcategory: "Buffers" },

  // ============================================
  // NEOVIM - NEO-TREE
  // ============================================
  { id: "neotree-toggle-node", keys: ["Space"], description: "Toggle node", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-open", keys: ["Enter"], description: "Open file", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-open-alt", keys: ["o"], description: "Open file (alt)", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-preview", keys: ["P"], description: "Toggle preview (float)", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-focus-preview", keys: ["l"], description: "Focus preview", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-split", keys: ["S"], description: "Open split", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-vsplit", keys: ["s"], description: "Open vsplit", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-new-tab", keys: ["t"], description: "Open in new tab", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-window-picker", keys: ["w"], description: "Open with window picker", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-close-node", keys: ["C"], description: "Close node", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-close-all", keys: ["z"], description: "Close all nodes", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-add-file", keys: ["a"], description: "Add file", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-add-dir", keys: ["A"], description: "Add directory", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-delete", keys: ["d"], description: "Delete", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-rename", keys: ["r"], description: "Rename", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-copy-clipboard", keys: ["y"], description: "Copy to clipboard", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-cut-clipboard", keys: ["x"], description: "Cut to clipboard", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-paste-clipboard", keys: ["p"], description: "Paste from clipboard", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-copy", keys: ["c"], description: "Copy (asks destination)", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-move", keys: ["m"], description: "Move (asks destination)", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-close", keys: ["q"], description: "Close window", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-refresh", keys: ["R"], description: "Refresh", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-help", keys: ["?"], description: "Show help", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-prev-source", keys: ["<"], description: "Previous source", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-next-source", keys: [">"], description: "Next source", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-navigate-up", keys: ["Backspace"], description: "Navigate up", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-set-root", keys: ["."], description: "Set root", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-toggle-hidden", keys: ["H"], description: "Toggle hidden files", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-fuzzy", keys: ["/"], description: "Fuzzy finder", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-fuzzy-dir", keys: ["D"], description: "Fuzzy finder directory", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-sorter", keys: ["#"], description: "Fuzzy sorter", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-filter", keys: ["f"], description: "Filter on submit", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-clear-filter", keys: ["Ctrl-x"], description: "Clear filter", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-prev-git", keys: ["[", "g"], description: "Previous git modified", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-next-git", keys: ["]", "g"], description: "Next git modified", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-buf-delete", keys: ["b", "d"], description: "Buffer delete", category: "neovim", subcategory: "Neo-tree" },
  { id: "neotree-git-add-all", keys: ["A"], description: "Git add all", category: "neovim", subcategory: "Neo-tree Git" },
  { id: "neotree-git-unstage", keys: ["g", "u"], description: "Git unstage file", category: "neovim", subcategory: "Neo-tree Git" },
  { id: "neotree-git-add", keys: ["g", "a"], description: "Git add file", category: "neovim", subcategory: "Neo-tree Git" },
  { id: "neotree-git-revert", keys: ["g", "r"], description: "Git revert file", category: "neovim", subcategory: "Neo-tree Git" },
  { id: "neotree-git-commit", keys: ["g", "c"], description: "Git commit", category: "neovim", subcategory: "Neo-tree Git" },
  { id: "neotree-git-push", keys: ["g", "p"], description: "Git push", category: "neovim", subcategory: "Neo-tree Git" },
  { id: "neotree-git-commit-push", keys: ["g", "g"], description: "Git commit and push", category: "neovim", subcategory: "Neo-tree Git" },

  // ============================================
  // NEOVIM - OUTLINE
  // ============================================
  { id: "vim-outline", keys: ["F7"], description: "Toggle outline (aerial)", category: "neovim", subcategory: "Outline" },

  // ============================================
  // NEOVIM - AUTOCOMPLETE
  // ============================================
  { id: "vim-cmp-scroll-up", keys: ["Ctrl-b"], description: "Scroll docs up", category: "neovim", subcategory: "Autocomplete" },
  { id: "vim-cmp-scroll-down", keys: ["Ctrl-f"], description: "Scroll docs down", category: "neovim", subcategory: "Autocomplete" },
  { id: "vim-cmp-trigger", keys: ["Ctrl-Space"], description: "Trigger completion", category: "neovim", subcategory: "Autocomplete" },
  { id: "vim-cmp-abort", keys: ["Ctrl-e"], description: "Abort completion", category: "neovim", subcategory: "Autocomplete" },
  { id: "vim-cmp-confirm", keys: ["Enter"], description: "Confirm selection", category: "neovim", subcategory: "Autocomplete" },
  { id: "vim-cmp-next", keys: ["Tab"], description: "Next item in completion menu", category: "neovim", subcategory: "Autocomplete" },

  // ============================================
  // NEOVIM - TOGGLES
  // ============================================
  { id: "vim-toggle-spell", keys: ["Space", "u", "s"], description: "Toggle spelling", category: "neovim", subcategory: "Toggles" },
  { id: "vim-toggle-wrap", keys: ["Space", "u", "w"], description: "Toggle wrap", category: "neovim", subcategory: "Toggles" },
  { id: "vim-toggle-numbers", keys: ["Space", "u", "L"], description: "Toggle relative numbers", category: "neovim", subcategory: "Toggles" },
  { id: "vim-toggle-diag", keys: ["Space", "u", "d"], description: "Toggle diagnostics", category: "neovim", subcategory: "Toggles" },
  { id: "vim-toggle-line-numbers", keys: ["Space", "u", "l"], description: "Toggle line numbers", category: "neovim", subcategory: "Toggles" },
  { id: "vim-toggle-conceal", keys: ["Space", "u", "c"], description: "Toggle conceal level", category: "neovim", subcategory: "Toggles" },
  { id: "vim-toggle-treesitter", keys: ["Space", "u", "T"], description: "Toggle treesitter", category: "neovim", subcategory: "Toggles" },
  { id: "vim-toggle-background", keys: ["Space", "u", "b"], description: "Toggle background (dark/light)", category: "neovim", subcategory: "Toggles" },
  { id: "vim-toggle-inlay-hints", keys: ["Space", "u", "h"], description: "Toggle inlay hints", category: "neovim", subcategory: "Toggles" },
  { id: "vim-toggle-indent", keys: ["Space", "u", "g"], description: "Toggle indent guides", category: "neovim", subcategory: "Toggles" },
  { id: "vim-toggle-dim", keys: ["Space", "u", "D"], description: "Toggle dim", category: "neovim", subcategory: "Toggles" },

  // ============================================
  // NEOVIM - ZEN & UTILITY
  // ============================================
  { id: "vim-zen", keys: ["Space", "z"], description: "Toggle zen mode", category: "neovim", subcategory: "Utility" },
  { id: "vim-zoom", keys: ["Space", "Z"], description: "Toggle zoom", category: "neovim", subcategory: "Utility" },
  { id: "vim-scratch", keys: ["Space", "."], description: "Toggle scratch buffer", category: "neovim", subcategory: "Utility" },
  { id: "vim-scratch-select", keys: ["Space", "S"], description: "Select scratch buffer", category: "neovim", subcategory: "Utility" },
  { id: "vim-notifications", keys: ["Space", "n"], description: "Notification history", category: "neovim", subcategory: "Utility" },
  { id: "vim-dismiss-notifications", keys: ["Space", "u", "n"], description: "Dismiss all notifications", category: "neovim", subcategory: "Utility" },
  { id: "vim-rename-file", keys: ["Space", "c", "R"], description: "Rename file", category: "neovim", subcategory: "Utility" },
  { id: "vim-news", keys: ["Space", "N"], description: "Neovim news", category: "neovim", subcategory: "Utility" },
  { id: "vim-clear-highlight", keys: ["Escape"], description: "Cancel search highlight", category: "neovim", subcategory: "Utility" },

  // ============================================
  // NEOVIM - SESSION
  // ============================================
  { id: "vim-switch-session", keys: ["Space", "s", "s"], description: "Switch session", category: "neovim", subcategory: "Session" },

  // ============================================
  // NEOVIM - AI ASSISTANT (OPENCODE)
  // ============================================
  { id: "vim-ai-ask", keys: ["Space", "o", "a"], description: "Ask opencode with context", category: "neovim", subcategory: "AI Assistant" },
  { id: "vim-ai-execute", keys: ["Space", "o", "x"], description: "Execute opencode action menu", category: "neovim", subcategory: "AI Assistant" },
  { id: "vim-ai-toggle", keys: ["Space", "o", "t"], description: "Toggle opencode terminal", category: "neovim", subcategory: "AI Assistant" },
  { id: "vim-ai-add-motion", keys: ["g", "o"], description: "Add range to opencode (+ motion)", category: "neovim", subcategory: "AI Assistant" },
  { id: "vim-ai-add-para", keys: ["g", "o", "i", "p"], description: "Add paragraph to opencode", category: "neovim", subcategory: "AI Assistant" },
  { id: "vim-ai-add-block", keys: ["g", "o", "}"], description: "Add to end of block", category: "neovim", subcategory: "AI Assistant" },
  { id: "vim-ai-add-lines", keys: ["g", "o", "5", "j"], description: "Add next 5 lines", category: "neovim", subcategory: "AI Assistant" },
  { id: "vim-ai-add-line", keys: ["g", "o", "o"], description: "Add current line to opencode", category: "neovim", subcategory: "AI Assistant" },
  { id: "vim-ai-half-up", keys: ["Shift-Ctrl-u"], description: "Half page up (in opencode)", category: "neovim", subcategory: "AI Assistant" },
  { id: "vim-ai-half-down", keys: ["Shift-Ctrl-d"], description: "Half page down (in opencode)", category: "neovim", subcategory: "AI Assistant" },

  // ============================================
  // NEOVIM - WORD/REFERENCE NAVIGATION
  // ============================================
  { id: "vim-next-ref", keys: ["]", "]"], description: "Next reference (snacks.words)", category: "neovim", subcategory: "Word Navigation" },
  { id: "vim-prev-ref", keys: ["[", "["], description: "Previous reference (snacks.words)", category: "neovim", subcategory: "Word Navigation" },

  // ============================================
  // NEOVIM - ALPHA DASHBOARD
  // ============================================
  { id: "vim-alpha-new-file", keys: ["f"], description: "New file", category: "neovim", subcategory: "Dashboard" },
  { id: "vim-alpha-load-session", keys: ["s"], description: "Load last session", category: "neovim", subcategory: "Dashboard" },
  { id: "vim-alpha-current-dir", keys: ["c"], description: "Open current directory", category: "neovim", subcategory: "Dashboard" },
  { id: "vim-alpha-quit", keys: ["q"], description: "Quit", category: "neovim", subcategory: "Dashboard" },
];

export const getShortcutsByCategory = (category: "tmux" | "neovim") =>
  shortcuts.filter((s) => s.category === category);

export const getShortcutsBySubcategory = (subcategory: string) =>
  shortcuts.filter((s) => s.subcategory === subcategory);

export const searchShortcuts = (query: string) => {
  const lower = query.toLowerCase();
  return shortcuts.filter(
    (s) =>
      s.description.toLowerCase().includes(lower) ||
      s.keys.some((k) => k.toLowerCase().includes(lower)) ||
      s.subcategory?.toLowerCase().includes(lower)
  );
};

export const getSubcategories = (category: "tmux" | "neovim"): string[] => {
  const categoryShortcuts = getShortcutsByCategory(category);
  const subcats = new Set(categoryShortcuts.map((s) => s.subcategory).filter(Boolean));
  return Array.from(subcats) as string[];
};

export const getTotalShortcuts = () => shortcuts.length;
export const getTmuxShortcuts = () => shortcuts.filter((s) => s.category === "tmux").length;
export const getNeovimShortcuts = () => shortcuts.filter((s) => s.category === "neovim").length;
