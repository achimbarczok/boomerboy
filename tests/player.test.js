// ============================================================
// Unit-Tests und Property-Based Tests für PlayerManager
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { CellType, Direction, Color, CONFIG, BoardManager, PlayerManager } from '../src/game.js';
import { arbitraryPlayerCount, arbitraryDirection, arbitraryPosition } from './generators.js';

const PLAYER_COLORS = [Color.RED, Color.YELLOW, Color.GREEN, Color.BLUE];

// Helper: create a minimal board-like object for testing
function createTestBoard(walkableCells = new Set()) {
  return {
    isWalkable(x, y) {
      return walkableCells.has(`${x},${y}`);
    },
  };
}

// Helper: create a bombs object with hasBombAt
function createBombs(bombPositions = []) {
  return {
    hasBombAt(x, y) {
      return bombPositions.some(p => p.x === x && p.y === y);
    },
  };
}

describe('PlayerManager', () => {
  describe('init()', () => {
    it('initialisiert 4 Spieler mit korrekten Standardwerten', () => {
      const positions = CONFIG.getStartPositions(4);
      PlayerManager.init(4, positions);

      expect(PlayerManager.players.length).toBe(4);
      expect(PlayerManager.playerCount).toBe(4);

      for (let i = 0; i < 4; i++) {
        const p = PlayerManager.players[i];
        expect(p.index).toBe(i);
        expect(p.name).toBe(`Spieler ${i + 1}`);
        expect(p.color).toBe(PLAYER_COLORS[i]);
        expect(p.position.x).toBe(positions[i].x);
        expect(p.position.y).toBe(positions[i].y);
        expect(p.alive).toBe(true);
        expect(p.maxBombs).toBe(1);
        expect(p.explosionRange).toBe(2);
        expect(p.speed).toBe(1.0);
        expect(p.activeBombs).toBe(0);
        expect(p.moveCooldown).toBe(0);
      }
    });

    it('initialisiert 2 Spieler korrekt', () => {
      const positions = CONFIG.getStartPositions(2);
      PlayerManager.init(2, positions);

      expect(PlayerManager.players.length).toBe(2);
      expect(PlayerManager.playerCount).toBe(2);
      expect(PlayerManager.players[0].position).toEqual(positions[0]);
      expect(PlayerManager.players[1].position).toEqual(positions[1]);
    });

    it('initialisiert 3 Spieler korrekt', () => {
      const positions = CONFIG.getStartPositions(3);
      PlayerManager.init(3, positions);

      expect(PlayerManager.players.length).toBe(3);
      expect(PlayerManager.playerCount).toBe(3);
    });
  });

  describe('movePlayer()', () => {
    beforeEach(() => {
      const positions = [{ x: 5, y: 5 }, { x: 7, y: 7 }];
      PlayerManager.init(2, positions);
    });

    it('bewegt Spieler nach oben', () => {
      const board = createTestBoard(new Set(['5,4']));
      const result = PlayerManager.movePlayer(0, Direction.UP, board, []);
      expect(result).toBe(true);
      expect(PlayerManager.players[0].position).toEqual({ x: 5, y: 4 });
    });

    it('bewegt Spieler nach unten', () => {
      const board = createTestBoard(new Set(['5,6']));
      const result = PlayerManager.movePlayer(0, Direction.DOWN, board, []);
      expect(result).toBe(true);
      expect(PlayerManager.players[0].position).toEqual({ x: 5, y: 6 });
    });

    it('bewegt Spieler nach links', () => {
      const board = createTestBoard(new Set(['4,5']));
      const result = PlayerManager.movePlayer(0, Direction.LEFT, board, []);
      expect(result).toBe(true);
      expect(PlayerManager.players[0].position).toEqual({ x: 4, y: 5 });
    });

    it('bewegt Spieler nach rechts', () => {
      const board = createTestBoard(new Set(['6,5']));
      const result = PlayerManager.movePlayer(0, Direction.RIGHT, board, []);
      expect(result).toBe(true);
      expect(PlayerManager.players[0].position).toEqual({ x: 6, y: 5 });
    });

    it('blockiert Bewegung auf nicht-begehbare Zelle', () => {
      const board = createTestBoard(new Set()); // nothing walkable
      const result = PlayerManager.movePlayer(0, Direction.UP, board, []);
      expect(result).toBe(false);
      expect(PlayerManager.players[0].position).toEqual({ x: 5, y: 5 });
    });

    it('blockiert Bewegung auf Zelle mit Bombe (hasBombAt)', () => {
      const board = createTestBoard(new Set(['5,4']));
      const bombs = createBombs([{ x: 5, y: 4 }]);
      const result = PlayerManager.movePlayer(0, Direction.UP, board, bombs);
      expect(result).toBe(false);
      expect(PlayerManager.players[0].position).toEqual({ x: 5, y: 5 });
    });

    it('blockiert Bewegung auf Zelle mit Bombe (Array)', () => {
      const board = createTestBoard(new Set(['5,4']));
      const bombs = [{ position: { x: 5, y: 4 } }];
      const result = PlayerManager.movePlayer(0, Direction.UP, board, bombs);
      expect(result).toBe(false);
      expect(PlayerManager.players[0].position).toEqual({ x: 5, y: 5 });
    });

    it('setzt moveCooldown nach erfolgreicher Bewegung', () => {
      const board = createTestBoard(new Set(['5,4']));
      PlayerManager.movePlayer(0, Direction.UP, board, []);
      expect(PlayerManager.players[0].moveCooldown).toBe(CONFIG.BASE_MOVE_COOLDOWN / 1.0);
    });

    it('ignoriert Bewegung für eliminierten Spieler', () => {
      PlayerManager.players[0].alive = false;
      const board = createTestBoard(new Set(['5,4']));
      const result = PlayerManager.movePlayer(0, Direction.UP, board, []);
      expect(result).toBe(false);
      expect(PlayerManager.players[0].position).toEqual({ x: 5, y: 5 });
    });

    it('gibt false für ungültigen Index zurück', () => {
      const board = createTestBoard(new Set(['5,4']));
      const result = PlayerManager.movePlayer(99, Direction.UP, board, []);
      expect(result).toBe(false);
    });
  });

  describe('eliminatePlayer()', () => {
    it('markiert Spieler als eliminiert', () => {
      PlayerManager.init(2, CONFIG.getStartPositions(2));
      PlayerManager.eliminatePlayer(0);
      expect(PlayerManager.players[0].alive).toBe(false);
    });

    it('ignoriert ungültigen Index', () => {
      PlayerManager.init(2, CONFIG.getStartPositions(2));
      // Should not throw
      PlayerManager.eliminatePlayer(99);
    });
  });

  describe('getAlivePlayers()', () => {
    it('gibt alle lebenden Spieler zurück', () => {
      PlayerManager.init(4, CONFIG.getStartPositions(4));
      PlayerManager.eliminatePlayer(1);
      PlayerManager.eliminatePlayer(3);
      const alive = PlayerManager.getAlivePlayers();
      expect(alive.length).toBe(2);
      expect(alive[0].index).toBe(0);
      expect(alive[1].index).toBe(2);
    });
  });

  describe('checkWinCondition()', () => {
    it('gibt null zurück wenn mehrere Spieler leben', () => {
      PlayerManager.init(4, CONFIG.getStartPositions(4));
      expect(PlayerManager.checkWinCondition()).toBeNull();
    });

    it('gibt Gewinner zurück wenn genau 1 Spieler lebt', () => {
      PlayerManager.init(4, CONFIG.getStartPositions(4));
      PlayerManager.eliminatePlayer(0);
      PlayerManager.eliminatePlayer(1);
      PlayerManager.eliminatePlayer(3);
      const result = PlayerManager.checkWinCondition();
      expect(result).toEqual({ winner: 2, isDraw: false });
    });

    it('gibt Unentschieden zurück wenn 0 Spieler leben', () => {
      PlayerManager.init(2, CONFIG.getStartPositions(2));
      PlayerManager.eliminatePlayer(0);
      PlayerManager.eliminatePlayer(1);
      const result = PlayerManager.checkWinCondition();
      expect(result).toEqual({ winner: null, isDraw: true });
    });
  });

  describe('update()', () => {
    it('verringert moveCooldown über Zeit', () => {
      PlayerManager.init(2, [{ x: 5, y: 5 }, { x: 7, y: 7 }]);
      PlayerManager.players[0].moveCooldown = 100;
      const board = createTestBoard(new Set());
      PlayerManager.update([{ direction: null, placeBomb: false }, { direction: null, placeBomb: false }], 50, board, []);
      expect(PlayerManager.players[0].moveCooldown).toBe(50);
    });

    it('moveCooldown wird nicht negativ', () => {
      PlayerManager.init(2, [{ x: 5, y: 5 }, { x: 7, y: 7 }]);
      PlayerManager.players[0].moveCooldown = 30;
      const board = createTestBoard(new Set());
      PlayerManager.update([{ direction: null, placeBomb: false }, { direction: null, placeBomb: false }], 50, board, []);
      expect(PlayerManager.players[0].moveCooldown).toBe(0);
    });

    it('bewegt Spieler wenn cooldown abgelaufen und Richtung angegeben', () => {
      PlayerManager.init(2, [{ x: 5, y: 5 }, { x: 7, y: 7 }]);
      const board = createTestBoard(new Set(['5,4']));
      PlayerManager.update([{ direction: Direction.UP, placeBomb: false }, { direction: null, placeBomb: false }], 16, board, []);
      expect(PlayerManager.players[0].position).toEqual({ x: 5, y: 4 });
    });

    it('bewegt Spieler nicht wenn cooldown noch aktiv', () => {
      PlayerManager.init(2, [{ x: 5, y: 5 }, { x: 7, y: 7 }]);
      PlayerManager.players[0].moveCooldown = 100;
      const board = createTestBoard(new Set(['5,4']));
      PlayerManager.update([{ direction: Direction.UP, placeBomb: false }, { direction: null, placeBomb: false }], 16, board, []);
      expect(PlayerManager.players[0].position).toEqual({ x: 5, y: 5 });
    });

    it('ignoriert eliminierte Spieler', () => {
      PlayerManager.init(2, [{ x: 5, y: 5 }, { x: 7, y: 7 }]);
      PlayerManager.players[0].alive = false;
      PlayerManager.players[0].moveCooldown = 100;
      const board = createTestBoard(new Set(['5,4']));
      PlayerManager.update([{ direction: Direction.UP, placeBomb: false }, { direction: null, placeBomb: false }], 50, board, []);
      // moveCooldown should NOT decrease for dead players
      expect(PlayerManager.players[0].moveCooldown).toBe(100);
      expect(PlayerManager.players[0].position).toEqual({ x: 5, y: 5 });
    });
  });
});

