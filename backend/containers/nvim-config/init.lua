-- Opinionated Neovim config for learning
-- No plugins required - pure Lua config

-- ============================================
-- Options
-- ============================================

vim.g.mapleader = " "
vim.g.maplocalleader = " "

local opt = vim.opt

-- Line numbers
opt.number = true
opt.relativenumber = true
opt.signcolumn = "yes"

-- Tabs & indentation
opt.tabstop = 2
opt.shiftwidth = 2
opt.expandtab = true
opt.smartindent = true
opt.autoindent = true

-- Search
opt.ignorecase = true
opt.smartcase = true
opt.hlsearch = true
opt.incsearch = true

-- Appearance
opt.termguicolors = true
opt.cursorline = true
opt.scrolloff = 8
opt.sidescrolloff = 8
opt.wrap = false
opt.showmode = false
opt.colorcolumn = "80"

-- Behavior
opt.mouse = "a"
opt.clipboard = "unnamedplus"
opt.splitright = true
opt.splitbelow = true
opt.undofile = true
opt.swapfile = false
opt.updatetime = 250
opt.timeoutlen = 300
opt.completeopt = "menuone,noselect"

-- ============================================
-- Tokyo Night colorscheme (inline)
-- ============================================

local colors = {
  bg = "#1a1b26",
  bg_dark = "#16161e",
  bg_highlight = "#292e42",
  blue = "#7aa2f7",
  cyan = "#7dcfff",
  fg = "#c0caf5",
  fg_dark = "#a9b1d6",
  fg_gutter = "#3b4261",
  green = "#9ece6a",
  magenta = "#bb9af7",
  orange = "#ff9e64",
  red = "#f7768e",
  yellow = "#e0af68",
  comment = "#565f89",
  visual = "#364a82",
}

-- Apply colors
vim.cmd("hi clear")
vim.cmd("hi Normal guibg=" .. colors.bg .. " guifg=" .. colors.fg)
vim.cmd("hi NormalFloat guibg=" .. colors.bg_dark .. " guifg=" .. colors.fg)
vim.cmd("hi Cursor guibg=" .. colors.fg .. " guifg=" .. colors.bg)
vim.cmd("hi CursorLine guibg=" .. colors.bg_highlight)
vim.cmd("hi CursorLineNr guifg=" .. colors.blue .. " gui=bold")
vim.cmd("hi LineNr guifg=" .. colors.fg_gutter)
vim.cmd("hi SignColumn guibg=" .. colors.bg)
vim.cmd("hi ColorColumn guibg=" .. colors.bg_highlight)
vim.cmd("hi Visual guibg=" .. colors.visual)
vim.cmd("hi Search guibg=" .. colors.blue .. " guifg=" .. colors.bg)
vim.cmd("hi IncSearch guibg=" .. colors.orange .. " guifg=" .. colors.bg)
vim.cmd("hi StatusLine guibg=" .. colors.bg_dark .. " guifg=" .. colors.fg_dark)
vim.cmd("hi StatusLineNC guibg=" .. colors.bg_dark .. " guifg=" .. colors.comment)
vim.cmd("hi VertSplit guifg=" .. colors.fg_gutter)
vim.cmd("hi Pmenu guibg=" .. colors.bg_dark .. " guifg=" .. colors.fg)
vim.cmd("hi PmenuSel guibg=" .. colors.visual .. " guifg=" .. colors.fg)
vim.cmd("hi Comment guifg=" .. colors.comment .. " gui=italic")
vim.cmd("hi String guifg=" .. colors.green)
vim.cmd("hi Number guifg=" .. colors.orange)
vim.cmd("hi Boolean guifg=" .. colors.orange)
vim.cmd("hi Constant guifg=" .. colors.orange)
vim.cmd("hi Identifier guifg=" .. colors.magenta)
vim.cmd("hi Function guifg=" .. colors.blue)
vim.cmd("hi Statement guifg=" .. colors.magenta)
vim.cmd("hi Keyword guifg=" .. colors.cyan)
vim.cmd("hi Type guifg=" .. colors.cyan)
vim.cmd("hi Special guifg=" .. colors.blue)
vim.cmd("hi Error guifg=" .. colors.red)
vim.cmd("hi WarningMsg guifg=" .. colors.yellow)
vim.cmd("hi Title guifg=" .. colors.blue .. " gui=bold")
vim.cmd("hi Directory guifg=" .. colors.blue)
vim.cmd("hi MatchParen guibg=" .. colors.visual .. " gui=bold")
vim.cmd("hi NonText guifg=" .. colors.fg_gutter)
vim.cmd("hi Folded guibg=" .. colors.bg_highlight .. " guifg=" .. colors.comment)

-- ============================================
-- Keymaps
-- ============================================

local map = vim.keymap.set

-- Better escape
map("i", "jk", "<Esc>", { desc = "Exit insert mode" })
map("i", "jj", "<Esc>", { desc = "Exit insert mode" })

