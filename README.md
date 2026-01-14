# Learn tmux & Neovim

An interactive, browser-based learning platform for mastering tmux and Neovim. Free, no signup required.

![Screenshot](docs/screenshot.png)

## Features

- 🎮 **Interactive Simulator** - Practice tmux and Neovim commands in a safe, browser-based environment
- 📚 **Structured Lessons** - Learn progressively from basics to advanced workflows
- ⌨️ **Complete Reference** - Quick access to all 100+ shortcuts with searchable cheat sheets
- 💾 **Progress Tracking** - Your progress is saved locally, no account needed
- 🌐 **Cross-Platform** - Works on Windows, macOS, and Linux (keyboard shortcuts adapt automatically)

## Live Demo

Visit: [https://learn-tmux-and-nvim.vercel.app](https://learn-tmux-and-nvim.vercel.app)

## Topics Covered

### tmux
- Prefix key (Ctrl+a / Ctrl+b)
- Session, window, and pane management
- Splitting and navigating panes
- Copy mode and scrolling
- Configuration basics

### Neovim
- Modal editing (Normal, Insert, Visual, Command modes)
- Cursor movement and motions
- Text editing operations
- Leader key shortcuts (Space)
- LSP navigation (go to definition, references, hover)
- File navigation and fuzzy finding
- Git integration
- AI assistants (Opencode)

### Workflows
- tmux + Neovim combined workflows
- Development environment setup
- Git workflow integration
- Searching your codebase

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [Lucide React](https://lucide.dev/) - Icons

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Deploying to Vercel

This project is designed to be deployed on Vercel with zero configuration:

1. Fork this repository
2. Import it in [Vercel](https://vercel.com/new)
3. Deploy!

## Based On

The shortcuts and workflows in this tutorial are based on:
- [gpakosz/.tmux](https://github.com/gpakosz/.tmux) - tmux configuration
- [LazyVim](https://www.lazyvim.org/) style Neovim setup
- Custom keybindings for productivity

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Adding New Lessons

Lessons are defined in `src/lib/lessons.ts`. Each lesson has:
- Unique ID
- Title and description
- Category (tmux, neovim, workflow)
- Difficulty level
- Steps with expected key inputs
- Prerequisites (optional)

### Adding New Shortcuts

Shortcuts are defined in `src/lib/shortcuts.ts` with:
- Keys sequence
- Description
- Category and subcategory

## License

MIT License - feel free to use this project for learning and teaching!

---

Built with ❤️ for developers who want to work faster.
