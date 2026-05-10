// ============================================================
// Unit-Tests und Property-Based Tests für BoardManager
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { CellType, CONFIG, BoardManager } from '../src/game.js';
import { arbitraryPlayerCount } from './generators.js';

describe('BoardManager', () => {
  beforeEach(() => {
    BoardManager.generate(4);
  });

  describe('generate()', () => {
    it('erzeugt ein Grid mit korrekten Dimensionen', () => {
      const grid = BoardManager.generate(4);
      expect(grid.length).toBe(CONFIG.BOARD_HEIGHT);
      expect(grid[0].length).toBe(CONFIG.BOARD_WIDTH);
    });

    it('setzt den äußeren Rand als unzerstörbare Wände', () => {
      const grid = BoardManager.generate(4);
      for (let x = 0; x < CONFIG.BOARD_WIDTH; x++) {
        expect(grid[0][x]).toBe(CellType.WALL_INDESTRUCTIBLE);
        expect(grid[CONFIG.BOARD_HEIGHT - 1][x]).toBe(CellType.WALL_INDESTRUCTIBLE);
      }
      for (let y = 0; y < CONFIG.BOARD_HEIGHT; y++) {
        expect(grid[y][0]).toBe(CellType.WALL_INDESTRUCTIBLE);
        expect(grid[y][CONFIG.BOARD_WIDTH - 1]).toBe(CellType.WALL_INDESTRUCTIBLE);
      }
    });

    it('setzt das innere Gittermuster korrekt', () => {
      const grid = BoardManager.generate(4);
      for (let y = 2; y < CONFIG.BOARD_HEIGHT - 1; y += 2) {
        for (let x = 2; x < CONFIG.BOARD_WIDTH - 1; x += 2) {
          expect(grid[y][x]).toBe(CellType.WALL_INDESTRUCTIBLE);
        }
      }
    });

    it('hält Safe Zones für 4 Spieler frei', () => {
      const grid = BoardManager.generate(4);
      const safeZones = CONFIG.getSafeZones(4);
      for (const zone of safeZones) {
        for (const pos of zone) {
          expect(grid[pos.y][pos.x]).toBe(CellType.FLOOR);
        }
      }
    });

    it('hält Safe Zones für 2 Spieler frei', () => {
      const grid = BoardManager.generate(2);
      const safeZones = CONFIG.getSafeZones(2);
      for (const zone of safeZones) {
        for (const pos of zone) {
          expect(grid[pos.y][pos.x]).toBe(CellType.FLOOR);
        }
      }
    });

    it('hält Safe Zones für 3 Spieler frei', () => {
      const grid = BoardManager.generate(3);
      const safeZones = CONFIG.getSafeZones(3);
      for (const zone of safeZones) {
        for (const pos of zone) {
          expect(grid[pos.y][pos.x]).toBe(CellType.FLOOR);
        }
      }
    });

    it('enthält zerstörbare Wände', () => {
      const grid = BoardManager.generate(4);
      let hasDestructible = false;
      for (let y = 1; y < CONFIG.BOARD_HEIGHT - 1; y++) {
        for (let x = 1; x < CONFIG.BOARD_WIDTH - 1; x++) {
          if (grid[y][x] === CellType.WALL_DESTRUCTIBLE) {
            hasDestructible = true;
            break;
          }
        }
        if (hasDestructible) break;
      }
      expect(hasDestructible).toBe(true);
    });
  });

  describe('getCell()', () => {
    it('gibt den korrekten Zelltyp zurück', () => {
      expect(BoardManager.getCell(0, 0)).toBe(CellType.WALL_INDESTRUCTIBLE);
    });

    it('gibt WALL_INDESTRUCTIBLE für Positionen außerhalb des Spielfelds zurück', () => {
      expect(BoardManager.getCell(-1, 0)).toBe(CellType.WALL_INDESTRUCTIBLE);
      expect(BoardManager.getCell(0, -1)).toBe(CellType.WALL_INDESTRUCTIBLE);
      expect(BoardManager.getCell(CONFIG.BOARD_WIDTH, 0)).toBe(CellType.WALL_INDESTRUCTIBLE);
      expect(BoardManager.getCell(0, CONFIG.BOARD_HEIGHT)).toBe(CellType.WALL_INDESTRUCTIBLE);
    });
  });

  describe('setCell()', () => {
    it('setzt den Zelltyp korrekt', () => {
      BoardManager.setCell(1, 1, CellType.WALL_DESTRUCTIBLE);
      expect(BoardManager.getCell(1, 1)).toBe(CellType.WALL_DESTRUCTIBLE);
    });

    it('ignoriert Positionen außerhalb des Spielfelds', () => {
      // Should not throw
      BoardManager.setCell(-1, 0, CellType.FLOOR);
      BoardManager.setCell(CONFIG.BOARD_WIDTH, 0, CellType.FLOOR);
    });
  });

  describe('destroyWall()', () => {
    it('zerstört eine zerstörbare Wand und gibt null zurück', () => {
      BoardManager.setCell(3, 1, CellType.WALL_DESTRUCTIBLE);
      const result = BoardManager.destroyWall(3, 1);
      expect(result).toBeNull();
      expect(BoardManager.getCell(3, 1)).toBe(CellType.FLOOR);
    });

    it('tut nichts bei unzerstörbarer Wand', () => {
      const result = BoardManager.destroyWall(0, 0);
      expect(result).toBeNull();
      expect(BoardManager.getCell(0, 0)).toBe(CellType.WALL_INDESTRUCTIBLE);
    });

    it('tut nichts bei FLOOR', () => {
      BoardManager.setCell(1, 1, CellType.FLOOR);
      const result = BoardManager.destroyWall(1, 1);
      expect(result).toBeNull();
      expect(BoardManager.getCell(1, 1)).toBe(CellType.FLOOR);
    });
  });

  describe('isWalkable()', () => {
    it('gibt true für FLOOR zurück', () => {
      BoardManager.setCell(1, 1, CellType.FLOOR);
      expect(BoardManager.isWalkable(1, 1)).toBe(true);
    });

    it('gibt false für WALL_INDESTRUCTIBLE zurück', () => {
      expect(BoardManager.isWalkable(0, 0)).toBe(false);
    });

    it('gibt false für WALL_DESTRUCTIBLE zurück', () => {
      BoardManager.setCell(3, 1, CellType.WALL_DESTRUCTIBLE);
      expect(BoardManager.isWalkable(3, 1)).toBe(false);
    });

    it('gibt false für Positionen außerhalb des Spielfelds zurück', () => {
      expect(BoardManager.isWalkable(-1, 0)).toBe(false);
    });
  });
});

