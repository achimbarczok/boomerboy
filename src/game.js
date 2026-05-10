// ============================================================
// Boomerboy — Spielkonstanten und Enumerationen
// Importierbare Version für Tests
// ============================================================

const GamePhase = { STARTSCREEN: 'startscreen', PLAYING: 'playing', ROUND_END: 'round_end' };
const CellType = { FLOOR: 0, WALL_INDESTRUCTIBLE: 1, WALL_DESTRUCTIBLE: 2 };
const Direction = { UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right' };
const PowerUpType = { EXTRA_BOMB: 'extra_bomb', BIGGER_EXPLOSION: 'bigger_explosion', SPEED: 'speed' };
const Color = { RED: '#F44336', YELLOW: '#FFEB3B', GREEN: '#4CAF50', BLUE: '#2196F3' };

const CONFIG = {
  BOARD_WIDTH: 13,
  BOARD_HEIGHT: 11,
  BOMB_TIMER: 3000,
  EXPLOSION_DURATION: 500,
  BASE_MOVE_COOLDOWN: 200,
  DEFAULT_MAX_BOMBS: 1,
  DEFAULT_EXPLOSION_RANGE: 2,
  DEFAULT_SPEED: 1.0,
  SPEED_INCREMENT: 0.3,
  POWERUP_SPAWN_CHANCE: 0.3,
  DESTRUCTIBLE_WALL_DENSITY: 0.45,
  ROUND_END_DISPLAY_TIME: 3000,
  MIN_FPS: 30,
  FALLBACK_INTERVAL: 33,
  DEFAULT_PLAYER_COUNT: 4,
  MIN_PLAYER_COUNT: 2,
  MAX_PLAYER_COUNT: 4,
  ALL_START_POSITIONS: [
    { x: 1, y: 1 },
    { x: 11, y: 1 },
    { x: 1, y: 9 },
    { x: 11, y: 9 }
  ],
  START_POSITION_MAP: {
    2: [0, 3],
    3: [0, 1, 2],
    4: [0, 1, 2, 3]
  },
  ALL_SAFE_ZONES: [
    [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 11, y: 1 }, { x: 10, y: 1 }, { x: 11, y: 2 }],
    [{ x: 1, y: 9 }, { x: 2, y: 9 }, { x: 1, y: 8 }],
    [{ x: 11, y: 9 }, { x: 10, y: 9 }, { x: 11, y: 8 }]
  ],
  getStartPositions(playerCount) {
    return this.START_POSITION_MAP[playerCount].map(i => this.ALL_START_POSITIONS[i]);
  },
  getSafeZones(playerCount) {
    return this.START_POSITION_MAP[playerCount].map(i => this.ALL_SAFE_ZONES[i]);
  }
};

// ============================================================
// BoardManager — Spielfeld-Generierung und -Verwaltung
// ============================================================

const BoardManager = {
  grid: [],
  width: CONFIG.BOARD_WIDTH,
  height: CONFIG.BOARD_HEIGHT,

  /**
   * Generiert ein neues Spielfeld mit dem 5-Schritte-Algorithmus.
   * @param {number} playerCount — Anzahl der Spieler (2, 3 oder 4)
   * @returns {number[][]} Das generierte Grid
   */
  generate(playerCount) {
    const w = this.width;
    const h = this.height;
    const grid = [];

    // Schritt 1: Gesamtes Feld mit FLOOR füllen
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        row.push(CellType.FLOOR);
      }
      grid.push(row);
    }

    // Schritt 2: Äußeren Rand mit WALL_INDESTRUCTIBLE füllen
    for (let x = 0; x < w; x++) {
      grid[0][x] = CellType.WALL_INDESTRUCTIBLE;
      grid[h - 1][x] = CellType.WALL_INDESTRUCTIBLE;
    }
    for (let y = 0; y < h; y++) {
      grid[y][0] = CellType.WALL_INDESTRUCTIBLE;
      grid[y][w - 1] = CellType.WALL_INDESTRUCTIBLE;
    }

    // Schritt 3: Inneres Gittermuster
    for (let y = 2; y < h - 1; y += 2) {
      for (let x = 2; x < w - 1; x += 2) {
        grid[y][x] = CellType.WALL_INDESTRUCTIBLE;
      }
    }

    // Schritt 4: Zufällig WALL_DESTRUCTIBLE auf freien Zellen platzieren
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (grid[y][x] === CellType.FLOOR) {
          if (Math.random() < CONFIG.DESTRUCTIBLE_WALL_DENSITY) {
            grid[y][x] = CellType.WALL_DESTRUCTIBLE;
          }
        }
      }
    }

    // Schritt 5: L-förmige Startbereiche der teilnehmenden Spieler freihalten
    const safeZones = CONFIG.getSafeZones(playerCount);
    for (const zone of safeZones) {
      for (const pos of zone) {
        grid[pos.y][pos.x] = CellType.FLOOR;
      }
    }

    this.grid = grid;
    return grid;
  },

  /**
   * Gibt den Zelltyp an Position (x, y) zurück.
   */
  getCell(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return CellType.WALL_INDESTRUCTIBLE;
    }
    return this.grid[y][x];
  },

  /**
   * Setzt den Zelltyp an Position (x, y).
   */
  setCell(x, y, type) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.grid[y][x] = type;
    }
  },

  /**
   * Zerstört eine zerstörbare Wand an Position (x, y).
   * Gibt null zurück (Power-Up-Spawning wird vom PowerUpManager übernommen).
   */
  destroyWall(x, y) {
    if (this.getCell(x, y) === CellType.WALL_DESTRUCTIBLE) {
      this.grid[y][x] = CellType.FLOOR;
      return null;
    }
    return null;
  },

  /**
   * Prüft ob eine Zelle begehbar ist (FLOOR).
   */
  isWalkable(x, y) {
    return this.getCell(x, y) === CellType.FLOOR;
  }
};

