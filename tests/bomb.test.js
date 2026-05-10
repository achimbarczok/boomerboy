// ============================================================
// Unit-Tests für BombManager
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { CellType, CONFIG, BoardManager, PlayerManager, BombManager } from '../src/game.js';

// Helper: create a simple board object from a grid
function createBoard(grid) {
  const height = grid.length;
  const width = grid[0].length;
  return {
    grid,
    width,
    height,
    getCell(x, y) {
      if (x < 0 || x >= width || y < 0 || y >= height) return CellType.WALL_INDESTRUCTIBLE;
      return grid[y][x];
    },
    setCell(x, y, type) {
      if (x >= 0 && x < width && y >= 0 && y < height) grid[y][x] = type;
    },
    destroyWall(x, y) {
      if (this.getCell(x, y) === CellType.WALL_DESTRUCTIBLE) {
        grid[y][x] = CellType.FLOOR;
      }
      return null;
    },
    isWalkable(x, y) {
      return this.getCell(x, y) === CellType.FLOOR;
    },
  };
}

// Helper: create a minimal 7x7 board (all floor inside, walls on border + grid pattern)
function createMinimalBoard() {
  const W = CellType.WALL_INDESTRUCTIBLE;
  const F = CellType.FLOOR;
  // 7x7 board
  const grid = [
    [W, W, W, W, W, W, W],
    [W, F, F, F, F, F, W],
    [W, F, W, F, W, F, W],
    [W, F, F, F, F, F, W],
    [W, F, W, F, W, F, W],
    [W, F, F, F, F, F, W],
    [W, W, W, W, W, W, W],
  ];
  return createBoard(grid);
}

function createPlayer(index, x, y, overrides = {}) {
  return {
    index,
    name: `Spieler ${index + 1}`,
    color: '#F44336',
    position: { x, y },
    alive: true,
    maxBombs: CONFIG.DEFAULT_MAX_BOMBS,
    explosionRange: CONFIG.DEFAULT_EXPLOSION_RANGE,
    speed: CONFIG.DEFAULT_SPEED,
    activeBombs: 0,
    moveCooldown: 0,
    ...overrides,
  };
}

function createPlayerManager(players) {
  return {
    players,
    eliminatePlayer(index) {
      const p = players[index];
      if (p) p.alive = false;
    },
  };
}

