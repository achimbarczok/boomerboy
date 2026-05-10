// Smoke test to verify the test environment works
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { GamePhase, CellType, Direction, PowerUpType, Color, CONFIG } from '../src/game.js';
import {
  arbitraryPlayerCount,
  arbitraryDirection,
  arbitraryPowerUpType,
  arbitraryPosition,
  arbitraryPlayer,
  arbitraryBomb,
  arbitraryBoard,
  arbitraryPlayerInputs,
} from './generators.js';

describe('Testumgebung', () => {
  it('game.js Exporte sind verfügbar', () => {
    expect(GamePhase.PLAYING).toBe('playing');
    expect(CellType.FLOOR).toBe(0);
    expect(Direction.UP).toBe('up');
    expect(PowerUpType.EXTRA_BOMB).toBe('extra_bomb');
    expect(Color.RED).toBe('#F44336');
    expect(CONFIG.BOARD_WIDTH).toBe(13);
    expect(CONFIG.BOARD_HEIGHT).toBe(11);
  });

  it('arbitraryPlayerCount generiert 2, 3 oder 4', () => {
    fc.assert(
      fc.property(arbitraryPlayerCount(), (pc) => {
        return pc >= 2 && pc <= 4;
      }),
      { numRuns: 50 }
    );
  });

  it('arbitraryDirection generiert gültige Richtungen', () => {
    const validDirs = Object.values(Direction);
    fc.assert(
      fc.property(arbitraryDirection(), (dir) => {
        return validDirs.includes(dir);
      }),
      { numRuns: 50 }
    );
  });

  it('arbitraryPowerUpType generiert gültige Typen', () => {
    const validTypes = Object.values(PowerUpType);
    fc.assert(
      fc.property(arbitraryPowerUpType(), (t) => {
        return validTypes.includes(t);
      }),
      { numRuns: 50 }
    );
  });

  it('arbitraryPosition generiert Positionen innerhalb der Grenzen', () => {
    fc.assert(
      fc.property(arbitraryPosition(), (pos) => {
        return pos.x >= 1 && pos.x <= CONFIG.BOARD_WIDTH - 2
            && pos.y >= 1 && pos.y <= CONFIG.BOARD_HEIGHT - 2;
      }),
      { numRuns: 100 }
    );
  });

  it('arbitraryPlayer generiert gültige Spielerobjekte', () => {
    fc.assert(
      fc.property(arbitraryPlayer(0), (player) => {
        return player.index === 0
            && player.maxBombs >= 1
            && player.explosionRange >= 1
            && player.activeBombs <= player.maxBombs
            && typeof player.alive === 'boolean';
      }),
      { numRuns: 50 }
    );
  });

  it('arbitraryBomb generiert gültige Bomben', () => {
    fc.assert(
      fc.property(arbitraryBomb(), (bomb) => {
        return bomb.position.x >= 1
            && bomb.position.y >= 1
            && bomb.timer >= 0
            && bomb.range >= 1;
      }),
      { numRuns: 50 }
    );
  });

  it('arbitraryBoard generiert ein gültiges Spielfeld', () => {
    fc.assert(
      fc.property(arbitraryBoard(), (board) => {
        return board.grid.length === CONFIG.BOARD_HEIGHT
            && board.grid[0].length === CONFIG.BOARD_WIDTH
            && board.width === CONFIG.BOARD_WIDTH
            && board.height === CONFIG.BOARD_HEIGHT;
      }),
      { numRuns: 20 }
    );
  });

  it('arbitraryPlayerInputs generiert korrekte Anzahl Eingaben', () => {
    fc.assert(
      fc.property(arbitraryPlayerInputs(3), (inputs) => {
        return inputs.length === 3
            && inputs.every(i => typeof i.placeBomb === 'boolean');
      }),
      { numRuns: 50 }
    );
  });
});
