<div align="center">

# 💣 Boomerboy

**Retro pixel-art arena game for 2–4 players on a shared keyboard.**

Pure HTML5 Canvas + JavaScript — one file, zero dependencies, just open and play.

![Boomerboy Gameplay](screenshot/gameplay.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-165%20passing-brightgreen.svg)](#tests)
[![Built with Kiro](https://img.shields.io/badge/Built%20with-Kiro-blue.svg)](https://kiro.dev)

[🇩🇪 Deutsche Version](README.de.md)

</div>

---

## Table of Contents

- [Play](#play)
- [Features](#features)
- [Controls](#controls)
- [How to Play](#how-to-play)
- [Development](#development)
- [Tests](#tests)
- [Tech Stack](#tech-stack)
- [Built with Kiro](#built-with-kiro)
- [License](#license)

## Play

```
Open index.html in any modern browser. That's it.
```

No server, no build step, no installation required.

## Features

- 🎮 **2–4 players** on a single keyboard (local multiplayer)
- 💣 **Bombs, chain explosions** and destructible walls
- ⚡ **Power-ups** (extra bombs, bigger range, speed boost)
- 🎨 **Pixel-art retro graphics** with HTML5 Canvas
- 📦 **Zero dependencies** — a single HTML file
- 🔄 **Randomly generated maps** for every round

## Controls

| Player | Move | Bomb |
|--------|------|------|
| 🔴 Player 1 | `W` `A` `S` `D` | `Space` |
| 🟡 Player 2 | `↑` `←` `↓` `→` | `Enter` |
| 🟢 Player 3 | `I` `J` `K` `L` | `U` |
| 🔵 Player 4 | `Num8` `Num4` `Num5` `Num6` | `Num0` |

> 💡 Player 4 requires NumLock to be enabled.

## How to Play

1. Select player count on the start screen (2, 3, or 4)
2. Place bombs to destroy walls and eliminate opponents
3. Collect power-ups hidden under destructible walls:
   - **B** (purple) — Extra bomb capacity
   - **E** (orange) — Bigger explosion range
   - **S** (cyan) — Speed boost
4. Last player standing wins the round
5. If all remaining players are eliminated simultaneously → draw

## Development

Game logic lives in `src/game.js` (importable ES module for testing) and is duplicated inline in `index.html` for zero-dependency browser play.

```bash
npm install        # Install dev dependencies
npm test           # Run all tests
npm run test:watch # Watch mode
```

### Project Structure

```
├── index.html          # Complete game (playable without build)
├── src/
│   └── game.js         # Game logic as ES module (for tests)
├── tests/
│   ├── board.test.js   # Board generation tests
│   ├── bomb.test.js    # Bomb & explosion tests
│   ├── player.test.js  # Player movement tests
│   ├── powerup.test.js # Power-up tests
│   ├── input.test.js   # Input handling tests
│   ├── gamestate.test.js # Game state tests
│   └── generators.js   # Shared fast-check generators
├── screenshot/
│   └── gameplay.png
├── package.json
└── vitest.config.js
```

## Tests

165 tests including 18 property-based tests validating universal correctness properties.

```bash
npm test
```

```
 ✓ tests/board.test.js (20)
 ✓ tests/bomb.test.js (28)
 ✓ tests/gamestate.test.js (22)
 ✓ tests/input.test.js (40)
 ✓ tests/player.test.js (31)
 ✓ tests/powerup.test.js (15)
 ✓ tests/setup.test.js (9)

 Test Files  7 passed (7)
      Tests  165 passed (165)
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Rendering | HTML5 Canvas (pixel-art, `imageSmoothingEnabled: false`) |
| Game logic | Vanilla JavaScript (ES Modules) |
| Game loop | `requestAnimationFrame` with delta-time |
| Tests | [Vitest](https://vitest.dev) + [fast-check](https://github.com/dubzzz/fast-check) |
| Architecture | Single-file (inline) + modular test version |

## Built with Kiro

This game was built entirely with [Kiro](https://kiro.dev) — an AI-powered development environment that supports spec-driven development. The entire process from requirements through design to implementation and property-based tests was done with Kiro.

## License

[MIT](LICENSE)