// ============================================================
// PlayerManager — Spielerverwaltung
// ============================================================

const PLAYER_COLORS = [Color.RED, Color.YELLOW, Color.GREEN, Color.BLUE];

const PlayerManager = {
  players: [],
  playerCount: 0,

  /**
   * Initialisiert Spieler mit Standardwerten.
   * @param {number} playerCount — Anzahl der Spieler (2-4)
   * @param {Position[]} startPositions — Startpositionen für jeden Spieler
   */
  init(playerCount, startPositions) {
    this.playerCount = playerCount;
    this.players = [];
    for (let i = 0; i < playerCount; i++) {
      this.players.push({
        index: i,
        name: `Spieler ${i + 1}`,
        color: PLAYER_COLORS[i],
        position: { x: startPositions[i].x, y: startPositions[i].y },
        alive: true,
        maxBombs: CONFIG.DEFAULT_MAX_BOMBS,
        explosionRange: CONFIG.DEFAULT_EXPLOSION_RANGE,
        speed: CONFIG.DEFAULT_SPEED,
        activeBombs: 0,
        moveCooldown: 0,
      });
    }
  },

  /**
   * Bewegt einen Spieler in eine Richtung, wenn möglich.
   * @param {number} index — Spieler-Index
   * @param {Direction} direction — Bewegungsrichtung
   * @param {BoardManager} board — Spielfeld
   * @param {object} bombs — Objekt mit hasBombAt(x, y) oder Array von Bomben
   * @returns {boolean} true wenn Bewegung erfolgreich
   */
  movePlayer(index, direction, board, bombs) {
    const player = this.players[index];
    if (!player || !player.alive) return false;

    const dx = direction === Direction.LEFT ? -1 : direction === Direction.RIGHT ? 1 : 0;
    const dy = direction === Direction.UP ? -1 : direction === Direction.DOWN ? 1 : 0;

    const targetX = player.position.x + dx;
    const targetY = player.position.y + dy;

    // Collision check: target must be walkable (FLOOR)
    if (!board.isWalkable(targetX, targetY)) return false;

    // Collision check: no bomb at target
    if (bombs && typeof bombs.hasBombAt === 'function') {
      if (bombs.hasBombAt(targetX, targetY)) return false;
    } else if (Array.isArray(bombs)) {
      const hasBomb = bombs.some(b => b.position.x === targetX && b.position.y === targetY);
      if (hasBomb) return false;
    }

    player.position.x = targetX;
    player.position.y = targetY;
    player.moveCooldown = CONFIG.BASE_MOVE_COOLDOWN / player.speed;
    return true;
  },

  /**
   * Markiert einen Spieler als eliminiert.
   * @param {number} index — Spieler-Index
   */
  eliminatePlayer(index) {
    const player = this.players[index];
    if (player) {
      player.alive = false;
    }
  },

  /**
   * Gibt alle lebenden Spieler zurück.
   * @returns {Player[]}
   */
  getAlivePlayers() {
    return this.players.filter(p => p.alive);
  },

  /**
   * Prüft die Gewinnbedingung.
   * @returns {GameResult | null} — Ergebnis oder null wenn Spiel weitergeht
   */
  checkWinCondition() {
    const alive = this.getAlivePlayers();
    if (alive.length === 1) {
      return { winner: alive[0].index, isDraw: false };
    }
    if (alive.length === 0) {
      return { winner: null, isDraw: true };
    }
    return null;
  },

  /**
   * Update-Methode pro Frame.
   * @param {PlayerInput[]} inputs — Eingaben der Spieler
   * @param {number} deltaTime — Vergangene Zeit in ms
   * @param {BoardManager} board — Spielfeld
   * @param {object} bombs — BombManager oder Array
   */
  update(inputs, deltaTime, board, bombs) {
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (!player.alive) continue;

      // Decrease moveCooldown
      player.moveCooldown = Math.max(0, player.moveCooldown - deltaTime);

      // Process input if available
      if (inputs && inputs[i]) {
        const input = inputs[i];
        if (input.direction && player.moveCooldown <= 0) {
          this.movePlayer(i, input.direction, board, bombs);
        }
        // placeBomb will be handled later by BombManager
      }
    }
  },
};

// ============================================================
// BombManager — Bomben-Countdown, Explosionsberechnung, Kettenreaktionen
// ============================================================

