// ============================================================
// Gemeinsame fast-check Generatoren für Boomerboy Tests
// ============================================================

import fc from 'fast-check';
import { CellType, Direction, PowerUpType, Color, CONFIG } from '../src/game.js';

const COLORS = [Color.RED, Color.YELLOW, Color.GREEN, Color.BLUE];

/**
 * Generiert eine gültige Spieleranzahl (2, 3 oder 4).
 */
export function arbitraryPlayerCount() {
  return fc.constantFrom(2, 3, 4);
}

/**
 * Generiert eine zufällige Richtung.
 */
export function arbitraryDirection() {
  return fc.constantFrom(Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT);
}

/**
 * Generiert einen zufälligen Power-Up-Typ.
 */
export function arbitraryPowerUpType() {
  return fc.constantFrom(PowerUpType.EXTRA_BOMB, PowerUpType.BIGGER_EXPLOSION, PowerUpType.SPEED);
}

/**
 * Generiert eine gültige Position innerhalb der Spielfeldgrenzen (innerhalb der Wände).
 * x: 1 bis width-2, y: 1 bis height-2
 */
export function arbitraryPosition(width = CONFIG.BOARD_WIDTH, height = CONFIG.BOARD_HEIGHT) {
  return fc.record({
    x: fc.integer({ min: 1, max: width - 2 }),
    y: fc.integer({ min: 1, max: height - 2 }),
  });
}

/**
 * Generiert einen Spieler mit zufälligen Attributen.
 * @param {number} index — Spieler-Index (0-3)
 */
export function arbitraryPlayer(index = 0) {
  return fc.record({
    maxBombs: fc.integer({ min: 1, max: 5 }),
    explosionRange: fc.integer({ min: 1, max: 6 }),
    speed: fc.double({ min: 1.0, max: 3.0, noNaN: true }),
    alive: fc.boolean(),
    activeBombs: fc.integer({ min: 0, max: 5 }),
  }).map(attrs => ({
    index,
    name: `Spieler ${index + 1}`,
    color: COLORS[index] || Color.RED,
    position: { ...CONFIG.ALL_START_POSITIONS[index] || { x: 1, y: 1 } },
    moveCooldown: 0,
    ...attrs,
    // Ensure activeBombs <= maxBombs
    activeBombs: Math.min(attrs.activeBombs, attrs.maxBombs),
  }));
}

/**
 * Generiert eine Bombe an einer gültigen Position.
 */
export function arbitraryBomb(width = CONFIG.BOARD_WIDTH, height = CONFIG.BOARD_HEIGHT) {
  return fc.record({
    position: arbitraryPosition(width, height),
    ownerIndex: fc.integer({ min: 0, max: 3 }),
    timer: fc.integer({ min: 0, max: CONFIG.BOMB_TIMER }),
    range: fc.integer({ min: 1, max: 6 }),
  });
}

/**
 * Generiert ein gültiges Spielfeld (Platzhalter — erzeugt ein einfaches valides Board).
 * Wird durch BoardManager.generate ersetzt, sobald dieser implementiert ist.
 */
export function arbitraryBoard(playerCount) {
  const pcArb = playerCount !== undefined
    ? fc.constant(playerCount)
    : arbitraryPlayerCount();

  return pcArb.map(pc => {
    const w = CONFIG.BOARD_WIDTH;
    const h = CONFIG.BOARD_HEIGHT;
    const grid = [];

    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        // Rand
        if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
          row.push(CellType.WALL_INDESTRUCTIBLE);
        }
        // Gittermuster (gerade x UND gerade y innerhalb des Randes)
        else if (x % 2 === 0 && y % 2 === 0) {
          row.push(CellType.WALL_INDESTRUCTIBLE);
        }
        else {
          row.push(CellType.FLOOR);
        }
      }
      grid.push(row);
    }

    // Safe Zones freihalten
    const safeZones = CONFIG.getSafeZones(pc);
    for (const zone of safeZones) {
      for (const pos of zone) {
        grid[pos.y][pos.x] = CellType.FLOOR;
      }
    }

    return { grid, width: w, height: h, playerCount: pc };
  });
}

/**
 * Generiert PlayerInput[] für N Spieler.
 * Jeder Spieler hat optional eine Richtung und einen Bomben-Flag.
 */
export function arbitraryPlayerInputs(playerCount) {
  const pcArb = playerCount !== undefined
    ? fc.constant(playerCount)
    : arbitraryPlayerCount();

  return pcArb.chain(pc => {
    const inputArb = fc.record({
      direction: fc.option(arbitraryDirection(), { nil: null }),
      placeBomb: fc.boolean(),
    });
    return fc.array(inputArb, { minLength: pc, maxLength: pc });
  });
}
