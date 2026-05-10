// ============================================================
// Unit-Tests für GameState: Tastenbelegung, Timer, Startbildschirm
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { GamePhase, CONFIG, GameState, InputManager, BoardManager, PlayerManager, BombManager, PowerUpManager } from '../src/game.js';

// Helper: reset all managers to clean state
function resetAll() {
  BombManager.bombs = [];
  BombManager.explosions = [];
  PowerUpManager.powerUps = [];
  GameState.phase = GamePhase.STARTSCREEN;
  GameState.playerCount = CONFIG.DEFAULT_PLAYER_COUNT;
  GameState.roundResult = null;
  GameState.roundEndTimer = 0;
  GameState.selectedPlayerCount = CONFIG.DEFAULT_PLAYER_COUNT;
}

describe('GameState Unit-Tests', () => {
  beforeEach(() => {
    resetAll();
  });

  // ============================================================
  // 1. Key bindings verification (Req 3.1-3.4)
  // ============================================================
  describe('Tastenbelegung (Req 3.1-3.4)', () => {
    it('Spieler 1: W/A/S/D + Space', () => {
      const b = InputManager.keyBindings[0];
      expect(b.up).toBe('w');
      expect(b.left).toBe('a');
      expect(b.down).toBe('s');
      expect(b.right).toBe('d');
      expect(b.bomb).toBe(' ');
    });

    it('Spieler 2: ArrowUp/ArrowLeft/ArrowDown/ArrowRight + Enter', () => {
      const b = InputManager.keyBindings[1];
      expect(b.up).toBe('ArrowUp');
      expect(b.left).toBe('ArrowLeft');
      expect(b.down).toBe('ArrowDown');
      expect(b.right).toBe('ArrowRight');
      expect(b.bomb).toBe('Enter');
    });

    it('Spieler 3: I/J/K/L + U', () => {
      const b = InputManager.keyBindings[2];
      expect(b.up).toBe('i');
      expect(b.left).toBe('j');
      expect(b.down).toBe('k');
      expect(b.right).toBe('l');
      expect(b.bomb).toBe('u');
    });

    it('Spieler 4: 8/4/5/6 + 0', () => {
      const b = InputManager.keyBindings[3];
      expect(b.up).toBe('8');
      expect(b.left).toBe('4');
      expect(b.down).toBe('5');
      expect(b.right).toBe('6');
      expect(b.bomb).toBe('0');
    });

    it('keyBindings hat exakt 4 Einträge', () => {
      expect(InputManager.keyBindings.length).toBe(4);
    });
  });

  // ============================================================
  // 2. Bomb countdown (Req 4.3)
  // ============================================================
  describe('Bomben-Countdown (Req 4.3)', () => {
    it('Bombe startet mit Timer 3000ms', () => {
      BombManager.bombs = [];
      BombManager.explosions = [];
      const player = {
        index: 0, alive: true, maxBombs: 1, activeBombs: 0,
        explosionRange: 2, position: { x: 1, y: 1 },
      };
      BombManager.placeBomb(player);
      expect(BombManager.bombs[0].timer).toBe(3000);
    });

    it('Nach 2000ms Update ist Timer bei 1000ms', () => {
      BombManager.bombs = [];
      BombManager.explosions = [];
      const board = BoardManager;
      BoardManager.generate(2);
      const player = {
        index: 0, alive: true, maxBombs: 1, activeBombs: 0,
        explosionRange: 2, position: { x: 1, y: 1 },
      };
      const pm = { players: [player], eliminatePlayer(i) { if (this.players[i]) this.players[i].alive = false; } };
      BombManager.placeBomb(player);
      BombManager.update(2000, board, pm);
      expect(BombManager.bombs[0].timer).toBe(1000);
    });

    it('Nach 3000ms detoniert die Bombe', () => {
      BombManager.bombs = [];
      BombManager.explosions = [];
      BoardManager.generate(2);
      const player = {
        index: 0, alive: true, maxBombs: 1, activeBombs: 0,
        explosionRange: 2, position: { x: 1, y: 1 },
      };
      const pm = { players: [player], eliminatePlayer(i) { if (this.players[i]) this.players[i].alive = false; } };
      BombManager.placeBomb(player);
      BombManager.update(3000, BoardManager, pm);
      expect(BombManager.bombs.length).toBe(0);
      expect(BombManager.explosions.length).toBe(1);
    });
  });

  // ============================================================
  // 3. Explosion duration (Req 4.8)
  // ============================================================
  describe('Explosionsdauer (Req 4.8)', () => {
    it('Explosion startet mit Timer 500ms', () => {
      BombManager.bombs = [];
      BombManager.explosions = [];
      BoardManager.generate(2);
      const player = {
        index: 0, alive: true, maxBombs: 1, activeBombs: 0,
        explosionRange: 2, position: { x: 1, y: 1 },
      };
      const pm = { players: [player], eliminatePlayer(i) { if (this.players[i]) this.players[i].alive = false; } };
      BombManager.placeBomb(player);
      BombManager.update(3000, BoardManager, pm);
      expect(BombManager.explosions.length).toBe(1);
      expect(BombManager.explosions[0].timer).toBe(CONFIG.EXPLOSION_DURATION);
    });

    it('Nach 500ms wird Explosion entfernt', () => {
      BombManager.bombs = [];
      BombManager.explosions = [];
      BoardManager.generate(2);
      const player = {
        index: 0, alive: true, maxBombs: 1, activeBombs: 0,
        explosionRange: 2, position: { x: 1, y: 1 },
      };
      const pm = { players: [player], eliminatePlayer(i) { if (this.players[i]) this.players[i].alive = false; } };
      BombManager.placeBomb(player);
      // Detonate bomb
      BombManager.update(3000, BoardManager, pm);
      expect(BombManager.explosions.length).toBe(1);
      // Remove explosion after 500ms
      BombManager.update(500, BoardManager, pm);
      expect(BombManager.explosions.length).toBe(0);
    });
  });

  // ============================================================
  // 4. Start screen and player count (Req 9.1, 9.2)
  // ============================================================
  describe('Startbildschirm und Spieleranzahl (Req 9.1, 9.2)', () => {
    it('GameState startet in STARTSCREEN Phase', () => {
      expect(GameState.phase).toBe(GamePhase.STARTSCREEN);
    });

    it('selectedPlayerCount ist standardmäßig 4', () => {
      expect(GameState.selectedPlayerCount).toBe(4);
    });

    it('startRound wechselt zu PLAYING Phase', () => {
      GameState.startRound(4);
      expect(GameState.phase).toBe(GamePhase.PLAYING);
    });

    it('startRound mit 2 Spielern initialisiert 2 Spieler', () => {
      GameState.startRound(2);
      expect(GameState.players.length).toBe(2);
    });

    it('startRound mit 3 Spielern initialisiert 3 Spieler', () => {
      GameState.startRound(3);
      expect(GameState.players.length).toBe(3);
    });

    it('startRound mit 4 Spielern initialisiert 4 Spieler', () => {
      GameState.startRound(4);
      expect(GameState.players.length).toBe(4);
    });
  });

  // ============================================================
  // 5. Start positions (Req 9.7, 9.8)
  // ============================================================
  describe('Startpositionen (Req 9.7, 9.8)', () => {
    it('2 Spieler: P1 bei (1,1), P2 bei (11,9)', () => {
      GameState.startRound(2);
      expect(GameState.players[0].position).toEqual({ x: 1, y: 1 });
      expect(GameState.players[1].position).toEqual({ x: 11, y: 9 });
    });

    it('3 Spieler: P1 bei (1,1), P2 bei (11,1), P3 bei (1,9)', () => {
      GameState.startRound(3);
      expect(GameState.players[0].position).toEqual({ x: 1, y: 1 });
      expect(GameState.players[1].position).toEqual({ x: 11, y: 1 });
      expect(GameState.players[2].position).toEqual({ x: 1, y: 9 });
    });

    it('4 Spieler: P1 bei (1,1), P2 bei (11,1), P3 bei (1,9), P4 bei (11,9)', () => {
      GameState.startRound(4);
      expect(GameState.players[0].position).toEqual({ x: 1, y: 1 });
      expect(GameState.players[1].position).toEqual({ x: 11, y: 1 });
      expect(GameState.players[2].position).toEqual({ x: 1, y: 9 });
      expect(GameState.players[3].position).toEqual({ x: 11, y: 9 });
    });
  });

  // ============================================================
  // 6. Round end (Req 9.4)
  // ============================================================
  describe('Rundenende (Req 9.4)', () => {
    it('endRound setzt Phase auf ROUND_END', () => {
      GameState.startRound(4);
      GameState.endRound({ winner: 0, isDraw: false });
      expect(GameState.phase).toBe(GamePhase.ROUND_END);
    });

    it('roundEndTimer startet bei 3000ms', () => {
      GameState.startRound(4);
      GameState.endRound({ winner: 0, isDraw: false });
      expect(GameState.roundEndTimer).toBe(3000);
    });

    it('Nach 3000ms wechselt Phase zurück zu STARTSCREEN', () => {
      GameState.startRound(4);
      GameState.endRound({ winner: 0, isDraw: false });
      // Simulate 3000ms passing
      GameState.update(3000);
      expect(GameState.phase).toBe(GamePhase.STARTSCREEN);
    });
  });
});