const BombManager = {
  bombs: [],
  explosions: [],

  /**
   * Platziert eine Bombe auf der Spielerposition.
   * @param {Player} player — Der Spieler, der die Bombe platziert
   * @returns {boolean} true wenn Bombe platziert wurde
   */
  placeBomb(player) {
    if (!player || !player.alive) return false;
    if (player.activeBombs >= player.maxBombs) return false;

    // Check if there's already a bomb at the player's position
    if (this.hasBombAt(player.position.x, player.position.y)) return false;

    this.bombs.push({
      position: { x: player.position.x, y: player.position.y },
      ownerIndex: player.index,
      timer: CONFIG.BOMB_TIMER,
      range: player.explosionRange,
    });

    player.activeBombs++;
    return true;
  },

  /**
   * Aktualisiert Bomben-Timer und Explosions-Timer.
   * @param {number} deltaTime — Vergangene Zeit in ms
   * @param {BoardManager} board — Spielfeld
   * @param {PlayerManager} playerManager — Spielerverwaltung
   */
  update(deltaTime, board, playerManager) {
    // Decrease explosion timers and remove expired explosions FIRST
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      this.explosions[i].timer -= deltaTime;
      if (this.explosions[i].timer <= 0) {
        this.explosions.splice(i, 1);
      }
    }

    // Decrease bomb timers and collect bombs to detonate
    const toDetonate = [];
    for (const bomb of this.bombs) {
      bomb.timer -= deltaTime;
      if (bomb.timer <= 0) {
        toDetonate.push(bomb);
      }
    }

    // Detonate expired bombs
    for (const bomb of toDetonate) {
      // Only detonate if bomb is still in the array (might have been chain-detonated)
      if (this.bombs.includes(bomb)) {
        this.detonate(bomb, board, playerManager);
      }
    }
  },

  /**
   * Detoniert eine Bombe: berechnet Explosion, zerstört Wände, eliminiert Spieler.
   * @param {Bomb} bomb — Die zu detonierende Bombe
   * @param {BoardManager} board — Spielfeld
   * @param {PlayerManager} playerManager — Spielerverwaltung
   */
  detonate(bomb, board, playerManager) {
    // Remove bomb from array FIRST (prevents infinite chain loops)
    const bombIndex = this.bombs.indexOf(bomb);
    if (bombIndex !== -1) {
      this.bombs.splice(bombIndex, 1);
    }

    // Decrement owner's activeBombs
    if (playerManager && playerManager.players) {
      const owner = playerManager.players[bomb.ownerIndex];
      if (owner) {
        owner.activeBombs = Math.max(0, owner.activeBombs - 1);
      }
    }

    // Calculate explosion cells
    const cells = this.calculateExplosionCells(bomb.position, bomb.range, board);

    // Create explosion visual
    this.explosions.push({
      cells: cells,
      timer: CONFIG.EXPLOSION_DURATION,
    });

    // Destroy walls on explosion cells
    for (const cell of cells) {
      if (board.getCell(cell.x, cell.y) === CellType.WALL_DESTRUCTIBLE) {
        board.destroyWall(cell.x, cell.y);
      }
    }

    // Eliminate players on explosion cells
    if (playerManager && playerManager.players) {
      for (const player of playerManager.players) {
        if (!player.alive) continue;
        for (const cell of cells) {
          if (player.position.x === cell.x && player.position.y === cell.y) {
            playerManager.eliminatePlayer(player.index);
            break;
          }
        }
      }
    }

    // Chain explosions: check if any remaining bomb is on an explosion cell
    for (const cell of cells) {
      const chainBomb = this.bombs.find(
        b => b.position.x === cell.x && b.position.y === cell.y
      );
      if (chainBomb) {
        this.detonate(chainBomb, board, playerManager);
      }
    }
  },

  /**
   * Berechnet die von einer Explosion betroffenen Zellen.
   * @param {Position} position — Zentrum der Explosion
   * @param {number} range — Reichweite der Explosion
   * @param {BoardManager} board — Spielfeld
   * @returns {Position[]} Betroffene Zellen
   */
  calculateExplosionCells(position, range, board) {
    const cells = [{ x: position.x, y: position.y }];

    const directions = [
      { dx: 0, dy: -1 }, // UP
      { dx: 0, dy: 1 },  // DOWN
      { dx: -1, dy: 0 }, // LEFT
      { dx: 1, dy: 0 },  // RIGHT
    ];

    for (const dir of directions) {
      for (let i = 1; i <= range; i++) {
        const nx = position.x + dir.dx * i;
        const ny = position.y + dir.dy * i;
        const cellType = board.getCell(nx, ny);

        if (cellType === CellType.WALL_INDESTRUCTIBLE) {
          // Stop, cell NOT affected
          break;
        }

        if (cellType === CellType.WALL_DESTRUCTIBLE) {
          // Cell IS affected, but stop after this
          cells.push({ x: nx, y: ny });
          break;
        }

        // Check for another bomb at this position — trigger chain, stop
        const bombAtCell = this.bombs.find(
          b => b.position.x === nx && b.position.y === ny
        );
        if (bombAtCell) {
          cells.push({ x: nx, y: ny });
          break;
        }

        // Otherwise, add cell
        cells.push({ x: nx, y: ny });
      }
    }

    return cells;
  },

  /**
   * Prüft ob an Position (x, y) eine Bombe liegt.
   */
  hasBombAt(x, y) {
    return this.bombs.some(b => b.position.x === x && b.position.y === y);
  },

  /**
   * Prüft ob an Position (x, y) eine Explosion aktiv ist.
   */
  isExplosionAt(x, y) {
    return this.explosions.some(e =>
      e.cells.some(c => c.x === x && c.y === y)
    );
  },
};

// ============================================================
// PowerUpManager — Power-Up-Erzeugung und -Einsammlung
// ============================================================