describe('BombManager', () => {
  beforeEach(() => {
    BombManager.bombs = [];
    BombManager.explosions = [];
  });

  describe('placeBomb()', () => {
    it('platziert eine Bombe auf der Spielerposition', () => {
      const player = createPlayer(0, 3, 3);
      const result = BombManager.placeBomb(player);
      expect(result).toBe(true);
      expect(BombManager.bombs.length).toBe(1);
      expect(BombManager.bombs[0].position).toEqual({ x: 3, y: 3 });
      expect(BombManager.bombs[0].ownerIndex).toBe(0);
      expect(BombManager.bombs[0].timer).toBe(CONFIG.BOMB_TIMER);
      expect(BombManager.bombs[0].range).toBe(CONFIG.DEFAULT_EXPLOSION_RANGE);
      expect(player.activeBombs).toBe(1);
    });

    it('verhindert Platzierung wenn maxBombs erreicht', () => {
      const player = createPlayer(0, 3, 3, { maxBombs: 1, activeBombs: 1 });
      const result = BombManager.placeBomb(player);
      expect(result).toBe(false);
      expect(BombManager.bombs.length).toBe(0);
    });

    it('verhindert Platzierung wenn bereits Bombe an Position', () => {
      const player = createPlayer(0, 3, 3, { maxBombs: 2 });
      BombManager.placeBomb(player);
      // Move player away conceptually but place again at same spot
      const player2 = createPlayer(1, 3, 3, { maxBombs: 2 });
      const result = BombManager.placeBomb(player2);
      expect(result).toBe(false);
      expect(BombManager.bombs.length).toBe(1);
    });

    it('verhindert Platzierung für eliminierten Spieler', () => {
      const player = createPlayer(0, 3, 3, { alive: false });
      const result = BombManager.placeBomb(player);
      expect(result).toBe(false);
    });

    it('inkrementiert activeBombs des Spielers', () => {
      const player = createPlayer(0, 3, 3, { maxBombs: 3 });
      BombManager.placeBomb(player);
      expect(player.activeBombs).toBe(1);
    });

    it('verwendet explosionRange des Spielers', () => {
      const player = createPlayer(0, 3, 3, { explosionRange: 5 });
      BombManager.placeBomb(player);
      expect(BombManager.bombs[0].range).toBe(5);
    });
  });

  describe('calculateExplosionCells()', () => {
    it('berechnet Explosion auf offenem Feld', () => {
      const board = createMinimalBoard();
      const cells = BombManager.calculateExplosionCells({ x: 3, y: 3 }, 2, board);
      // Center + 2 in each direction (up, down, left, right) = 1 + 4*2 = 9
      expect(cells).toContainEqual({ x: 3, y: 3 }); // center
      expect(cells).toContainEqual({ x: 3, y: 2 }); // up 1
      expect(cells).toContainEqual({ x: 3, y: 1 }); // up 2
      expect(cells).toContainEqual({ x: 3, y: 4 }); // down 1
      expect(cells).toContainEqual({ x: 3, y: 5 }); // down 2
      expect(cells).toContainEqual({ x: 2, y: 3 }); // left 1 — but (2,3) is floor in our board? Let me check
      expect(cells).toContainEqual({ x: 1, y: 3 }); // left 2
      expect(cells).toContainEqual({ x: 4, y: 3 }); // right 1
      expect(cells).toContainEqual({ x: 5, y: 3 }); // right 2
    });

    it('stoppt bei unzerstörbarer Wand (Zelle nicht betroffen)', () => {
      const board = createMinimalBoard();
      // (2,2) is WALL_INDESTRUCTIBLE in our grid pattern
      // Bomb at (1,1), range 3 — going right: (2,1) is floor, (3,1) is floor
      // going down: (1,2) is floor, (1,3) is floor
      // going up: (1,0) is wall → stop
      // going left: (0,1) is wall → stop
      const cells = BombManager.calculateExplosionCells({ x: 1, y: 1 }, 3, board);
      expect(cells).toContainEqual({ x: 1, y: 1 }); // center
      // Up: (1,0) is wall → stop, not included
      expect(cells).not.toContainEqual({ x: 1, y: 0 });
      // Left: (0,1) is wall → stop, not included
      expect(cells).not.toContainEqual({ x: 0, y: 1 });
    });

    it('stoppt bei zerstörbarer Wand (Zelle betroffen)', () => {
      const W = CellType.WALL_INDESTRUCTIBLE;
      const F = CellType.FLOOR;
      const D = CellType.WALL_DESTRUCTIBLE;
      const grid = [
        [W, W, W, W, W],
        [W, F, D, F, W],
        [W, F, F, F, W],
        [W, F, F, F, W],
        [W, W, W, W, W],
      ];
      const board = createBoard(grid);
      const cells = BombManager.calculateExplosionCells({ x: 1, y: 1 }, 3, board);
      // Right: (2,1) is destructible → included, but stop
      expect(cells).toContainEqual({ x: 2, y: 1 });
      // (3,1) should NOT be included (beyond destructible wall)
      expect(cells).not.toContainEqual({ x: 3, y: 1 });
    });

    it('Zentrum ist immer betroffen', () => {
      const board = createMinimalBoard();
      const cells = BombManager.calculateExplosionCells({ x: 3, y: 3 }, 1, board);
      expect(cells[0]).toEqual({ x: 3, y: 3 });
    });
  });

  describe('detonate()', () => {
    it('entfernt Bombe aus Array und erstellt Explosion', () => {
      const board = createMinimalBoard();
      const pm = createPlayerManager([]);
      const player = createPlayer(0, 3, 3);
      BombManager.placeBomb(player);
      const bomb = BombManager.bombs[0];

      BombManager.detonate(bomb, board, pm);

      expect(BombManager.bombs.length).toBe(0);
      expect(BombManager.explosions.length).toBe(1);
      expect(BombManager.explosions[0].timer).toBe(CONFIG.EXPLOSION_DURATION);
    });

    it('dekrementiert activeBombs des Besitzers', () => {
      const board = createMinimalBoard();
      const player = createPlayer(0, 3, 3);
      const pm = createPlayerManager([player]);
      BombManager.placeBomb(player);
      expect(player.activeBombs).toBe(1);

      const bomb = BombManager.bombs[0];
      BombManager.detonate(bomb, board, pm);
      expect(player.activeBombs).toBe(0);
    });

    it('zerstört zerstörbare Wände', () => {
      const W = CellType.WALL_INDESTRUCTIBLE;
      const F = CellType.FLOOR;
      const D = CellType.WALL_DESTRUCTIBLE;
      const grid = [
        [W, W, W, W, W],
        [W, F, D, F, W],
        [W, F, F, F, W],
        [W, F, F, F, W],
        [W, W, W, W, W],
      ];
      const board = createBoard(grid);
      const pm = createPlayerManager([]);
      const player = createPlayer(0, 1, 1);
      BombManager.placeBomb(player);
      const bomb = BombManager.bombs[0];

      BombManager.detonate(bomb, board, pm);
      expect(board.getCell(2, 1)).toBe(CellType.FLOOR);
    });

    it('eliminiert Spieler auf Explosionszellen', () => {
      const board = createMinimalBoard();
      const player0 = createPlayer(0, 3, 3);
      const player1 = createPlayer(1, 3, 4); // one cell below bomb
      const pm = createPlayerManager([player0, player1]);

      BombManager.placeBomb(player0);
      const bomb = BombManager.bombs[0];
      BombManager.detonate(bomb, board, pm);

      // Player at bomb center should be eliminated
      expect(player0.alive).toBe(false);
      // Player one cell below should be eliminated (within range 2)
      expect(player1.alive).toBe(false);
    });

    it('löst Kettenexplosion aus', () => {
      const board = createMinimalBoard();
      const player0 = createPlayer(0, 3, 3, { maxBombs: 2 });
      const player1 = createPlayer(1, 3, 5, { maxBombs: 2 });
      const pm = createPlayerManager([player0, player1]);

      // Place bomb at (3,3) and (3,5) — range 2 means (3,3) explosion reaches (3,5)
      BombManager.placeBomb(player0);
      player0.position = { x: 1, y: 1 }; // move away
      player1.position = { x: 3, y: 5 };
      BombManager.bombs.push({
        position: { x: 3, y: 5 },
        ownerIndex: 1,
        timer: 2000,
        range: 2,
      });
      player1.activeBombs = 1;

      const bomb = BombManager.bombs[0]; // bomb at (3,3)
      BombManager.detonate(bomb, board, pm);

      // Both bombs should be detonated
      expect(BombManager.bombs.length).toBe(0);
      // Should have 2 explosions (one for each bomb)
      expect(BombManager.explosions.length).toBe(2);
    });
  });

  describe('update()', () => {
    it('verringert Bomben-Timer', () => {
      const board = createMinimalBoard();
      const pm = createPlayerManager([]);
      const player = createPlayer(0, 3, 3);
      BombManager.placeBomb(player);

      BombManager.update(1000, board, pm);
      expect(BombManager.bombs[0].timer).toBe(CONFIG.BOMB_TIMER - 1000);
    });

    it('detoniert Bombe wenn Timer abgelaufen', () => {
      const board = createMinimalBoard();
      const player = createPlayer(0, 3, 3);
      const pm = createPlayerManager([player]);
      BombManager.placeBomb(player);

      BombManager.update(CONFIG.BOMB_TIMER, board, pm);
      expect(BombManager.bombs.length).toBe(0);
      expect(BombManager.explosions.length).toBe(1);
      expect(player.activeBombs).toBe(0);
    });

    it('entfernt abgelaufene Explosionen', () => {
      BombManager.explosions.push({
        cells: [{ x: 3, y: 3 }],
        timer: 200,
      });
      const board = createMinimalBoard();
      const pm = createPlayerManager([]);

      BombManager.update(200, board, pm);
      expect(BombManager.explosions.length).toBe(0);
    });

    it('verringert Explosions-Timer', () => {
      BombManager.explosions.push({
        cells: [{ x: 3, y: 3 }],
        timer: 500,
      });
      const board = createMinimalBoard();
      const pm = createPlayerManager([]);

      BombManager.update(100, board, pm);
      expect(BombManager.explosions[0].timer).toBe(400);
    });
  });

  describe('hasBombAt()', () => {
    it('gibt true zurück wenn Bombe an Position', () => {
      const player = createPlayer(0, 3, 3);
      BombManager.placeBomb(player);
      expect(BombManager.hasBombAt(3, 3)).toBe(true);
    });

    it('gibt false zurück wenn keine Bombe an Position', () => {
      expect(BombManager.hasBombAt(5, 5)).toBe(false);
    });
  });

  describe('isExplosionAt()', () => {
    it('gibt true zurück wenn Explosion an Position', () => {
      BombManager.explosions.push({
        cells: [{ x: 3, y: 3 }, { x: 3, y: 4 }],
        timer: 500,
      });
      expect(BombManager.isExplosionAt(3, 3)).toBe(true);
      expect(BombManager.isExplosionAt(3, 4)).toBe(true);
    });

    it('gibt false zurück wenn keine Explosion an Position', () => {
      expect(BombManager.isExplosionAt(5, 5)).toBe(false);
    });
  });
});

