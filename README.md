# 💣 Boomerboy

A retro pixel-art multiplayer arena game for 2–4 players on a shared keyboard. Built entirely in a single HTML file — no dependencies, no build step, just open and play.

## 🎮 Play

Open `index.html` in any modern browser. That's it.

## 🕹️ Controls

| Player | Move | Bomb |
|--------|------|------|
| Player 1 (Red) | W A S D | Space |
| Player 2 (Yellow) | Arrow Keys | Enter |
| Player 3 (Green) | I J K L | U |
| Player 4 (Blue) | Numpad 8 4 5 6 | Numpad 0 |

> 💡 Player 4 requires NumLock to be enabled.

## 📖 How to Play

- Place bombs to destroy walls and eliminate opponents
- Collect power-ups hidden under destructible walls:
  - **B** (purple) — Extra bomb capacity
  - **E** (orange) — Bigger explosion range
  - **S** (cyan) — Speed boost
- Last player standing wins the round
- If all remaining players are eliminated simultaneously, it's a draw

## 🛠️ Development

The game logic lives in `src/game.js` (importable ES module for testing) and is duplicated inline in `index.html` for zero-dependency browser play.

```bash
npm install        # Install dev dependencies (vitest, fast-check)
npm test           # Run all 165 tests
```

### Tech Stack

- Pure HTML5 Canvas — no frameworks, no libraries
- Property-based testing with [fast-check](https://github.com/dubzzz/fast-check)
- Test runner: [Vitest](https://vitest.dev)

## 📄 License

MIT
