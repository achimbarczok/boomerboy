// ============================================================
// Unit-Tests für InputManager
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { Direction, CONFIG, InputManager } from '../src/game.js';
import { arbitraryPlayerCount } from './generators.js';

describe('InputManager', () => {
  beforeEach(() => {
    InputManager.init(4);
  });

  describe('init()', () => {
    it('setzt die Spieleranzahl', () => {
      InputManager.init(3);
      expect(InputManager.playerCount).toBe(3);
    });

    it('leert die keyStates', () => {
      InputManager.handleKeyDown('w');
      expect(InputManager.isKeyDown('w')).toBe(true);
      InputManager.init(2);
      expect(InputManager.isKeyDown('w')).toBe(false);
    });

    it('begrenzt die Spieleranzahl auf MIN/MAX', () => {
      InputManager.init(1);
      expect(InputManager.playerCount).toBe(CONFIG.MIN_PLAYER_COUNT);
      InputManager.init(10);
      expect(InputManager.playerCount).toBe(CONFIG.MAX_PLAYER_COUNT);
    });
  });

  describe('handleKeyDown() / handleKeyUp() / isKeyDown()', () => {
    it('registriert gedrückte Tasten', () => {
      InputManager.handleKeyDown('w');
      expect(InputManager.isKeyDown('w')).toBe(true);
    });

    it('registriert losgelassene Tasten', () => {
      InputManager.handleKeyDown('w');
      InputManager.handleKeyUp('w');
      expect(InputManager.isKeyDown('w')).toBe(false);
    });

    it('gibt false für nie gedrückte Tasten zurück', () => {
      expect(InputManager.isKeyDown('z')).toBe(false);
    });
  });

  describe('setPlayerCount()', () => {
    it('aktualisiert die Spieleranzahl', () => {
      InputManager.setPlayerCount(2);
      expect(InputManager.playerCount).toBe(2);
    });

    it('begrenzt auf MIN/MAX', () => {
      InputManager.setPlayerCount(0);
      expect(InputManager.playerCount).toBe(CONFIG.MIN_PLAYER_COUNT);
      InputManager.setPlayerCount(99);
      expect(InputManager.playerCount).toBe(CONFIG.MAX_PLAYER_COUNT);
    });
  });

  describe('poll()', () => {
    it('gibt ein Array mit der Länge der Spieleranzahl zurück', () => {
      InputManager.init(2);
      const inputs = InputManager.poll();
      expect(inputs.length).toBe(2);
    });

    it('gibt null direction und false placeBomb zurück wenn keine Tasten gedrückt', () => {
      const inputs = InputManager.poll();
      for (const input of inputs) {
        expect(input.direction).toBeNull();
        expect(input.placeBomb).toBe(false);
      }
    });

    // --- Spieler 1 (WASD + Space) ---
    it('Spieler 1: W → UP', () => {
      InputManager.handleKeyDown('w');
      const inputs = InputManager.poll();
      expect(inputs[0].direction).toBe(Direction.UP);
    });

    it('Spieler 1: S → DOWN', () => {
      InputManager.handleKeyDown('s');
      const inputs = InputManager.poll();
      expect(inputs[0].direction).toBe(Direction.DOWN);
    });

    it('Spieler 1: A → LEFT', () => {
      InputManager.handleKeyDown('a');
      const inputs = InputManager.poll();
      expect(inputs[0].direction).toBe(Direction.LEFT);
    });

    it('Spieler 1: D → RIGHT', () => {
      InputManager.handleKeyDown('d');
      const inputs = InputManager.poll();
      expect(inputs[0].direction).toBe(Direction.RIGHT);
    });

    it('Spieler 1: Space → placeBomb', () => {
      InputManager.handleKeyDown(' ');
      const inputs = InputManager.poll();
      expect(inputs[0].placeBomb).toBe(true);
    });

    // --- Spieler 2 (Pfeiltasten + Enter) ---
    it('Spieler 2: ArrowUp → UP', () => {
      InputManager.handleKeyDown('ArrowUp');
      const inputs = InputManager.poll();
      expect(inputs[1].direction).toBe(Direction.UP);
    });

    it('Spieler 2: ArrowDown → DOWN', () => {
      InputManager.handleKeyDown('ArrowDown');
      const inputs = InputManager.poll();
      expect(inputs[1].direction).toBe(Direction.DOWN);
    });

    it('Spieler 2: ArrowLeft → LEFT', () => {
      InputManager.handleKeyDown('ArrowLeft');
      const inputs = InputManager.poll();
      expect(inputs[1].direction).toBe(Direction.LEFT);
    });

    it('Spieler 2: ArrowRight → RIGHT', () => {
      InputManager.handleKeyDown('ArrowRight');
      const inputs = InputManager.poll();
      expect(inputs[1].direction).toBe(Direction.RIGHT);
    });

    it('Spieler 2: Enter → placeBomb', () => {
      InputManager.handleKeyDown('Enter');
      const inputs = InputManager.poll();
      expect(inputs[1].placeBomb).toBe(true);
    });

    // --- Spieler 3 (IJKL + U) ---
    it('Spieler 3: I → UP', () => {
      InputManager.handleKeyDown('i');
      const inputs = InputManager.poll();
      expect(inputs[2].direction).toBe(Direction.UP);
    });

    it('Spieler 3: K → DOWN', () => {
      InputManager.handleKeyDown('k');
      const inputs = InputManager.poll();
      expect(inputs[2].direction).toBe(Direction.DOWN);
    });

    it('Spieler 3: J → LEFT', () => {
      InputManager.handleKeyDown('j');
      const inputs = InputManager.poll();
      expect(inputs[2].direction).toBe(Direction.LEFT);
    });

    it('Spieler 3: L → RIGHT', () => {
      InputManager.handleKeyDown('l');
      const inputs = InputManager.poll();
      expect(inputs[2].direction).toBe(Direction.RIGHT);
    });

    it('Spieler 3: U → placeBomb', () => {
      InputManager.handleKeyDown('u');
      const inputs = InputManager.poll();
      expect(inputs[2].placeBomb).toBe(true);
    });

    // --- Spieler 4 (Numpad) ---
    it('Spieler 4: 8 → UP', () => {
      InputManager.handleKeyDown('8');
      const inputs = InputManager.poll();
      expect(inputs[3].direction).toBe(Direction.UP);
    });

    it('Spieler 4: 5 → DOWN', () => {
      InputManager.handleKeyDown('5');
      const inputs = InputManager.poll();
      expect(inputs[3].direction).toBe(Direction.DOWN);
    });

    it('Spieler 4: 4 → LEFT', () => {
      InputManager.handleKeyDown('4');
      const inputs = InputManager.poll();
      expect(inputs[3].direction).toBe(Direction.LEFT);
    });

    it('Spieler 4: 6 → RIGHT', () => {
      InputManager.handleKeyDown('6');
      const inputs = InputManager.poll();
      expect(inputs[3].direction).toBe(Direction.RIGHT);
    });

    it('Spieler 4: 0 → placeBomb', () => {
      InputManager.handleKeyDown('0');
      const inputs = InputManager.poll();
      expect(inputs[3].placeBomb).toBe(true);
    });

    // --- Spieleranzahl begrenzt poll() Ausgabe ---
    it('poll() gibt nur Eingaben für aktive Spieler zurück (2 Spieler)', () => {
      InputManager.init(2);
      InputManager.handleKeyDown('i'); // Spieler 3 Taste
      const inputs = InputManager.poll();
      expect(inputs.length).toBe(2);
    });

    it('poll() gibt nur Eingaben für aktive Spieler zurück (3 Spieler)', () => {
      InputManager.init(3);
      InputManager.handleKeyDown('8'); // Spieler 4 Taste
      const inputs = InputManager.poll();
      expect(inputs.length).toBe(3);
    });

    // --- Gleichzeitige Tasten ---
    it('verarbeitet gleichzeitige Tasten verschiedener Spieler unabhängig', () => {
      InputManager.handleKeyDown('w');       // Spieler 1 UP
      InputManager.handleKeyDown('ArrowLeft'); // Spieler 2 LEFT
      InputManager.handleKeyDown('k');       // Spieler 3 DOWN
      InputManager.handleKeyDown('0');       // Spieler 4 Bombe

      const inputs = InputManager.poll();
      expect(inputs[0].direction).toBe(Direction.UP);
      expect(inputs[1].direction).toBe(Direction.LEFT);
      expect(inputs[2].direction).toBe(Direction.DOWN);
      expect(inputs[3].placeBomb).toBe(true);
    });

    // --- Richtungspriorität: erste gedrückte Richtung gewinnt ---
    it('bei mehreren Richtungstasten eines Spielers wird die erste Priorität gewählt (UP > DOWN > LEFT > RIGHT)', () => {
      InputManager.handleKeyDown('w'); // UP
      InputManager.handleKeyDown('s'); // DOWN
      const inputs = InputManager.poll();
      expect(inputs[0].direction).toBe(Direction.UP);
    });
  });

  describe('keyBindings', () => {
    it('hat genau 4 Tastenbelegungen', () => {
      expect(InputManager.keyBindings.length).toBe(4);
    });

    it('jede Belegung hat up, down, left, right, bomb', () => {
      for (const binding of InputManager.keyBindings) {
        expect(binding).toHaveProperty('up');
        expect(binding).toHaveProperty('down');
        expect(binding).toHaveProperty('left');
        expect(binding).toHaveProperty('right');
        expect(binding).toHaveProperty('bomb');
      }
    });
  });

  // ============================================================
  // Property-Based Tests
  // ============================================================

  describe('Property 5: Gleichzeitige unabhängige Eingabeverarbeitung', { tags: ['Feature: boomerboy, Property 5: Gleichzeitige unabhängige Eingabeverarbeitung'] }, () => {
    /**
     * **Validates: Requirements 2.5, 3.5**
     *
     * For a random player count, press random keys for each player simultaneously,
     * verify each player's input is processed independently of the others.
     */
    const expectedDirections = {
      up: Direction.UP,
      down: Direction.DOWN,
      left: Direction.LEFT,
      right: Direction.RIGHT,
    };

    it('gleichzeitige Tasten verschiedener Spieler werden unabhängig verarbeitet', () => {
      fc.assert(
        fc.property(
          arbitraryPlayerCount(),
          fc.gen().map(gen => {
            // For each of the 4 possible players, generate optional direction + bomb
            return Array.from({ length: 4 }, () => ({
              direction: gen(fc.option, fc.constantFrom('up', 'down', 'left', 'right'), { nil: null }),
              bomb: gen(fc.boolean),
            }));
          }),
          (playerCount, playerActions) => {
            InputManager.init(playerCount);

            // Press keys for ALL players (including inactive ones)
            for (let i = 0; i < 4; i++) {
              const bindings = InputManager.keyBindings[i];
              const action = playerActions[i];

              if (action.direction !== null) {
                InputManager.handleKeyDown(bindings[action.direction]);
              }
              if (action.bomb) {
                InputManager.handleKeyDown(bindings.bomb);
              }
            }

            const inputs = InputManager.poll();

            // poll() returns exactly playerCount entries
            expect(inputs.length).toBe(playerCount);

            // Each active player's input reflects their own keys independently
            for (let i = 0; i < playerCount; i++) {
              const action = playerActions[i];
              const input = inputs[i];

              if (action.direction !== null) {
                expect(input.direction).toBe(expectedDirections[action.direction]);
              } else {
                expect(input.direction).toBeNull();
              }

              expect(input.placeBomb).toBe(action.bomb);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 18: Spieleranzahl-Auswahl bestimmt aktive Spieler', { tags: ['Feature: boomerboy, Property 18: Spieleranzahl-Auswahl bestimmt aktive Spieler'] }, () => {
    /**
     * **Validates: Requirements 9.1, 9.2, 9.3, 3.3, 3.4**
     *
     * For each player count N (2, 3, 4): exactly N players initialized,
     * only N key bindings active (poll returns exactly N inputs).
     */
    it('poll() gibt exakt N Eingaben für Spieleranzahl N zurück', () => {
      fc.assert(
        fc.property(
          arbitraryPlayerCount(),
          (playerCount) => {
            InputManager.init(playerCount);
            const inputs = InputManager.poll();

            // Exactly N inputs returned
            expect(inputs.length).toBe(playerCount);

            // Each input has the correct shape
            for (const input of inputs) {
              expect(input).toHaveProperty('direction');
              expect(input).toHaveProperty('placeBomb');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('nur Tastenbelegungen der N aktiven Spieler erzeugen Eingaben', () => {
      fc.assert(
        fc.property(
          arbitraryPlayerCount(),
          (playerCount) => {
            InputManager.init(playerCount);

            // Press a direction key for EVERY player (including inactive ones)
            for (let i = 0; i < 4; i++) {
              InputManager.handleKeyDown(InputManager.keyBindings[i].up);
            }

            const inputs = InputManager.poll();

            // Only N inputs returned — inactive players are not included
            expect(inputs.length).toBe(playerCount);

            // All active players should have UP direction
            for (let i = 0; i < playerCount; i++) {
              expect(inputs[i].direction).toBe(Direction.UP);
            }

            // No extra entries for inactive players
            expect(inputs[playerCount]).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('setPlayerCount ändert die Anzahl aktiver Spieler korrekt', () => {
      fc.assert(
        fc.property(
          arbitraryPlayerCount(),
          arbitraryPlayerCount(),
          (initialCount, newCount) => {
            InputManager.init(initialCount);
            InputManager.setPlayerCount(newCount);

            const inputs = InputManager.poll();
            expect(inputs.length).toBe(newCount);
            expect(InputManager.playerCount).toBe(newCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
