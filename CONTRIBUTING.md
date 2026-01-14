# Contributing to Vimux

Thanks for your interest in contributing. This guide covers how to get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/vimux.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature`
5. Make your changes
6. Run linting: `npm run lint`
7. Run build: `npm run build`
8. Commit and push
9. Open a pull request

## Development Setup

### Frontend

```bash
npm install
npm run dev
```

### Backend (optional, for terminal features)

```bash
cd backend
npm install
docker build -t terminal-sandbox -f Dockerfile.sandbox .
npm run dev
```

## What to Contribute

### High Priority

- New lessons for tmux and neovim
- Bug fixes
- Documentation improvements
- Accessibility improvements

### Lesson Ideas

- Vim macros
- Tmux session management
- Advanced text objects
- Neovim LSP basics
- Workflow tutorials (git + vim + tmux)

### Good First Issues

Look for issues labeled `good first issue` on GitHub.

## Code Guidelines

### TypeScript

- Use strict mode
- Prefer `const` over `let`
- Use explicit types for function parameters
- Avoid `any` type

### React

- Functional components only
- Use hooks for state and effects
- Keep components focused and small
- Co-locate related code

### Commits

- Use clear, descriptive commit messages
- One logical change per commit
- Reference issue numbers when applicable

### Pull Requests

- Keep PRs focused on a single change
- Include a clear description
- Update documentation if needed
- Ensure all checks pass

## Adding Lessons

Lessons are defined in `src/lib/lessons.ts`.

```typescript
{
  id: "unique-lesson-id",
  title: "Lesson Title",
  description: "What the user will learn",
  category: "tmux" | "neovim" | "workflow",
  difficulty: "beginner" | "intermediate" | "advanced",
  estimatedMinutes: 5,
  steps: [
    {
      id: "step-1",
      instruction: "Press j to move down",
      expectedKeys: ["j"],
      hint: "j moves the cursor down one line",
      successMessage: "You moved down",
      validation: {
        cursorLine: 1
      }
    }
  ]
}
```

### Step Validation

Available validation options:

- `cursorLine` / `cursorCol`: Check cursor position
- `mode`: Check vim mode (normal, insert, visual, command)
- `bufferContains`: Check if buffer contains text
- `paneCount`: Check number of tmux panes
- `windowCount`: Check number of tmux windows
- `custom`: Function for complex validation

## Adding Shortcuts

Shortcuts are defined in `src/lib/shortcuts.ts`.

```typescript
{
  id: "unique-shortcut-id",
  keys: ["Ctrl", "b", "\""],
  description: "Split pane horizontally",
  category: "tmux",
  subcategory: "panes"
}
```

## Testing

```bash
npm run lint    # Check for linting errors
npm run build   # Ensure production build works
```

## Questions

Open an issue on GitHub for questions or discussion.
