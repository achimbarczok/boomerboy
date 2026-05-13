<h1 align="center">💣Boomerboy</h1>

<p align="center">
  <strong>Retro Pixel Multiplayer Arena</strong><br>
  Ein lokales Multiplayer-Spiel für 2–4 Spieler an einer geteilten Tastatur. Reines HTML5 Canvas — eine Datei, keine Abhängigkeiten.<br>
  <sub>Gebaut mit <a href="https://kiro.dev">Kiro</a></sub><br>
  <sub><a href="README.md">🇬🇧 English Version</a></sub>
</p>

---

## Inhaltsverzeichnis

- [Spielen](#spielen)
- [Features](#features)
- [Steuerung](#steuerung)
- [Spielanleitung](#spielanleitung)
- [Entwicklung](#entwicklung)
- [Tests](#tests)
- [Technik](#technik)
- [Gebaut mit Kiro](#gebaut-mit-kiro)
- [Lizenz](#lizenz)

## Spielen

```
index.html im Browser öffnen. Fertig.
```

Kein Server, kein Build, keine Installation nötig. Funktioniert in jedem modernen Browser.

## Features

- 🎮 **2–4 Spieler** an einer Tastatur (lokaler Multiplayer)
- 💣 **Bomben, Kettenexplosionen** und zerstörbare Wände
- ⚡ **Power-Ups** (Extra-Bomben, größere Reichweite, Geschwindigkeit)
- 🎨 **Pixel-Art Retro-Grafik** mit HTML5 Canvas
- 📦 **Zero Dependencies** — eine einzige HTML-Datei
- 🔄 **Zufällig generierte Spielfelder** für jede Runde

## Steuerung

| Spieler | Bewegen | Bombe |
|---------|---------|-------|
| 🔴 Spieler 1 | `W` `A` `S` `D` | `Leertaste` |
| 🟡 Spieler 2 | `↑` `←` `↓` `→` | `Enter` |
| 🟢 Spieler 3 | `I` `J` `K` `L` | `U` |
| 🔵 Spieler 4 | `Num8` `Num4` `Num5` `Num6` | `Num0` |

> 💡 Spieler 4 benötigt aktiviertes NumLock.

## Spielanleitung

1. Spieleranzahl auf dem Startbildschirm wählen (2, 3 oder 4)
2. Bomben platzieren, um Wände zu zerstören und Gegner zu eliminieren
3. Power-Ups unter zerstörbaren Wänden einsammeln:
   - **B** (lila) — Zusätzliche Bombe
   - **E** (orange) — Größere Explosionsreichweite
   - **S** (cyan) — Geschwindigkeitsboost
4. Der letzte überlebende Spieler gewinnt die Runde
5. Bei gleichzeitiger Eliminierung aller Spieler → Unentschieden

## Entwicklung

Die Spiellogik liegt in `src/game.js` (importierbares ES-Modul für Tests) und ist zusätzlich inline in `index.html` für den abhängigkeitsfreien Browser-Betrieb.

```bash
npm install        # Dev-Dependencies installieren
npm test           # Alle Tests ausführen
npm run test:watch # Tests im Watch-Modus
```

### Projektstruktur

```
├── index.html          # Komplettes Spiel (spielbar ohne Build)
├── src/
│   └── game.js         # Spiellogik als ES-Modul (für Tests)
├── tests/
│   ├── board.test.js   # Spielfeld-Tests
│   ├── bomb.test.js    # Bomben-Tests
│   ├── player.test.js  # Spieler-Tests
│   ├── powerup.test.js # Power-Up-Tests
│   ├── input.test.js   # Eingabe-Tests
│   ├── gamestate.test.js # GameState-Tests
│   └── generators.js   # Shared fast-check Generatoren
├── screenshot/
│   └── gameplay.png
├── package.json
└── vitest.config.js
```

## Tests

165 Tests, davon 18 Property-Based Tests die universelle Korrektheitseigenschaften validieren.

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

## Technik

| Komponente | Technologie |
|-----------|-------------|
| Rendering | HTML5 Canvas (Pixel-Art, `imageSmoothingEnabled: false`) |
| Spiellogik | Vanilla JavaScript (ES Modules) |
| Spielschleife | `requestAnimationFrame` mit Delta-Time |
| Tests | [Vitest](https://vitest.dev) + [fast-check](https://github.com/dubzzz/fast-check) |
| Architektur | Single-File (inline) + modulare Testversion |

## Gebaut mit Kiro

Dieses Spiel wurde vollständig mit [Kiro](https://kiro.dev) entwickelt — einer KI-gestützten Entwicklungsumgebung, die Spec-Driven Development unterstützt. Der gesamte Prozess von Anforderungen über Design bis zur Implementierung und den Property-Based Tests wurde mit Kiro durchgeführt.

## Lizenz

[MIT](LICENSE)