const PowerUpManager = {
  powerUps: [],

  /**
   * Erzeugt mit 30% Chance ein zufälliges Power-Up an der gegebenen Position.
   * @param {Position} position — Position der zerstörten Wand
   */
  spawnPowerUp(position) {
    if (Math.random() >= CONFIG.POWERUP_SPAWN_CHANCE) return;

    const types = [PowerUpType.EXTRA_BOMB, PowerUpType.BIGGER_EXPLOSION, PowerUpType.SPEED];
    const type = types[Math.floor(Math.random() * types.length)];

    this.powerUps.push({
      position: { x: position.x, y: position.y },
      type,
    });
  },

  /**
   * Sammelt ein Power-Up an der gegebenen Position ein und wendet den Effekt an.
   * @param {Position} position — Position des Spielers
   * @param {Player} player — Der Spieler, der das Power-Up einsammelt
   * @returns {boolean} true wenn ein Power-Up eingesammelt wurde
   */
  collectPowerUp(position, player) {
    const index = this.powerUps.findIndex(
      p => p.position.x === position.x && p.position.y === position.y
    );
    if (index === -1) return false;

    const powerUp = this.powerUps[index];
    this.powerUps.splice(index, 1);

    switch (powerUp.type) {
      case PowerUpType.EXTRA_BOMB:
        player.maxBombs += 1;
        break;
      case PowerUpType.BIGGER_EXPLOSION:
        player.explosionRange += 1;
        break;
      case PowerUpType.SPEED:
        player.speed += CONFIG.SPEED_INCREMENT;
        break;
    }

    return true;
  },

  /**
   * Entfernt ein Power-Up an der gegebenen Position (z.B. durch Explosion zerstört).
   * @param {Position} position — Position des zu entfernenden Power-Ups
   */
  removePowerUp(position) {
    const index = this.powerUps.findIndex(
      p => p.position.x === position.x && p.position.y === position.y
    );
    if (index !== -1) {
      this.powerUps.splice(index, 1);
    }
  },

  /**
   * Gibt das Power-Up an Position (x, y) zurück, oder null.
   * @param {number} x
   * @param {number} y
   * @returns {PowerUp | null}
   */
  getPowerUpAt(x, y) {
    return this.powerUps.find(p => p.position.x === x && p.position.y === y) || null;
  },
};

// ============================================================
// InputManager — Tastatureingaben erfassen und zuordnen
// ============================================================

const InputManager = {
  keyStates: new Map(),
  playerCount: 2,
  keyBindings: [
    { up: 'w', down: 's', left: 'a', right: 'd', bomb: ' ' },
    { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', bomb: 'Enter' },
    { up: 'i', down: 'k', left: 'j', right: 'l', bomb: 'u' },
    { up: '8', down: '5', left: '4', right: '6', bomb: '0' },
  ],

  init(playerCount) {
    this.keyStates = new Map();
    this.playerCount = Math.max(CONFIG.MIN_PLAYER_COUNT, Math.min(CONFIG.MAX_PLAYER_COUNT, playerCount));
  },

  handleKeyDown(key) {
    this.keyStates.set(key, true);
  },

  handleKeyUp(key) {
    this.keyStates.set(key, false);
  },

  isKeyDown(key) {
    return this.keyStates.get(key) === true;
  },

  setPlayerCount(count) {
    this.playerCount = Math.max(CONFIG.MIN_PLAYER_COUNT, Math.min(CONFIG.MAX_PLAYER_COUNT, count));
  },

  poll() {
    const inputs = [];
    for (let i = 0; i < this.playerCount; i++) {
      const bindings = this.keyBindings[i];
      let direction = null;
      if (this.isKeyDown(bindings.up)) direction = Direction.UP;
      else if (this.isKeyDown(bindings.down)) direction = Direction.DOWN;
      else if (this.isKeyDown(bindings.left)) direction = Direction.LEFT;
      else if (this.isKeyDown(bindings.right)) direction = Direction.RIGHT;

      inputs.push({
        direction,
        placeBomb: this.isKeyDown(bindings.bomb),
      });
    }
    return inputs;
  },
};

// ============================================================
// GameState — Zentraler Spielzustand und Phasenübergänge
// ============================================================

const GameState = {
  phase: GamePhase.STARTSCREEN,
  playerCount: CONFIG.DEFAULT_PLAYER_COUNT,
  board: [],
  players: [],
  bombs: [],
  explosions: [],
  powerUps: [],
  roundResult: null,
  roundEndTimer: 0,
  selectedPlayerCount: CONFIG.DEFAULT_PLAYER_COUNT,

  /**
   * Startet eine neue Runde mit der gegebenen Spieleranzahl.
   * @param {number} playerCount — Anzahl der Spieler (2, 3 oder 4)
   */
  startRound(playerCount) {
    const count = Math.max(CONFIG.MIN_PLAYER_COUNT, Math.min(CONFIG.MAX_PLAYER_COUNT, playerCount));
    this.playerCount = count;
    this.phase = GamePhase.PLAYING;
    this.roundResult = null;
    this.roundEndTimer = 0;

    // Generate board
    this.board = BoardManager.generate(count);

    // Initialize players
    const startPositions = CONFIG.getStartPositions(count);
    PlayerManager.init(count, startPositions);
    this.players = PlayerManager.players;

    // Reset bombs and explosions
    BombManager.bombs = [];
    BombManager.explosions = [];
    this.bombs = BombManager.bombs;
    this.explosions = BombManager.explosions;

    // Reset power-ups
    PowerUpManager.powerUps = [];
    this.powerUps = PowerUpManager.powerUps;

    // Initialize input manager
    InputManager.init(count);
  },

  /**
   * Beendet die aktuelle Runde und wechselt zur ROUND_END-Phase.
   * @param {GameResult} result — Spielergebnis
   */
  endRound(result) {
    this.phase = GamePhase.ROUND_END;
    this.roundResult = result;
    this.roundEndTimer = CONFIG.ROUND_END_DISPLAY_TIME;
  },

  /**
   * Aktualisiert den Spielzustand pro Frame.
   * @param {number} deltaTime — Vergangene Zeit in ms
   */
  update(deltaTime) {
    if (this.phase === GamePhase.ROUND_END) {
      this.roundEndTimer -= deltaTime;
      if (this.roundEndTimer <= 0) {
        this.phase = GamePhase.STARTSCREEN;
        this.roundResult = null;
      }
      return;
    }

    if (this.phase !== GamePhase.PLAYING) {
      return;
    }

    // 1. Get inputs
    const inputs = InputManager.poll();

    // 2. Process bomb placement from inputs
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].placeBomb && PlayerManager.players[i] && PlayerManager.players[i].alive) {
        BombManager.placeBomb(PlayerManager.players[i]);
      }
    }

    // 3. Update PlayerManager (movement via inputs)
    PlayerManager.update(inputs, deltaTime, BoardManager, BombManager);

    // 4. Update BombManager (countdown, detonation)
    // Track walls before detonation to detect newly destroyed walls
    const wallsBefore = [];
    for (let y = 0; y < CONFIG.BOARD_HEIGHT; y++) {
      for (let x = 0; x < CONFIG.BOARD_WIDTH; x++) {
        if (BoardManager.getCell(x, y) === CellType.WALL_DESTRUCTIBLE) {
          wallsBefore.push({ x, y });
        }
      }
    }

    const explosionCountBefore = BombManager.explosions.length;
    BombManager.update(deltaTime, BoardManager, PlayerManager);

    // 5. Collect cells from NEW explosions created this frame
    const newExplosionCells = new Set();
    for (let i = explosionCountBefore; i < BombManager.explosions.length; i++) {
      for (const cell of BombManager.explosions[i].cells) {
        newExplosionCells.add(`${cell.x},${cell.y}`);
      }
    }

    // 6. Destroy existing power-ups hit by NEW explosions only
    for (const key of newExplosionCells) {
      const [cx, cy] = key.split(',').map(Number);
      if (PowerUpManager.getPowerUpAt(cx, cy)) {
        PowerUpManager.removePowerUp({ x: cx, y: cy });
      }
    }

    // 7. Spawn NEW power-ups on destroyed walls
    for (const wall of wallsBefore) {
      if (BoardManager.getCell(wall.x, wall.y) === CellType.FLOOR) {
        // Wall was destroyed — try to spawn a power-up
        PowerUpManager.spawnPowerUp(wall);
      }
    }

    // 8. Check for power-up collection (player on cell with power-up)
    for (const player of PlayerManager.players) {
      if (!player.alive) continue;
      PowerUpManager.collectPowerUp(player.position, player);
    }

    // 9. Sync references
    this.board = BoardManager.grid;
    this.players = PlayerManager.players;
    this.bombs = BombManager.bombs;
    this.explosions = BombManager.explosions;
    this.powerUps = PowerUpManager.powerUps;

    // 10. Check win condition
    const result = PlayerManager.checkWinCondition();
    if (result) {
      this.endRound(result);
    }
  },
};