// ============================================================
// Property-Based Tests für BoardManager
// ============================================================

/**
 * Validates: Requirements 1.1, 1.2, 1.5
 * Feature: boomerboy, Property 1: Spielfeld-Strukturinvarianten
 */
describe('Property 1: Spielfeld-Strukturinvarianten', () => {
  it('Für jedes generierte Spielfeld: Dimensionen 13×11, Rand = unzerstörbare Wände, Gittermuster korrekt', () => {
    fc.assert(
      fc.property(arbitraryPlayerCount(), (playerCount) => {
        const grid = BoardManager.generate(playerCount);

        // 1. Dimensionen sind exakt 13×11
        expect(grid.length).toBe(CONFIG.BOARD_HEIGHT); // 11 rows
        expect(grid[0].length).toBe(CONFIG.BOARD_WIDTH); // 13 columns
        for (const row of grid) {
          expect(row.length).toBe(CONFIG.BOARD_WIDTH);
        }

        // 2. Alle Randzellen sind WALL_INDESTRUCTIBLE
        for (let x = 0; x < CONFIG.BOARD_WIDTH; x++) {
          expect(grid[0][x]).toBe(CellType.WALL_INDESTRUCTIBLE);
          expect(grid[CONFIG.BOARD_HEIGHT - 1][x]).toBe(CellType.WALL_INDESTRUCTIBLE);
        }
        for (let y = 0; y < CONFIG.BOARD_HEIGHT; y++) {
          expect(grid[y][0]).toBe(CellType.WALL_INDESTRUCTIBLE);
          expect(grid[y][CONFIG.BOARD_WIDTH - 1]).toBe(CellType.WALL_INDESTRUCTIBLE);
        }

        // 3. Inneres Gittermuster: Zellen bei (x, y) mit x % 2 === 0 && y % 2 === 0
        //    für x in 2..width-2, y in 2..height-2 sind WALL_INDESTRUCTIBLE
        for (let y = 2; y <= CONFIG.BOARD_HEIGHT - 2; y += 2) {
          for (let x = 2; x <= CONFIG.BOARD_WIDTH - 2; x += 2) {
            expect(grid[y][x]).toBe(CellType.WALL_INDESTRUCTIBLE);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 1.3, 1.4, 9.7, 9.8
 * Feature: boomerboy, Property 2: Spielfeld-Startzonen und gültige Wandplatzierung
 */
describe('Property 2: Spielfeld-Startzonen und gültige Wandplatzierung', () => {
  it('Für jede Spieleranzahl (2, 3, 4): L-förmige Startbereiche frei, Wände nur auf erlaubten Zellen', () => {
    fc.assert(
      fc.property(arbitraryPlayerCount(), (playerCount) => {
        const grid = BoardManager.generate(playerCount);
        const safeZones = CONFIG.getSafeZones(playerCount);

        // Collect all safe zone cells into a Set for fast lookup
        const safeZoneCells = new Set();
        for (const zone of safeZones) {
          for (const pos of zone) {
            safeZoneCells.add(`${pos.x},${pos.y}`);
          }
        }

        // 1. All L-shaped safe zones for participating players are FLOOR
        for (const zone of safeZones) {
          for (const pos of zone) {
            expect(grid[pos.y][pos.x]).toBe(CellType.FLOOR);
          }
        }

        // 2. Destructible walls are ONLY on allowed cells
        for (let y = 0; y < CONFIG.BOARD_HEIGHT; y++) {
          for (let x = 0; x < CONFIG.BOARD_WIDTH; x++) {
            if (grid[y][x] === CellType.WALL_DESTRUCTIBLE) {
              // NOT a border cell
              const isBorder = x === 0 || x === CONFIG.BOARD_WIDTH - 1 || y === 0 || y === CONFIG.BOARD_HEIGHT - 1;
              expect(isBorder).toBe(false);

              // NOT a grid pattern position (inner cells where x%2===0 && y%2===0)
              const isGridPattern = x % 2 === 0 && y % 2 === 0;
              expect(isGridPattern).toBe(false);

              // NOT a safe zone cell of participating players
              const isSafeZone = safeZoneCells.has(`${x},${y}`);
              expect(isSafeZone).toBe(false);
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
