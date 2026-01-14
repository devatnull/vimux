# Vimux

An interactive learning platform for mastering tmux and Neovim. Practice with real terminals in your browser.

Website: [vimux.dev](https://vimux.dev)

## Features

- Real neovim and tmux running in isolated containers
- Interactive lessons from beginner to advanced
- Keyboard shortcut reference with search
- Progress tracking across sessions
- No installation required

## Quick Start

```bash
git clone https://github.com/devatnull/vimux.git
cd vimux
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
vimux.dev (Vercel)         api.vimux.dev (Hetzner)
    Frontend        --->       Backend
    Next.js                    Node.js + Docker
    Lessons UI                 Real terminals
```

The frontend runs on Vercel. The backend runs isolated Docker containers with neovim and tmux, connected via WebSocket.

## Tech Stack

**Frontend**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (state management)
- xterm.js (terminal emulator)

**Backend**
- Node.js
- Docker (Alpine containers)
- WebSocket

## Project Structure

```
src/
  app/           Next.js pages
  components/    React components
  lib/           Utilities, types, lessons

backend/
  src/           WebSocket server
  containers/    Docker config, practice files
  deploy/        Server setup scripts
```

## Development

```bash
# Frontend
npm run dev

# Backend (requires Docker)
cd backend
npm install
npm run dev
```

## Deployment

See [DEPLOY.md](./DEPLOY.md) for full server setup instructions.

**Frontend**: Deploy to Vercel, set `NEXT_PUBLIC_WS_URL=wss://api.vimux.dev/ws`

**Backend**: See deployment guide for Hetzner/Ubuntu setup.

## Contributing

Contributions welcome. Please read the guidelines below.

### Adding Lessons

Edit `src/lib/lessons.ts`. Each lesson needs:
- Unique ID
- Title and description
- Category: tmux, neovim, or workflow
- Difficulty: beginner, intermediate, or advanced
- Steps with expected keys and validation

### Adding Shortcuts

Edit `src/lib/shortcuts.ts`. Each shortcut needs:
- ID, keys array, description
- Category and optional subcategory

### Code Style

- TypeScript strict mode
- Functional components with hooks
- No unnecessary comments in code
- Run `npm run lint` before committing

## License

MIT

## Links

- [Website](https://vimux.dev)
- [GitHub](https://github.com/devatnull/vimux)
- [Issues](https://github.com/devatnull/vimux/issues)