// ============================================================
// GameLoop — Spielschleife, Delta-Time, Phasensteuerung
// ============================================================

const GameLoop = {
  lastTimestamp: 0,
  _intervalId: null,

  /**
   * Initialisiert und startet die Spielschleife.
   * Verwendet requestAnimationFrame wenn verfügbar, sonst setInterval als Fallback.
   */
  start() {
    this.lastTimestamp = 0;

    const hasWindow = typeof window !== 'undefined';
    const hasRAF = hasWindow && typeof window.requestAnimationFrame === 'function';

    if (hasRAF) {
      const loop = (timestamp) => {
        this.tick(timestamp);
        window.requestAnimationFrame(loop);
      };
      window.requestAnimationFrame(loop);
    } else if (hasWindow) {
      // Fallback: setInterval at ~30 FPS
      const startTime = Date.now();
      this._intervalId = setInterval(() => {
        const timestamp = Date.now() - startTime;
        this.tick(timestamp);
      }, CONFIG.FALLBACK_INTERVAL);
    }
  },

  /**
   * Ein Frame: Delta-Time berechnen, GameState aktualisieren, Renderer zeichnen.
   * @param {number} timestamp — Aktueller Zeitstempel in ms
   */
  tick(timestamp) {
    // On first frame, just set lastTimestamp and skip
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
      return;
    }

    let deltaTime = timestamp - this.lastTimestamp;
    // Cap at 100ms to prevent spiral of death
    if (deltaTime > 100) {
      deltaTime = 100;
    }

    this.lastTimestamp = timestamp;

    // Update game logic
    GameState.update(deltaTime);

    // Render if Renderer exists
    if (typeof Renderer !== 'undefined' && Renderer && typeof Renderer.draw === 'function') {
      Renderer.draw(GameState);
    }
  },

  /**
   * Startet eine neue Runde — delegiert an GameState.
   * @param {number} playerCount — Anzahl der Spieler (2, 3 oder 4)
   */
  startRound(playerCount) {
    GameState.startRound(playerCount);
  },

  /**
   * Beendet die aktuelle Runde — delegiert an GameState.
   * @param {GameResult} result — Spielergebnis
   */
  endRound(result) {
    GameState.endRound(result);
  },
};

// ============================================================
// Renderer — Canvas-Zeichnung, Animationen, UI, Status-Panels
// ============================================================

const PLAYER_COLORS_ARRAY = [Color.RED, Color.YELLOW, Color.GREEN, Color.BLUE];