-- Save
map("n", "<leader>w", "<cmd>w<cr>", { desc = "Save file" })
map("n", "<C-s>", "<cmd>w<cr>", { desc = "Save file" })

-- Quit
map("n", "<leader>q", "<cmd>q<cr>", { desc = "Quit" })
map("n", "<leader>Q", "<cmd>qa!<cr>", { desc = "Quit all" })

-- Clear search
map("n", "<Esc>", "<cmd>nohlsearch<cr>", { desc = "Clear search" })

-- Better window navigation
map("n", "<C-h>", "<C-w>h", { desc = "Go to left window" })
map("n", "<C-j>", "<C-w>j", { desc = "Go to lower window" })
map("n", "<C-k>", "<C-w>k", { desc = "Go to upper window" })
map("n", "<C-l>", "<C-w>l", { desc = "Go to right window" })

-- Resize windows
map("n", "<C-Up>", "<cmd>resize +2<cr>", { desc = "Increase height" })
map("n", "<C-Down>", "<cmd>resize -2<cr>", { desc = "Decrease height" })
map("n", "<C-Left>", "<cmd>vertical resize -2<cr>", { desc = "Decrease width" })
map("n", "<C-Right>", "<cmd>vertical resize +2<cr>", { desc = "Increase width" })

-- Move lines
map("v", "J", ":m '>+1<cr>gv=gv", { desc = "Move down" })
map("v", "K", ":m '<-2<cr>gv=gv", { desc = "Move up" })

-- Stay in visual mode when indenting
map("v", "<", "<gv", { desc = "Indent left" })
map("v", ">", ">gv", { desc = "Indent right" })

-- Better paste (don't replace clipboard)
map("v", "p", '"_dP', { desc = "Paste without yanking" })

-- Center cursor after jumps
map("n", "<C-d>", "<C-d>zz", { desc = "Scroll down" })
map("n", "<C-u>", "<C-u>zz", { desc = "Scroll up" })
map("n", "n", "nzzzv", { desc = "Next search result" })
map("n", "N", "Nzzzv", { desc = "Previous search result" })

-- Splits
map("n", "<leader>-", "<cmd>split<cr>", { desc = "Horizontal split" })
map("n", "<leader>|", "<cmd>vsplit<cr>", { desc = "Vertical split" })

-- Buffers
map("n", "<leader>bn", "<cmd>bnext<cr>", { desc = "Next buffer" })
map("n", "<leader>bp", "<cmd>bprevious<cr>", { desc = "Previous buffer" })
map("n", "<leader>bd", "<cmd>bdelete<cr>", { desc = "Delete buffer" })

-- File explorer (netrw)
map("n", "<leader>e", "<cmd>Explore<cr>", { desc = "File explorer" })

-- ============================================
-- Statusline
-- ============================================

local function mode_color()
  local modes = {
    n = colors.blue,
    i = colors.green,
    v = colors.magenta,
    V = colors.magenta,
    ["\22"] = colors.magenta,
    c = colors.orange,
    R = colors.red,
  }
  return modes[vim.fn.mode()] or colors.fg
end

function _G.statusline()
  local mode = vim.fn.mode():upper()
  local file = vim.fn.expand("%:t")
  if file == "" then file = "[No Name]" end
  local modified = vim.bo.modified and " [+]" or ""
  local readonly = vim.bo.readonly and " [RO]" or ""
  local filetype = vim.bo.filetype ~= "" and vim.bo.filetype or "text"
  local line = vim.fn.line(".")
  local col = vim.fn.col(".")
  local total = vim.fn.line("$")
  
  return string.format(
    " %s │ %s%s%s │ %s │ %d:%d / %d ",
    mode, file, modified, readonly, filetype, line, col, total
  )
end

vim.opt.statusline = "%!v:lua.statusline()"

-- ============================================
-- Autocommands
-- ============================================

local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

-- Highlight on yank
autocmd("TextYankPost", {
  group = augroup("highlight_yank", { clear = true }),
  callback = function()
    vim.highlight.on_yank({ higroup = "Visual", timeout = 200 })
  end,
})

-- Remove trailing whitespace on save
autocmd("BufWritePre", {
  group = augroup("trim_whitespace", { clear = true }),
  pattern = "*",
  command = [[%s/\s\+$//e]],
})

-- Return to last edit position
autocmd("BufReadPost", {
  group = augroup("last_position", { clear = true }),
  callback = function()
    local mark = vim.api.nvim_buf_get_mark(0, '"')
    local lcount = vim.api.nvim_buf_line_count(0)
    if mark[1] > 0 and mark[1] <= lcount then
      pcall(vim.api.nvim_win_set_cursor, 0, mark)
    end
  end,
})

-- ============================================
-- Welcome message
-- ============================================

vim.api.nvim_create_autocmd("VimEnter", {
  callback = function()
    vim.notify("Welcome! Space = leader. Try :Tutor for vim tutorial.", vim.log.levels.INFO)
  end,
})
