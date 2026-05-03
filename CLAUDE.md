# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Hva dette er

Nettleserbasert arkade-kiosk til Andreas konfirmasjon, designet for å kjøre på en Raspberry Pi 5 i Chromium kiosk-mode. UI er på **norsk**, estetikk er kawaii/emoji. Ikke et produksjonssystem — foretrekk enkle løsninger. Gjester fra 6 år og oppover.

## Kommandoer

```bash
npm install                      # installer (npm workspaces: web + server)
npm run dev                      # kjør web (Vite, :5173) og server (tsx watch, :3000) parallelt
npm --workspace web run dev      # bare frontend
npm --workspace server run dev   # bare backend
npm run build                    # tsc --noEmit + vite build, deretter tsc for server
npm start                        # kjør bygget server (serverer web/dist + API)
docker compose up -d --build     # Docker: ett image som serverer alt på :3000
```

Det finnes ingen testsuite. `npm --workspace web run build` kjører `tsc --noEmit` som typecheck.

SQLite-filen ligger i `./data/arcade.db` lokalt (Docker-volum `arcade-data` → `/data/arcade.db`).

## Arkitektur

**Monorepo (npm workspaces):**
- `web/` — Phaser 3 + TypeScript + Vite. Frontend er et Phaser-spill med flere scener.
- `server/` — Fastify + better-sqlite3 + Zod. Serverer `/api/*` og (i prod) statisk `web/dist`.
- `Dockerfile` bygger begge og kjører én Node-prosess som gjør begge deler.

**Scene-flyt i Phaser** (`web/src/main.ts` + `web/src/scenes/`): `BootScene` → `MenuScene` → `StoryScene` (intro + kontroller) → `<Game>Scene` → `GameOverScene` → `NameEntryScene` (hvis top-10) → `HighscoreScene` → `MenuScene`.

**Spill-registrering** — tre steder må oppdateres når et spill legges til/fjernes:
1. `web/src/games/<navn>/` med `<Navn>Scene.ts` og `index.ts` som eksporterer et `GameModule` (se `web/src/core/GameModule.ts`: `id`, `navn`, `emoji`, `undertittel`, `historie`, `kontroller`, `SceneClass`, `sceneKey`).
2. Legg modulen inn i `web/src/core/GameRegistry.ts`.
3. Legg `id` inn i `GAME_IDS`-whitelisten i `server/src/validation.ts` (Zod enum — deles mellom submit og lookup).

Meny, story-intro og highscore-ruting plukkes opp automatisk fra registeret.

**Delt spill-infrastruktur** i `web/src/core/`:
- `BaseGameScene` — alle spill arver denne. Gir HUD (emoji, nivå X/MAX, poeng, liv, pause), ESC→bekreft-til-meny, P→pause, og `addScore / setLevel / loseLife / gameOver / win / showLevelSplash`. Livsvisning styres med `showLives`-feltet.
- `LevelCurve.ts` — `MAX_LEVEL = 5` og `difficulty(level) = 1.55^(level-1)`. Alle spill skal ha 5 nivåer med stigende vanskelighet; bruk `difficulty()` som skalar.
- `Theme.ts`, `ui.ts` — felles farger/font og `makeText`-helper, slik at alt ser likt ut.
- `HighscoreClient.ts` — `GET /api/highscores/:gameId` og `POST /api/highscores`.

**Backend** (`server/src/`):
- `server.ts` — Fastify, rate limit 60/min (localhost unntatt), registrerer highscore-ruter, serverer `WEB_DIST` hvis den finnes, SPA-fallback til `index.html` for ikke-API.
- `db.ts` — én `scores`-tabell (`game_id, name, score, created_at`) + index på `(game_id, score DESC)`. WAL-mode. `getTop` returnerer topp 10; `insertScore` returnerer `{rank, isTop10}` ved å telle `score > this`.
- `validation.ts` — Zod: navn 1–12 tegn, unicode-bokstaver/tall/`_.-!?` tillatt; score heltall 0–10 000 000.

## Spillene (regler)

Alle spill har 5 nivåer, egne HUD-liv, ESC→meny, P→pause, og poeng går til én felles leaderboard per spill-id.

### Kaiser på rømmen 🐕 (`kaiser`)
Top-down jag. Spilleren (Andrea) beveger seg med **piltaster / WASD** i en hageverden. Kaiser (brun labrador) rømmer, og spilleren må **ta på Kaiser** for å fullføre nivået. Hindringer 🌳 og bier 🐝 tar liv (3 totalt). Powerups plukkes opp underveis:
- 🦴 fart-boost (+50 poeng)
- 🧃 ekstra liv (+30)
- 🍖 «kjøttmagnet» som drar Kaiser mot spilleren (+80)

Fullført nivå: `200 × level + (tid igjen × 10 × level)` poeng. Siste nivå gir +500 bonus.

### Slush-Kaos 🧋 (`slush`)
Arcade-catcher i slush-kiosk. Slushdråper i forskjellige farger faller automatisk fra aktive maskiner. Spilleren flytter begeret med **mus / A,D / ←,→** for å fange dråpene. Mål per nivå er `catchTarget` fanger; 150 × level bonus + 20 × level per fanget. Nok bom på gulvet → mister liv (3 totalt). Siste nivå: +500 vinnerbonus.

### Trampett-Triks 🤸 (`trampett`)
Rytme/timing. Andrea løper mot trampetten; **SPACE i den grønne sonen** gir hopp. I lufta brukes **←/→** for å rotere saltoen og **↓** for å bremse før landing. Juryen gir poeng basert på landing og halvspinn:
- Bommet/ingen input: 5p
- Delvis: `30 + halves × 20`
- Perfekt landing med nok rotasjon: opp mot `100 × level + halves × 50`, ellers `60 × level + halves × 30`

Bom på landing → mister liv. Siste nivå fullført: +500 bonus.

### Sykkel-Stress 🚴‍♀️ (`sykkel`)
Scrollende utvikerspill — sykkel over Vinges-brua. **← → eller A/D** for å styre mellom filer. Unngå andre syklister 🚴, gamle damer 👵, hunder 🐕, benker 🪑 og blomsterkasser 🌷 — treff gir tap av liv (3 totalt). Sank pickups for poeng: 🍎 eple (+40), 💧 vannflaske (+40), ⚡ lyn (fart-boost, +20). Passerte hindre gir +10. Fullført nivå: `200 + level × 100`. Siste nivå (kommer fram til treninga): +800 bonus.

## Konvensjoner

- **UI-språk: norsk.** Alle nye strenger skal være på norsk (bokmål), og gjerne med emoji der det passer estetisk.
- **Stier i TypeScript-imports bruker `.js`-suffiks** (NodeNext/ESM-stil), ikke `.ts`, f.eks. `from "./KaiserScene.js"`.
- **Phaser-scenenøkler**: bruk klassenavnet som `sceneKey` (f.eks. `"KaiserScene"`) — MenuScene starter via disse.
- **Highscore-submit** går gjennom `GameOverScene` → `NameEntryScene` automatisk hvis resultatet er top-10; spill trenger bare å kalle `gameOver(score)` / `win(score)` på `BaseGameScene`.
- Nye spill må arve `BaseGameScene` for å få HUD, pause/ESC-håndtering og scene-overganger riktig.