const POWERUP_COLORS = {
  [PowerUpType.EXTRA_BOMB]: '#9C27B0',
  [PowerUpType.BIGGER_EXPLOSION]: '#FF5722',
  [PowerUpType.SPEED]: '#00BCD4',
};

const POWERUP_LABELS = {
  [PowerUpType.EXTRA_BOMB]: 'B',
  [PowerUpType.BIGGER_EXPLOSION]: 'E',
  [PowerUpType.SPEED]: 'S',
};

const Renderer = {
  canvas: null,
  ctx: null,
  cellSize: 50,
  _clickHandler: null,
  _resizeHandler: null,

  init(canvas) {
    this.canvas = canvas;
    if (canvas && typeof canvas.getContext === 'function') {
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
    }
    this.calculateCellSize();

    // Set up resize listener
    if (typeof window !== 'undefined') {
      this._resizeHandler = () => this.calculateCellSize();
      window.addEventListener('resize', this._resizeHandler);
    }
  },

  calculateCellSize() {
    if (!this.canvas) return 50;
    const hasWindow = typeof window !== 'undefined';
    const winW = hasWindow ? window.innerWidth : 1024;
    const winH = hasWindow ? window.innerHeight : 768;

    // Reserve space for status panel (~250px) and padding
    const availW = Math.max(400, winW - 300);
    const availH = Math.max(300, winH - 40);

    const cellW = Math.floor(availW / CONFIG.BOARD_WIDTH);
    const cellH = Math.floor(availH / CONFIG.BOARD_HEIGHT);
    this.cellSize = Math.max(30, Math.min(cellW, cellH));

    if (this.canvas) {
      this.canvas.width = this.cellSize * CONFIG.BOARD_WIDTH;
      this.canvas.height = this.cellSize * CONFIG.BOARD_HEIGHT;
    }
    return this.cellSize;
  },

  draw(gameState) {
    if (!this.ctx) return;

    if (gameState.phase === GamePhase.STARTSCREEN) {
      this.drawStartScreen(gameState.selectedPlayerCount);
    } else if (gameState.phase === GamePhase.PLAYING) {
      this.drawBoard(gameState.board);
      this.drawPowerUps(gameState.powerUps);
      this.drawBombs(gameState.bombs);
      this.drawExplosions(gameState.explosions);
      this.drawPlayers(gameState.players);
      this.updateStatusPanels(gameState.players);
    } else if (gameState.phase === GamePhase.ROUND_END) {
      this.drawBoard(gameState.board);
      this.drawPowerUps(gameState.powerUps);
      this.drawBombs(gameState.bombs);
      this.drawExplosions(gameState.explosions);
      this.drawPlayers(gameState.players);
      this.drawRoundEnd(gameState.roundResult);
      this.updateStatusPanels(gameState.players);
    }
  },

  drawBoard(board) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    if (!ctx || !board || !board.length) return;

    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const cell = board[y][x];
        const px = x * cs;
        const py = y * cs;

        if (cell === CellType.WALL_INDESTRUCTIBLE) {
          ctx.fillStyle = '#424242';
        } else if (cell === CellType.WALL_DESTRUCTIBLE) {
          ctx.fillStyle = '#8D6E63';
        } else {
          ctx.fillStyle = '#8BC34A';
        }
        ctx.fillRect(px, py, cs, cs);

        // Draw subtle grid lines
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, cs, cs);

        // Pixel-style 3D effect for walls
        if (cell === CellType.WALL_INDESTRUCTIBLE) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(px, py, cs, 2);
          ctx.fillRect(px, py, 2, cs);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(px, py + cs - 2, cs, 2);
          ctx.fillRect(px + cs - 2, py, 2, cs);
        } else if (cell === CellType.WALL_DESTRUCTIBLE) {
          // Pixel brick pattern — pronounced grid
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(px, py, cs, 2);
          ctx.fillRect(px, py, 2, cs);

          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 1;
          // Horizontal mortar lines
          const rowH = Math.floor(cs / 3);
          for (let r = 1; r < 3; r++) {
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(px, py + r * rowH, cs, 1);
          }
          // Vertical mortar lines — offset every other row for brick pattern
          const colW = Math.floor(cs / 2);
          for (let r = 0; r < 3; r++) {
            const offset = (r % 2 === 0) ? 0 : colW / 2;
            for (let c = 1; c <= 2; c++) {
              const lx = px + offset + c * colW;
              if (lx > px && lx < px + cs) {
                ctx.fillStyle = 'rgba(0,0,0,0.25)';
                ctx.fillRect(Math.floor(lx), py + r * rowH, 1, rowH);
              }
            }
          }
        }
      }
    }
  },

  drawPlayers(players) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    if (!ctx || !players) return;

    for (const player of players) {
      if (!player.alive) continue;
      const px = player.position.x * cs;
      const py = player.position.y * cs;
      const margin = Math.floor(cs * 0.12);
      const size = cs - margin * 2;

      // Shadow (offset square)
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(px + margin + 2, py + margin + 2, size, size);

      // Body (filled square)
      ctx.fillStyle = player.color;
      ctx.fillRect(px + margin, py + margin, size, size);

      // 2px darker border for depth
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + margin, py + margin, size, size);

      // Pixel eyes — two small white squares with black pupils
      const eyeSize = Math.max(2, Math.floor(cs * 0.08));
      const pupilSize = Math.max(2, Math.floor(cs * 0.05));
      const eyeY = py + margin + Math.floor(size * 0.3);
      const leftEyeX = px + margin + Math.floor(size * 0.25);
      const rightEyeX = px + margin + Math.floor(size * 0.6);

      ctx.fillStyle = '#fff';
      ctx.fillRect(leftEyeX, eyeY, eyeSize, eyeSize);
      ctx.fillRect(rightEyeX, eyeY, eyeSize, eyeSize);

      ctx.fillStyle = '#000';
      ctx.fillRect(leftEyeX + 1, eyeY + 1, pupilSize, pupilSize);
      ctx.fillRect(rightEyeX + 1, eyeY + 1, pupilSize, pupilSize);
    }
  },

  drawBombs(bombs) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    if (!ctx || !bombs) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    for (const bomb of bombs) {
      const px = bomb.position.x * cs;
      const py = bomb.position.y * cs;

      // Pulsing animation — size change
      const pulse = 1 + 0.15 * Math.sin(now * 0.008);
      const bombSize = Math.floor(cs * 0.64 * pulse);
      const offset = Math.floor((cs - bombSize) / 2);

      // Bomb body (square)
      ctx.fillStyle = '#212121';
      ctx.fillRect(px + offset, py + offset, bombSize, bombSize);

      // Highlight (small rect top-left)
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      const hlSize = Math.floor(bombSize * 0.25);
      ctx.fillRect(px + offset + 2, py + offset + 2, hlSize, hlSize);

      // Fuse (rectangular line on top)
      const fuseW = Math.max(2, Math.floor(cs * 0.06));
      const fuseH = Math.floor(cs * 0.2);
      const fuseMidX = px + Math.floor(cs / 2) - Math.floor(fuseW / 2);
      ctx.fillStyle = '#FF9800';
      ctx.fillRect(fuseMidX, py + offset - fuseH, fuseW, fuseH);

      // Spark at tip of fuse
      const sparkPulse = 0.5 + 0.5 * Math.sin(now * 0.015);
      ctx.fillStyle = `rgba(255, 200, 0, ${sparkPulse})`;
      const sparkSize = Math.max(2, Math.floor(cs * 0.08));
      ctx.fillRect(fuseMidX - 1, py + offset - fuseH - sparkSize, sparkSize, sparkSize);
    }
  },

  drawExplosions(explosions) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    if (!ctx || !explosions) return;

    for (const explosion of explosions) {
      // Fade based on remaining timer
      const alpha = Math.max(0, Math.min(1, explosion.timer / CONFIG.EXPLOSION_DURATION));

      for (const cell of explosion.cells) {
        const x = cell.x * cs;
        const y = cell.y * cs;

        // Orange explosion with fade
        ctx.fillStyle = `rgba(255, 152, 0, ${alpha * 0.8})`;
        ctx.fillRect(x, y, cs, cs);

        // Cross/plus pattern for retro feel
        const armW = Math.floor(cs * 0.3);
        const armOffset = Math.floor((cs - armW) / 2);
        ctx.fillStyle = `rgba(255, 235, 59, ${alpha * 0.7})`;
        // Horizontal bar
        ctx.fillRect(x, y + armOffset, cs, armW);
        // Vertical bar
        ctx.fillRect(x + armOffset, y, armW, cs);

        // White hot center square
        const centerSize = Math.floor(cs * 0.3);
        const centerOffset = Math.floor((cs - centerSize) / 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.fillRect(x + centerOffset, y + centerOffset, centerSize, centerSize);
      }
    }
  },

  drawPowerUps(powerUps) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    if (!ctx || !powerUps) return;

    for (const pu of powerUps) {
      const px = pu.position.x * cs;
      const py = pu.position.y * cs;
      const margin = Math.floor(cs * 0.2);
      const size = cs - margin * 2;

      const color = POWERUP_COLORS[pu.type] || '#9C27B0';
      const label = POWERUP_LABELS[pu.type] || '?';

      // Background square
      ctx.fillStyle = color;
      ctx.fillRect(px + margin, py + margin, size, size);

      // White border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + margin, py + margin, size, size);

      // Label (pixel font style)
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.floor(cs * 0.35)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, px + cs / 2, py + cs / 2);
    }
  },

  drawStartScreen(selectedPlayerCount) {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;
    ctx.imageSmoothingEnabled = false;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Title (blocky monospace font)
    ctx.fillStyle = '#FF9800';
    ctx.font = `bold ${Math.floor(h * 0.12)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Boomerboy', w / 2, h * 0.22);

    // Subtitle
    ctx.fillStyle = '#aaa';
    ctx.font = `${Math.floor(h * 0.035)}px monospace`;
    ctx.fillText('Retro Pixel Multiplayer', w / 2, h * 0.32);

    // Player count label
    ctx.fillStyle = '#e0e0e0';
    ctx.font = `${Math.floor(h * 0.04)}px monospace`;
    ctx.fillText('Spieleranzahl:', w / 2, h * 0.44);

    // Player count buttons (2, 3, 4)
    const btnW = Math.floor(w * 0.12);
    const btnH = Math.floor(h * 0.08);
    const btnY = Math.floor(h * 0.50);
    const gap = Math.floor(w * 0.04);
    const totalW = btnW * 3 + gap * 2;
    const startX = (w - totalW) / 2;

    this._playerCountButtons = [];
    for (let i = 0; i < 3; i++) {
      const count = i + 2;
      const bx = startX + i * (btnW + gap);
      const by = btnY;

      const isSelected = count === selectedPlayerCount;
      ctx.fillStyle = isSelected ? '#FF9800' : '#16213e';
      ctx.strokeStyle = isSelected ? '#FF9800' : '#555';
      ctx.lineWidth = 2;

      // Rounded rect
      this._roundRect(ctx, bx, by, btnW, btnH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSelected ? '#000' : '#e0e0e0';
      ctx.font = `bold ${Math.floor(h * 0.05)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(count), bx + btnW / 2, by + btnH / 2);

      this._playerCountButtons.push({ x: bx, y: by, w: btnW, h: btnH, count });
    }

    // Start button
    const sBtnW = Math.floor(w * 0.3);
    const sBtnH = Math.floor(h * 0.09);
    const sBtnX = (w - sBtnW) / 2;
    const sBtnY = Math.floor(h * 0.65);

    ctx.fillStyle = '#4CAF50';
    ctx.strokeStyle = '#388E3C';
    ctx.lineWidth = 2;
    this._roundRect(ctx, sBtnX, sBtnY, sBtnW, sBtnH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(h * 0.05)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Start', w / 2, sBtnY + sBtnH / 2);

    this._startButton = { x: sBtnX, y: sBtnY, w: sBtnW, h: sBtnH };

    // NumLock hint for 4 players
    if (selectedPlayerCount === 4) {
      ctx.fillStyle = '#FF9800';
      ctx.font = `${Math.floor(h * 0.03)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('Hinweis: NumLock muss aktiviert sein für Spieler 4', w / 2, h * 0.82);
    }

    // Controls info
    ctx.fillStyle = '#666';
    ctx.font = `${Math.floor(h * 0.025)}px monospace`;
    ctx.textAlign = 'center';
    const infoY = h * 0.90;
    ctx.fillText('P1: WASD + Leertaste | P2: Pfeiltasten + Enter | P3: IJKL + U | P4: Numpad', w / 2, infoY);
  },

  drawRoundEnd(result) {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);

    // Result text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (result && result.isDraw) {
      ctx.fillStyle = '#FF9800';
      ctx.font = `bold ${Math.floor(h * 0.1)}px monospace`;
      ctx.fillText('Unentschieden!', w / 2, h * 0.4);
    } else if (result && result.winner !== null && result.winner !== undefined) {
      const winnerColor = PLAYER_COLORS_ARRAY[result.winner] || '#fff';
      ctx.fillStyle = winnerColor;
      ctx.font = `bold ${Math.floor(h * 0.1)}px monospace`;
      ctx.fillText(`Spieler ${result.winner + 1} gewinnt!`, w / 2, h * 0.4);
    }

    // Timer hint
    ctx.fillStyle = '#aaa';
    ctx.font = `${Math.floor(h * 0.04)}px monospace`;
    ctx.fillText('Zurück zum Startbildschirm...', w / 2, h * 0.55);
  },

  updateStatusPanels(players) {
    if (typeof document === 'undefined') return;
    if (!players) return;

    for (let i = 0; i < 4; i++) {
      const panel = document.getElementById(`panel-player-${i}`);
      if (!panel) continue;

      if (i >= players.length) {
        panel.style.display = 'none';
        continue;
      }

      panel.style.display = '';
      const player = players[i];

      // Update status text
      const statusEl = panel.querySelector('.player-status');
      if (statusEl) {
        statusEl.textContent = player.alive ? 'Aktiv' : 'Eliminiert';
      }

      // Add/remove eliminated class
      if (player.alive) {
        panel.classList.remove('eliminated');
      } else {
        panel.classList.add('eliminated');
      }

      // Update power-ups display
      const puContainer = panel.querySelector('.player-powerups');
      if (puContainer) {
        puContainer.innerHTML = '';

        // Show current stats as badges
        if (player.maxBombs > CONFIG.DEFAULT_MAX_BOMBS) {
          const badge = document.createElement('span');
          badge.className = 'powerup-badge';
          badge.style.borderLeft = `3px solid ${POWERUP_COLORS[PowerUpType.EXTRA_BOMB]}`;
          badge.textContent = `💣×${player.maxBombs}`;
          puContainer.appendChild(badge);
        }
        if (player.explosionRange > CONFIG.DEFAULT_EXPLOSION_RANGE) {
          const badge = document.createElement('span');
          badge.className = 'powerup-badge';
          badge.style.borderLeft = `3px solid ${POWERUP_COLORS[PowerUpType.BIGGER_EXPLOSION]}`;
          badge.textContent = `💥${player.explosionRange}`;
          puContainer.appendChild(badge);
        }
        if (player.speed > CONFIG.DEFAULT_SPEED + 0.01) {
          const badge = document.createElement('span');
          badge.className = 'powerup-badge';
          badge.style.borderLeft = `3px solid ${POWERUP_COLORS[PowerUpType.SPEED]}`;
          badge.textContent = `⚡${player.speed.toFixed(1)}`;
          puContainer.appendChild(badge);
        }
      }
    }
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

  handleCanvasClick(mouseX, mouseY, gameState) {
    if (!gameState || gameState.phase !== GamePhase.STARTSCREEN) return;

    // Check player count buttons
    if (this._playerCountButtons) {
      for (const btn of this._playerCountButtons) {
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
            mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          gameState.selectedPlayerCount = btn.count;
          return;
        }
      }
    }

    // Check start button
    if (this._startButton) {
      const sb = this._startButton;
      if (mouseX >= sb.x && mouseX <= sb.x + sb.w &&
          mouseY >= sb.y && mouseY <= sb.y + sb.h) {
        gameState.startRound(gameState.selectedPlayerCount);
      }
    }
  },
};

export { GamePhase, CellType, Direction, PowerUpType, Color, CONFIG, BoardManager, PlayerManager, BombManager, PowerUpManager, InputManager, GameState, GameLoop, Renderer };
