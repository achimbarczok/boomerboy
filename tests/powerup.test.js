// ============================================================
// Unit-Tests für PowerUpManager
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PowerUpType, CONFIG, PowerUpManager } from '../src/game.js';

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

describe('PowerUpManager', () => {
  beforeEach(() => {
    PowerUpManager.powerUps = [];
  });

  describe('spawnPowerUp()', () => {
    it('erzeugt ein Power-Up wenn Math.random < 0.3', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.1)   // < 0.3 → spawn
        .mockReturnValueOnce(0.0);  // type index 0 → EXTRA_BOMB

      PowerUpManager.spawnPowerUp({ x: 5, y: 3 });

      expect(PowerUpManager.powerUps.length).toBe(1);
      expect(PowerUpManager.powerUps[0].position).toEqual({ x: 5, y: 3 });
      expect(PowerUpManager.powerUps[0].type).toBe(PowerUpType.EXTRA_BOMB);

      vi.restoreAllMocks();
    });

    it('erzeugt kein Power-Up wenn Math.random >= 0.3', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      PowerUpManager.spawnPowerUp({ x: 5, y: 3 });

      expect(PowerUpManager.powerUps.length).toBe(0);

      vi.restoreAllMocks();
    });

    it('erzeugt BIGGER_EXPLOSION Typ', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.1)    // spawn
        .mockReturnValueOnce(0.4);   // floor(0.4 * 3) = 1 → BIGGER_EXPLOSION

      PowerUpManager.spawnPowerUp({ x: 2, y: 2 });

      expect(PowerUpManager.powerUps[0].type).toBe(PowerUpType.BIGGER_EXPLOSION);

      vi.restoreAllMocks();
    });

    it('erzeugt SPEED Typ', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.1)    // spawn
        .mockReturnValueOnce(0.8);   // floor(0.8 * 3) = 2 → SPEED

      PowerUpManager.spawnPowerUp({ x: 2, y: 2 });

      expect(PowerUpManager.powerUps[0].type).toBe(PowerUpType.SPEED);

      vi.restoreAllMocks();
    });
  });

  describe('collectPowerUp()', () => {
    it('sammelt EXTRA_BOMB ein und erhöht maxBombs um 1', () => {
      PowerUpManager.powerUps.push({
        position: { x: 3, y: 3 },
        type: PowerUpType.EXTRA_BOMB,
      });
      const player = createPlayer(0, 3, 3);

      const result = PowerUpManager.collectPowerUp({ x: 3, y: 3 }, player);

      expect(result).toBe(true);
      expect(player.maxBombs).toBe(CONFIG.DEFAULT_MAX_BOMBS + 1);
      expect(PowerUpManager.powerUps.length).toBe(0);
    });

    it('sammelt BIGGER_EXPLOSION ein und erhöht explosionRange um 1', () => {
      PowerUpManager.powerUps.push({
        position: { x: 3, y: 3 },
        type: PowerUpType.BIGGER_EXPLOSION,
      });
      const player = createPlayer(0, 3, 3);

      const result = PowerUpManager.collectPowerUp({ x: 3, y: 3 }, player);

      expect(result).toBe(true);
      expect(player.explosionRange).toBe(CONFIG.DEFAULT_EXPLOSION_RANGE + 1);
      expect(PowerUpManager.powerUps.length).toBe(0);
    });

    it('sammelt SPEED ein und erhöht speed um 0.3', () => {
      PowerUpManager.powerUps.push({
        position: { x: 3, y: 3 },
        type: PowerUpType.SPEED,
      });
      const player = createPlayer(0, 3, 3);

      const result = PowerUpManager.collectPowerUp({ x: 3, y: 3 }, player);

      expect(result).toBe(true);
      expect(player.speed).toBeCloseTo(CONFIG.DEFAULT_SPEED + CONFIG.SPEED_INCREMENT);
      expect(PowerUpManager.powerUps.length).toBe(0);
    });

    it('gibt false zurück wenn kein Power-Up an Position', () => {
      const player = createPlayer(0, 3, 3);

      const result = PowerUpManager.collectPowerUp({ x: 3, y: 3 }, player);

      expect(result).toBe(false);
      expect(player.maxBombs).toBe(CONFIG.DEFAULT_MAX_BOMBS);
    });
  });

  describe('removePowerUp()', () => {
    it('entfernt Power-Up an gegebener Position', () => {
      PowerUpManager.powerUps.push({
        position: { x: 5, y: 5 },
        type: PowerUpType.EXTRA_BOMB,
      });

      PowerUpManager.removePowerUp({ x: 5, y: 5 });

      expect(PowerUpManager.powerUps.length).toBe(0);
    });

    it('tut nichts wenn kein Power-Up an Position', () => {
      PowerUpManager.powerUps.push({
        position: { x: 5, y: 5 },
        type: PowerUpType.EXTRA_BOMB,
      });

      PowerUpManager.removePowerUp({ x: 1, y: 1 });

      expect(PowerUpManager.powerUps.length).toBe(1);
    });
  });

  describe('getPowerUpAt()', () => {
    it('gibt Power-Up zurück wenn vorhanden', () => {
      const pu = { position: { x: 3, y: 3 }, type: PowerUpType.SPEED };
      PowerUpManager.powerUps.push(pu);

      const result = PowerUpManager.getPowerUpAt(3, 3);

      expect(result).toBe(pu);
    });

    it('gibt null zurück wenn kein Power-Up vorhanden', () => {
      const result = PowerUpManager.getPowerUpAt(3, 3);

      expect(result).toBeNull();
    });
  });
});

