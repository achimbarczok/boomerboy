# 💣 Boomerboy

Ein Retro-Pixel Arena-Spiel für 2–4 Spieler an einer geteilten Tastatur. Komplett in einer einzigen HTML-Datei gebaut — keine Abhängigkeiten, kein Build-Schritt, einfach öffnen und losspielen.

![Boomerboy Gameplay](screenshot/gameplay.png)

## 🎮 Spielen

`index.html` in einem beliebigen modernen Browser öffnen. Das war's.

## 🕹️ Steuerung

| Spieler | Bewegen | Bombe |
|---------|---------|-------|
| Spieler 1 (Rot) | W A S D | Leertaste |
| Spieler 2 (Gelb) | Pfeiltasten | Enter |
| Spieler 3 (Grün) | I J K L | U |
| Spieler 4 (Blau) | Numpad 8 4 5 6 | Numpad 0 |

> 💡 Spieler 4 benötigt aktiviertes NumLock.

## 📖 Spielanleitung

- Bomben platzieren, um Wände zu zerstören und Gegner zu eliminieren
- Power-Ups unter zerstörbaren Wänden einsammeln:
  - **B** (lila) — Zusätzliche Bombe
  - **E** (orange) — Größere Explosionsreichweite
  - **S** (cyan) — Geschwindigkeitsboost
- Der letzte überlebende Spieler gewinnt die Runde
- Werden alle verbleibenden Spieler gleichzeitig eliminiert, endet die Runde unentschieden

## 🛠️ Entwicklung

Die Spiellogik liegt in `src/game.js` (importierbares ES-Modul für Tests) und ist zusätzlich inline in `index.html` für den abhängigkeitsfreien Browser-Betrieb.

```bash
npm install        # Dev-Dependencies installieren (vitest, fast-check)
npm test           # Alle 165 Tests ausführen
```

### Technik

- Reines HTML5 Canvas — keine Frameworks, keine Bibliotheken
- Property-Based Testing mit [fast-check](https://github.com/dubzzz/fast-check)
- Test-Runner: [Vitest](https://vitest.dev)

## 🤖 Gebaut mit Kiro

Dieses Spiel wurde vollständig mit [Kiro](https://kiro.dev) entwickelt — von der Spec-Erstellung über die Implementierung bis hin zu den Property-Based Tests. Kiro ist eine KI-gestützte Entwicklungsumgebung, die Spec-Driven Development unterstützt: Anforderungen → Design → Aufgaben → Implementierung.

## 📄 Lizenz

MIT