// ============================================================
// Property-Based Tests für PlayerManager
// ============================================================

import { arbitraryBoard, arbitraryPlayer, arbitraryPlayerCount } from './generators.js';

// Helper: direction deltas
const DIRECTION_DELTAS = {
  [Direction.UP]: { dx: 0, dy: -1 },
  [Direction.DOWN]: { dx: 0, dy: 1 },
  [Direction.LEFT]: { dx: -1, dy: 0 },
  [Direction.RIGHT]: { dx: 1, dy: 0 },
};

describe('Feature: boomerboy, Property 3: Bewegung um genau eine Rasterzelle', () => {
  /**
   * Validates: Requirements 2.1
   *
   * For every valid player position and direction where the target cell is walkable
   * (FLOOR, no bomb): new position is exactly one cell away in the chosen direction.
   */
  it('neue Position ist genau eine Zelle entfernt in gewählter Richtung', () => {
    fc.assert(
      fc.property(
        arbitraryBoard(),
        arbitraryDirection(),
        (board, direction) => {
          const { dx, dy } = DIRECTION_DELTAS[direction];

          // Find a position where the adjacent cell in the given direction is walkable
          let foundPos = null;
          for (let y = 1; y < board.height - 1 && !foundPos; y++) {
            for (let x = 1; x < board.width - 1 && !foundPos; x++) {
              if (board.grid[y][x] === CellType.FLOOR) {
                const tx = x + dx;
                const ty = y + dy;
                if (tx >= 0 && tx < board.width && ty >= 0 && ty < board.height &&
                    board.grid[ty][tx] === CellType.FLOOR) {
                  foundPos = { x, y };
                }
              }
            }
          }

          // If no valid position found for this board+direction combo, skip
          if (!foundPos) return true;

          // Set up PlayerManager with a player at foundPos
          PlayerManager.init(2, [foundPos, { x: 1, y: 1 }]);
          const boardObj = {
            isWalkable(x, y) {
              if (x < 0 || x >= board.width || y < 0 || y >= board.height) return false;
              return board.grid[y][x] === CellType.FLOOR;
            },
          };

          const oldX = PlayerManager.players[0].position.x;
          const oldY = PlayerManager.players[0].position.y;

          const moved = PlayerManager.movePlayer(0, direction, boardObj, []);
          expect(moved).toBe(true);

          const newX = PlayerManager.players[0].position.x;
          const newY = PlayerManager.players[0].position.y;

          // Manhattan distance must be exactly 1
          const manhattan = Math.abs(newX - oldX) + Math.abs(newY - oldY);
          expect(manhattan).toBe(1);

          // Must be in the correct direction
          expect(newX - oldX).toBe(dx);
          expect(newY - oldY).toBe(dy);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: boomerboy, Property 4: Kollisionsblockierung', () => {
  /**
   * Validates: Requirements 2.2, 2.3, 2.4
   *
   * For every player position where the target cell has an obstacle
   * (indestructible wall, destructible wall, or bomb): position remains unchanged.
   */
  it('Position bleibt unverändert bei Hindernis in Zielrichtung', () => {
    fc.assert(
      fc.property(
        arbitraryBoard(),
        arbitraryDirection(),
        (board, direction) => {
          const { dx, dy } = DIRECTION_DELTAS[direction];

          // Find a FLOOR position where the adjacent cell in direction is a wall
          let foundPos = null;
          let targetIsWall = false;
          for (let y = 1; y < board.height - 1 && !foundPos; y++) {
            for (let x = 1; x < board.width - 1 && !foundPos; x++) {
              if (board.grid[y][x] === CellType.FLOOR) {
                const tx = x + dx;
                const ty = y + dy;
                if (tx >= 0 && tx < board.width && ty >= 0 && ty < board.height) {
                  const cell = board.grid[ty][tx];
                  if (cell === CellType.WALL_INDESTRUCTIBLE || cell === CellType.WALL_DESTRUCTIBLE) {
                    foundPos = { x, y };
                    targetIsWall = true;
                  }
                }
              }
            }
          }

          if (!foundPos) return true;

          PlayerManager.init(2, [foundPos, { x: 1, y: 1 }]);
          const boardObj = {
            isWalkable(x, y) {
              if (x < 0 || x >= board.width || y < 0 || y >= board.height) return false;
              return board.grid[y][x] === CellType.FLOOR;
            },
          };

          const oldX = foundPos.x;
          const oldY = foundPos.y;

          const moved = PlayerManager.movePlayer(0, direction, boardObj, []);
          expect(moved).toBe(false);
          expect(PlayerManager.players[0].position.x).toBe(oldX);
          expect(PlayerManager.players[0].position.y).toBe(oldY);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Position bleibt unverändert bei Bombe in Zielrichtung', () => {
    fc.assert(
      fc.property(
        arbitraryBoard(),
        arbitraryDirection(),
        (board, direction) => {
          const { dx, dy } = DIRECTION_DELTAS[direction];

          // Find a FLOOR position where the adjacent cell is also FLOOR (we'll place a bomb there)
          let foundPos = null;
          let bombPos = null;
          for (let y = 1; y < board.height - 1 && !foundPos; y++) {
            for (let x = 1; x < board.width - 1 && !foundPos; x++) {
              if (board.grid[y][x] === CellType.FLOOR) {
                const tx = x + dx;
                const ty = y + dy;
                if (tx >= 0 && tx < board.width && ty >= 0 && ty < board.height &&
                    board.grid[ty][tx] === CellType.FLOOR) {
                  foundPos = { x, y };
                  bombPos = { x: tx, y: ty };
                }
              }
            }
          }

          if (!foundPos) return true;

          PlayerManager.init(2, [foundPos, { x: 1, y: 1 }]);
          const boardObj = {
            isWalkable(x, y) {
              if (x < 0 || x >= board.width || y < 0 || y >= board.height) return false;
              return board.grid[y][x] === CellType.FLOOR;
            },
          };

          const bombs = [{ position: bombPos }];

          const oldX = foundPos.x;
          const oldY = foundPos.y;

          const moved = PlayerManager.movePlayer(0, direction, boardObj, bombs);
          expect(moved).toBe(false);
          expect(PlayerManager.players[0].position.x).toBe(oldX);
          expect(PlayerManager.players[0].position.y).toBe(oldY);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: boomerboy, Property 11: Eliminierter Spieler ignoriert Eingaben', () => {
  /**
   * Validates: Requirements 5.3
   *
   * For every eliminated player and any input: player state (position, bombs) remains unchanged.
   */
  it('eliminierter Spieler ändert Position und Bomben nicht bei Eingaben', () => {
    fc.assert(
      fc.property(
        arbitraryPlayerCount(),
        arbitraryDirection(),
        fc.boolean(),
        (playerCount, direction, placeBomb) => {
          const positions = CONFIG.getStartPositions(playerCount);
          PlayerManager.init(playerCount, positions);

          // Eliminate player 0
          PlayerManager.eliminatePlayer(0);

          const player = PlayerManager.players[0];
          const oldPos = { ...player.position };
          const oldMaxBombs = player.maxBombs;
          const oldActiveBombs = player.activeBombs;
          const oldRange = player.explosionRange;
          const oldSpeed = player.speed;

          // Try to move
          const boardObj = {
            isWalkable() { return true; },
          };
          const moved = PlayerManager.movePlayer(0, direction, boardObj, []);
          expect(moved).toBe(false);

          // Verify state unchanged
          expect(player.position.x).toBe(oldPos.x);
          expect(player.position.y).toBe(oldPos.y);
          expect(player.maxBombs).toBe(oldMaxBombs);
          expect(player.activeBombs).toBe(oldActiveBombs);
          expect(player.explosionRange).toBe(oldRange);
          expect(player.speed).toBe(oldSpeed);
          expect(player.alive).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: boomerboy, Property 12: Letzter überlebender Spieler gewinnt', () => {
  /**
   * Validates: Requirements 5.4
   *
   * For every game state with exactly one alive player among 2-4 participating players:
   * win condition returns that player as winner.
   */
  it('genau ein lebender Spieler wird als Gewinner erkannt', () => {
    fc.assert(
      fc.property(
        arbitraryPlayerCount(),
        fc.integer({ min: 0, max: 3 }),
        (playerCount, survivorSeed) => {
          const positions = CONFIG.getStartPositions(playerCount);
          PlayerManager.init(playerCount, positions);

          // Pick a valid survivor index
          const survivorIndex = survivorSeed % playerCount;

          // Eliminate all except the survivor
          for (let i = 0; i < playerCount; i++) {
            if (i !== survivorIndex) {
              PlayerManager.eliminatePlayer(i);
            }
          }

          const result = PlayerManager.checkWinCondition();
          expect(result).not.toBeNull();
          expect(result.winner).toBe(survivorIndex);
          expect(result.isDraw).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: boomerboy, Property 13: Gleichzeitige Eliminierung ergibt Unentschieden', () => {
  /**
   * Validates: Requirements 5.5
   *
   * All remaining players eliminated simultaneously: result = draw.
   */
  it('alle Spieler eliminiert ergibt Unentschieden', () => {
    fc.assert(
      fc.property(
        arbitraryPlayerCount(),
        (playerCount) => {
          const positions = CONFIG.getStartPositions(playerCount);
          PlayerManager.init(playerCount, positions);

          // Eliminate all players (simulating simultaneous elimination)
          for (let i = 0; i < playerCount; i++) {
            PlayerManager.eliminatePlayer(i);
          }

          const result = PlayerManager.checkWinCondition();
          expect(result).not.toBeNull();
          expect(result.winner).toBeNull();
          expect(result.isDraw).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: boomerboy, Property 17: Standardwerte bei Rundenstart', () => {
  /**
   * Validates: Requirements 9.6, 9.7, 9.8
   *
   * For every player count (2, 3, 4): default values correct
   * (maxBombs=1, explosionRange=2, speed=1.0, alive=true).
   */
  it('alle Spieler haben korrekte Standardwerte nach Initialisierung', () => {
    fc.assert(
      fc.property(
        arbitraryPlayerCount(),
        (playerCount) => {
          const positions = CONFIG.getStartPositions(playerCount);
          PlayerManager.init(playerCount, positions);

          expect(PlayerManager.players.length).toBe(playerCount);
          expect(PlayerManager.playerCount).toBe(playerCount);

          for (let i = 0; i < playerCount; i++) {
            const player = PlayerManager.players[i];
            expect(player.maxBombs).toBe(1);
            expect(player.explosionRange).toBe(2);
            expect(player.speed).toBe(1.0);
            expect(player.alive).toBe(true);
            expect(player.activeBombs).toBe(0);
            expect(player.moveCooldown).toBe(0);
            expect(player.position.x).toBe(positions[i].x);
            expect(player.position.y).toBe(positions[i].y);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
