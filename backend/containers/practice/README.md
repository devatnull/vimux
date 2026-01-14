# Practice Project

This is a sample project for practicing your vim and tmux skills.

## Getting Started

1. Open files with `nvim filename`
2. Split your terminal with `Ctrl-b "` or `Ctrl-b %`
3. Navigate between panes with `Ctrl-b h/j/k/l`

## Project Structure

```
practice/
├── welcome.txt     # Start here!
├── sample.js       # JavaScript practice
├── sample.py       # Python practice
├── config.json     # JSON editing practice
└── README.md       # This file
```

## Exercises

### Beginner
- [ ] Open `welcome.txt` and read the instructions
- [ ] Navigate using `h j k l` instead of arrow keys
- [ ] Delete a line with `dd`, then undo with `u`
- [ ] Copy a line with `yy`, paste with `p`

### Intermediate
- [ ] Use `ciw` to change a word
- [ ] Use `/` to search for text
- [ ] Use `:%s/old/new/g` to replace text
- [ ] Split window with `:sp` or `:vsp`

### Advanced
- [ ] Use visual block mode (`Ctrl-v`) to edit multiple lines
- [ ] Record a macro with `qa`, replay with `@a`
- [ ] Use text objects like `ci"` or `da(`
- [ ] Master the tmux copy mode (`Ctrl-b [`)

## Tips

- Press `Escape` to return to normal mode
- Use `:w` to save, `:q` to quit, `:wq` for both
- In tmux, `Ctrl-b d` detaches (exits) the session
- Remember: **practice makes perfect!**