// ============================================================
// Property-Based Tests für PowerUpManager
// ============================================================

import fc from 'fast-check';
import { arbitraryPowerUpType, arbitraryPosition } from './generators.js';

describe('PowerUpManager — Property-Based Tests', () => {
  beforeEach(() => {
    PowerUpManager.powerUps = [];
  });

  // --------------------------------------------------------
  // Property 14: Power-Up-Spawn-Gültigkeit
  // Validates: Requirements 6.1
  // Tag: Feature: boomerboy, Property 14: Power-Up-Spawn-Gültigkeit
  // --------------------------------------------------------
  it('Property 14: Power-Up-Spawn-Gültigkeit — spawned power-up has valid type and matches destroyed wall position', () => {
    fc.assert(
      fc.property(
        arbitraryPosition(),
        (pos) => {
          PowerUpManager.powerUps = [];

          // Force spawn: first random < 0.3, second picks type
          const randomSpy = vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.1)                          // < 0.3 → spawn
            .mockReturnValueOnce(Math.random());               // random type index

          PowerUpManager.spawnPowerUp(pos);

          randomSpy.mockRestore();

          // Exactly one power-up should have been spawned
          expect(PowerUpManager.powerUps.length).toBe(1);

          const pu = PowerUpManager.powerUps[0];

          // Valid type
          const validTypes = [PowerUpType.EXTRA_BOMB, PowerUpType.BIGGER_EXPLOSION, PowerUpType.SPEED];
          expect(validTypes).toContain(pu.type);

          // Position matches destroyed wall position
          expect(pu.position).toEqual({ x: pos.x, y: pos.y });
        }
      ),
      { numRuns: 100 }
    );
  });

  // --------------------------------------------------------
  // Property 15: Power-Up-Einsammlung und Effektanwendung
  // Validates: Requirements 6.2, 6.3, 6.4, 6.5
  // Tag: Feature: boomerboy, Property 15: Power-Up-Einsammlung und Effektanwendung
  // --------------------------------------------------------
  it('Property 15: Power-Up-Einsammlung und Effektanwendung — power-up removed and effect correctly applied', () => {
    fc.assert(
      fc.property(
        arbitraryPowerUpType(),
        arbitraryPosition(),
        fc.integer({ min: 1, max: 5 }),       // initial maxBombs
        fc.integer({ min: 1, max: 6 }),       // initial explosionRange
        fc.double({ min: 1.0, max: 3.0, noNaN: true }), // initial speed
        (puType, pos, maxBombs, range, speed) => {
          PowerUpManager.powerUps = [];

          // Place power-up
          PowerUpManager.powerUps.push({
            position: { x: pos.x, y: pos.y },
            type: puType,
          });

          const player = {
            index: 0,
            name: 'Spieler 1',
            color: '#F44336',
            position: { x: pos.x, y: pos.y },
            alive: true,
            maxBombs,
            explosionRange: range,
            speed,
            activeBombs: 0,
            moveCooldown: 0,
          };

          const result = PowerUpManager.collectPowerUp(pos, player);

          // Power-up collected
          expect(result).toBe(true);

          // Power-up removed from list
          expect(PowerUpManager.powerUps.length).toBe(0);

          // Effect correctly applied
          switch (puType) {
            case PowerUpType.EXTRA_BOMB:
              expect(player.maxBombs).toBe(maxBombs + 1);
              expect(player.explosionRange).toBe(range);
              expect(player.speed).toBeCloseTo(speed);
              break;
            case PowerUpType.BIGGER_EXPLOSION:
              expect(player.maxBombs).toBe(maxBombs);
              expect(player.explosionRange).toBe(range + 1);
              expect(player.speed).toBeCloseTo(speed);
              break;
            case PowerUpType.SPEED:
              expect(player.maxBombs).toBe(maxBombs);
              expect(player.explosionRange).toBe(range);
              expect(player.speed).toBeCloseTo(speed + CONFIG.SPEED_INCREMENT);
              break;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // --------------------------------------------------------
  // Property 16: Power-Up-Zerstörung durch Explosion
  // Validates: Requirements 6.6
  // Tag: Feature: boomerboy, Property 16: Power-Up-Zerstörung durch Explosion
  // --------------------------------------------------------
  it('Property 16: Power-Up-Zerstörung durch Explosion — power-up on explosion cell is removed', () => {
    fc.assert(
      fc.property(
        arbitraryPowerUpType(),
        arbitraryPosition(),
        (puType, pos) => {
          PowerUpManager.powerUps = [];

          // Place power-up
          PowerUpManager.powerUps.push({
            position: { x: pos.x, y: pos.y },
            type: puType,
          });

          expect(PowerUpManager.powerUps.length).toBe(1);

          // Simulate explosion destroying the power-up
          PowerUpManager.removePowerUp(pos);

          // Power-up should be gone
          expect(PowerUpManager.powerUps.length).toBe(0);
          expect(PowerUpManager.getPowerUpAt(pos.x, pos.y)).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
