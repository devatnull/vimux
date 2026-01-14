-- Minimal Neovim config for learning
-- Keep it simple so learners can understand what's happening

-- Basic settings
vim.opt.number = true           -- Line numbers
vim.opt.relativenumber = true   -- Relative line numbers
vim.opt.mouse = 'a'             -- Enable mouse
vim.opt.clipboard = 'unnamedplus' -- System clipboard
vim.opt.expandtab = true        -- Spaces instead of tabs
vim.opt.tabstop = 2             -- 2 spaces per tab
vim.opt.shiftwidth = 2          -- 2 spaces for indent
vim.opt.smartindent = true      -- Smart indentation
vim.opt.wrap = false            -- No line wrapping
vim.opt.cursorline = true       -- Highlight current line
vim.opt.termguicolors = true    -- True colors
vim.opt.signcolumn = 'yes'      -- Always show sign column
vim.opt.scrolloff = 8           -- Keep 8 lines visible
vim.opt.updatetime = 250        -- Faster updates
vim.opt.timeoutlen = 500        -- Faster key sequences
vim.opt.ignorecase = true       -- Case insensitive search
vim.opt.smartcase = true        -- Unless uppercase used
vim.opt.hlsearch = true         -- Highlight search
vim.opt.incsearch = true        -- Incremental search

-- Better colors (simple dark theme)
vim.cmd [[
  colorscheme default
  highlight Normal guibg=#1a1b26 guifg=#a9b1d6
  highlight LineNr guifg=#565f89
  highlight CursorLine guibg=#24283b
  highlight CursorLineNr guifg=#7aa2f7
  highlight Visual guibg=#364a82
  highlight StatusLine guibg=#1a1b26 guifg=#a9b1d6
  highlight Search guibg=#7aa2f7 guifg=#1a1b26
  highlight IncSearch guibg=#f7768e guifg=#1a1b26
]]

-- Leader key
vim.g.mapleader = ' '

-- Basic keymaps for learning
vim.keymap.set('n', '<leader>w', ':w<CR>', { desc = 'Save file' })
vim.keymap.set('n', '<leader>q', ':q<CR>', { desc = 'Quit' })
vim.keymap.set('n', '<Esc>', ':noh<CR>', { desc = 'Clear search highlight' })

-- Better window navigation
vim.keymap.set('n', '<C-h>', '<C-w>h', { desc = 'Move to left window' })
vim.keymap.set('n', '<C-j>', '<C-w>j', { desc = 'Move to lower window' })
vim.keymap.set('n', '<C-k>', '<C-w>k', { desc = 'Move to upper window' })
vim.keymap.set('n', '<C-l>', '<C-w>l', { desc = 'Move to right window' })

-- Stay in visual mode when indenting
vim.keymap.set('v', '<', '<gv', { desc = 'Indent left' })
vim.keymap.set('v', '>', '>gv', { desc = 'Indent right' })

-- Move lines up/down in visual mode
vim.keymap.set('v', 'J', ":m '>+1<CR>gv=gv", { desc = 'Move selection down' })
vim.keymap.set('v', 'K', ":m '<-2<CR>gv=gv", { desc = 'Move selection up' })

-- Show which-key style help (built-in)
vim.keymap.set('n', '<leader>?', function()
  print("Leader commands: <leader>w = save, <leader>q = quit")
end, { desc = 'Show help' })

-- Welcome message
vim.api.nvim_create_autocmd('VimEnter', {
  callback = function()
    print("Welcome! Press <Space>? for help. Try :Tutor for built-in tutorial!")
  end
})
