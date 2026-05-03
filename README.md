# Arkade-kiosk 🎮

Nettleserbasert arkade-kiosk for Andreas konfirmasjon. Fire mini-spill med topp-10 highscore, designet for Raspberry Pi 5 i kiosk-modus.

## Stack
- **Frontend:** Phaser 3 + TypeScript + Vite
- **Backend:** Node 22 + Fastify + better-sqlite3
- **Containerisering:** Ett Docker-image som serverer både web og API

## Kjør lokalt (dev)

```bash
npm install
npm run dev
```

- Web: http://localhost:5173 (Vite med proxy til /api)
- API: http://localhost:3000

## Kjør i Docker

```bash
docker compose up -d --build
```

Åpne http://localhost:3000.

SQLite-filen lagres i volumet `arcade-data` (`/data/arcade.db` inne i containeren).

## Deploy på Raspberry Pi 5

1. Installer Docker og docker-compose på Pi-en.
2. `git clone` eller `scp` dette prosjektet til Pi-en.
3. `docker compose up -d --build` (første bygg tar noen minutter).
4. Sjekk at containeren kjører og starter automatisk etter reboot:

```bash
docker compose ps
docker inspect arcade --format '{{.HostConfig.RestartPolicy.Name}}'
```

`docker-compose.yml` bruker `restart: unless-stopped`, så spillet starter igjen etter reboot så lenge containeren ikke er stoppet manuelt.

5. Slå av skjermsparing/blanking for Pi-brukeren:

```bash
mkdir -p ~/.config/lxsession/LXDE-pi
nano ~/.config/lxsession/LXDE-pi/autostart
```

Legg inn disse linjene:

```text
@xset s off
@xset -dpms
@xset s noblank
```

6. Start Chromium i kiosk-mode. Lag `~/.config/autostart/arcade.desktop`:

```ini
[Desktop Entry]
Type=Application
Name=Arkade
Exec=chromium-browser --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-features=Translate --autoplay-policy=no-user-gesture-required --incognito http://localhost:3000
X-GNOME-Autostart-enabled=true
```

Hvis Chromium ikke starter fra autostart på din Pi OS-versjon, legg samme kommando direkte i `~/.config/lxsession/LXDE-pi/autostart`:

```text
@chromium-browser --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-features=Translate --autoplay-policy=no-user-gesture-required --incognito http://localhost:3000
```

7. Reboot og test:

```bash
sudo reboot
```

Etter reboot skal Docker-containeren starte av seg selv, Chromium åpne `http://localhost:3000`, skjermen holde seg våken, og menyen gå til attract mode etter 60 sekunder uten input. Trykk `F11` for fullskjerm manuelt hvis kiosk-flagget ikke virker.

## Oppdater til nyeste versjon på Raspberry Pi

Hvis prosjektet ble klonet med `git` på Pi-en:

```bash
cd arcade
git pull
docker compose up -d --build
```

Dette bygger image på nytt med siste kode og restarter containeren. Highscore-databasen beholdes fordi SQLite-filen ligger i Docker-volumet `arcade-data`.

Hvis prosjektet ble kopiert til Pi-en med `scp` i stedet for `git`, kopier inn oppdatert prosjektmappe på nytt og kjør:

```bash
docker compose up -d --build
```

Hvis du vil rydde bort gamle images etter flere oppdateringer, kan du i tillegg kjøre:

```bash
docker image prune -f
```

## Legg til et nytt spill

1. Lag `web/src/games/<navn>/` med en `<Navn>Scene.ts` og `index.ts` som eksporterer et `GameModule`.
2. Importer og legg til modulet i `web/src/core/GameRegistry.ts`.
3. Legg til `gameId` i `server/src/validation.ts` sin whitelist.

Menyen, historie-intro og highscore-ruting plukkes opp automatisk.

## Kontroller

- **Meny:** Piltaster + Enter eller mus
- **ESC:** Tilbake til meny
- **P:** Pause
- Per-spill-kontroller vises i intro-skjermen før hvert spill starter.
