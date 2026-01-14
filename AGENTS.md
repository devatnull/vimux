# Project: Learn tmux & Neovim

## Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm start` - Start production server

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Zustand for state management

## Structure

- `src/app/` - Next.js App Router pages
- `src/components/` - React components
- `src/lib/` - Utilities, types, data (lessons, shortcuts, store)

## Key Files

- `src/lib/lessons.ts` - All lesson definitions
- `src/lib/shortcuts.ts` - All shortcut definitions
- `src/lib/store.ts` - Zustand store (simulator state, user progress)
- `src/lib/types.ts` - TypeScript types

## Adding Lessons

Edit `src/lib/lessons.ts`. Each lesson needs:
- `id`: Unique string ID
- `title`, `description`
- `category`: "tmux" | "neovim" | "workflow"
- `difficulty`: "beginner" | "intermediate" | "advanced"
- `steps`: Array of lesson steps with `expectedKeys`

## Adding Shortcuts

Edit `src/lib/shortcuts.ts`. Each shortcut needs:
- `id`, `keys[]`, `description`, `category`, `subcategory`