// ============================================================
// Property-Based Tests für BombManager (fast-check)
// ============================================================

import fc from 'fast-check';
import { arbitraryPlayer, arbitraryPosition, arbitraryBoard } from './generators.js';

/**
 * **Validates: Requirement 4.1**
 * Feature: boomerboy, Property 6: Bombenplatzierung an Spielerposition
 *
 * For every player who presses bomb button and has activeBombs < maxBombs:
 * bomb placed exactly at player's current grid cell.
 */
describe('Property 6: Bombenplatzierung an Spielerposition', () => {
  it('Bombe wird exakt auf aktueller Spielerposition platziert', () => {
    fc.assert(
      fc.property(
        arbitraryPosition(),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 6 }),
        (pos, maxBombs, explosionRange) => {
          // Reset BombManager state
          BombManager.bombs = [];
          BombManager.explosions = [];

          const player = createPlayer(0, pos.x, pos.y, {
            maxBombs,
            explosionRange,
            activeBombs: 0,
            alive: true,
          });

          const result = BombManager.placeBomb(player);

          // Should succeed
          expect(result).toBe(true);
          expect(BombManager.bombs.length).toBe(1);
          // Bomb must be at exact player position
          expect(BombManager.bombs[0].position.x).toBe(pos.x);
          expect(BombManager.bombs[0].position.y).toBe(pos.y);
          expect(BombManager.bombs[0].ownerIndex).toBe(player.index);
          expect(BombManager.bombs[0].range).toBe(explosionRange);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Validates: Requirement 4.2**
 * Feature: boomerboy, Property 7: Maximale Bombenanzahl
 *
 * When maximum reached: no new bomb created.
 */
describe('Property 7: Maximale Bombenanzahl', () => {
  it('Bei erreichtem Maximum wird keine neue Bombe erzeugt', () => {
    fc.assert(
      fc.property(
        arbitraryPosition(),
        fc.integer({ min: 1, max: 5 }),
        (pos, maxBombs) => {
          // Reset BombManager state
          BombManager.bombs = [];
          BombManager.explosions = [];

          const player = createPlayer(0, pos.x, pos.y, {
            maxBombs,
            activeBombs: maxBombs, // already at max
            alive: true,
          });

          const bombsBefore = BombManager.bombs.length;
          const result = BombManager.placeBomb(player);

          // Should fail — no new bomb
          expect(result).toBe(false);
          expect(BombManager.bombs.length).toBe(bombsBefore);
          // activeBombs should remain unchanged
          expect(player.activeBombs).toBe(maxBombs);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Validates: Requirements 4.4, 4.5, 4.6**
 * Feature: boomerboy, Property 8: Explosionsberechnung mit Blockierung
 *
 * Explosion stops at indestructible wall (cell not affected),
 * destroys destructible wall (cell affected),
 * no cell beyond blocking wall.
 * The explosion center is always included.
 */
describe('Property 8: Explosionsberechnung mit Blockierung', () => {
  it('Explosion stoppt korrekt bei Wänden und Zentrum ist immer enthalten', () => {
    fc.assert(
      fc.property(
        arbitraryBoard(),
        fc.integer({ min: 1, max: 6 }),
        (boardData, range) => {
          // Reset BombManager state
          BombManager.bombs = [];
          BombManager.explosions = [];

          const { grid, width, height } = boardData;

          // Build a board object from the generated grid
          const board = createBoard(grid);

          // Pick a random FLOOR cell for the bomb position
          const floorCells = [];
          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              if (grid[y][x] === CellType.FLOOR) {
                floorCells.push({ x, y });
              }
            }
          }
          // Need at least one floor cell
          if (floorCells.length === 0) return; // skip degenerate case

          const bombPos = floorCells[Math.floor(Math.random() * floorCells.length)];
          const cells = BombManager.calculateExplosionCells(bombPos, range, board);

          // 1. Center is always included
          expect(cells.some(c => c.x === bombPos.x && c.y === bombPos.y)).toBe(true);

          // 2. No explosion cell is an indestructible wall
          for (const cell of cells) {
            expect(board.getCell(cell.x, cell.y)).not.toBe(CellType.WALL_INDESTRUCTIBLE);
          }

          // 3. For each direction, verify no cell is beyond a blocking wall
          const directions = [
            { dx: 0, dy: -1 }, // UP
            { dx: 0, dy: 1 },  // DOWN
            { dx: -1, dy: 0 }, // LEFT
            { dx: 1, dy: 0 },  // RIGHT
          ];

          for (const dir of directions) {
            let blocked = false;
            for (let i = 1; i <= range; i++) {
              const nx = bombPos.x + dir.dx * i;
              const ny = bombPos.y + dir.dy * i;
              const cellType = board.getCell(nx, ny);
              const isInExplosion = cells.some(c => c.x === nx && c.y === ny);

              if (blocked) {
                // No cell beyond a blocking wall should be in the explosion
                expect(isInExplosion).toBe(false);
              } else if (cellType === CellType.WALL_INDESTRUCTIBLE) {
                // Indestructible wall: not affected, blocks further
                expect(isInExplosion).toBe(false);
                blocked = true;
              } else if (cellType === CellType.WALL_DESTRUCTIBLE) {
                // Destructible wall: affected but blocks further
                expect(isInExplosion).toBe(true);
                blocked = true;
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Validates: Requirement 4.7**
 * Feature: boomerboy, Property 9: Kettenexplosion
 *
 * Explosion reaches another bomb → immediate detonation of reached bomb.
 */
describe('Property 9: Kettenexplosion', () => {
  it('Explosion erreicht andere Bombe und löst sofortige Detonation aus', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        (offset) => {
          // Reset BombManager state
          BombManager.bombs = [];
          BombManager.explosions = [];

          const board = createMinimalBoard(); // 7x7 board
          const player0 = createPlayer(0, 3, 3, { maxBombs: 2 });
          const player1 = createPlayer(1, 1, 1, { maxBombs: 2 });
          const pm = createPlayerManager([player0, player1]);

          // Place bomb1 at center (3,3)
          BombManager.placeBomb(player0);

          // Place bomb2 within range of bomb1 — offset cells away in the down direction
          // Ensure it's within the board and reachable
          const bomb2Y = Math.min(3 + offset, 5); // max y=5 (inside 7x7 board)
          const bomb2Range = 2;

          BombManager.bombs.push({
            position: { x: 3, y: bomb2Y },
            ownerIndex: 1,
            timer: 2000,
            range: bomb2Range,
          });
          player1.activeBombs = 1;

          // Detonate bomb1 with range that can reach bomb2
          const bomb1 = BombManager.bombs[0];
          bomb1.range = offset; // exactly enough range to reach bomb2

          BombManager.detonate(bomb1, board, pm);

          // Both bombs should be gone
          expect(BombManager.bombs.length).toBe(0);
          // Should have at least 2 explosions (one per bomb)
          expect(BombManager.explosions.length).toBe(2);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Validates: Requirement 5.1**
 * Feature: boomerboy, Property 10: Spieler-Eliminierung durch Explosion
 *
 * Player on explosion cell is eliminated (alive = false).
 */
describe('Property 10: Spieler-Eliminierung durch Explosion', () => {
  it('Spieler auf Explosionszelle wird eliminiert', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 2 }),
        (bombX, bombY, range) => {
          // Reset BombManager state
          BombManager.bombs = [];
          BombManager.explosions = [];

          const board = createMinimalBoard(); // 7x7 board

          // Clamp bomb position to valid floor cells (inside 7x7 board, avoiding grid-pattern walls)
          const bx = Math.min(Math.max(bombX, 1), 5);
          const by = Math.min(Math.max(bombY, 1), 5);

          // Skip if bomb position is a wall
          if (board.getCell(bx, by) !== CellType.FLOOR) return;

          // Calculate explosion cells
          const cells = BombManager.calculateExplosionCells({ x: bx, y: by }, range, board);

          // Place a player on each explosion cell and verify elimination
          for (const cell of cells) {
            // Reset for each sub-test
            BombManager.bombs = [];
            BombManager.explosions = [];

            const player = createPlayer(0, bx, by, { maxBombs: 1, activeBombs: 0 });
            const victim = createPlayer(1, cell.x, cell.y, { alive: true });
            const pm = createPlayerManager([player, victim]);

            BombManager.placeBomb(player);
            const bomb = BombManager.bombs[0];
            bomb.range = range;

            BombManager.detonate(bomb, board, pm);

            // Victim on explosion cell must be eliminated
            expect(victim.alive).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
