# Arkade-kiosk 🎮

Nettleserbasert arkade-kiosk for Andrea sin konfirmasjon. Fire mini-spill med topp-10 highscore, designet for Raspberry Pi 5 i kiosk-modus.

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
2. Installer emoji-fonten som Chromium trenger for ikonene i spillet:

```bash
sudo apt update
sudo apt install -y fonts-noto-color-emoji
fc-cache -f
```

Ikonene i spillet er emoji-tegn som tegnes av nettleseren. Windows har en emoji-font innebygd, mens Raspberry Pi OS ofte mangler dette som standard. Uten `fonts-noto-color-emoji` kan ikonene bli blanke eller vises som firkanter i Chromium.

Verifiser at fonten er installert:

```bash
fc-match "Noto Color Emoji"
```

Forventet output skal nevne `NotoColorEmoji.ttf`. Logg ut/inn eller reboot etter installasjonen hvis Chromium allerede kjører. Merk at emoji kan se litt annerledes ut på Pi enn på Windows, fordi de bruker forskjellige emoji-fonter.

3. `git clone` eller `scp` dette prosjektet til Pi-en.
4. `docker compose up -d --build` (første bygg tar noen minutter).
5. Sjekk at containeren kjører og starter automatisk etter reboot:

```bash
docker compose ps
docker inspect arcade --format '{{.HostConfig.RestartPolicy.Name}}'
```

`docker-compose.yml` bruker `restart: unless-stopped`, så spillet starter igjen etter reboot så lenge containeren ikke er stoppet manuelt.

6. Start Chromium i kiosk-mode for Pi-brukeren. Dette starter Chromium etter at det grafiske skrivebordet har logget inn.

Lag autostart-mappen og åpne en ny `.desktop`-fil:

```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/arcade.desktop
```

Legg inn dette:

```ini
[Desktop Entry]
Type=Application
Name=Arkade
Exec=chromium --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-features=Translate --disable-translate --autoplay-policy=no-user-gesture-required --password-store=basic --incognito http://localhost:3000
Terminal=false
X-GNOME-Autostart-enabled=true
```

`--password-store=basic` hindrer Chromium i å spørre etter nøkkelring-passord ved kiosk-oppstart. `--disable-features=Translate --disable-translate` er ekstra vern mot oversettelsesdialogen når spillet blander norsk og engelsk tekst. Selve nettsiden er også merket med `notranslate`, så Chromium ikke skal tilby oversettelse av arkaden.

7. Reboot og test:

```bash
sudo reboot
```

Etter reboot skal Docker-containeren starte av seg selv, Chromium åpne `http://localhost:3000`, og menyen gå til attract mode etter 60 sekunder uten input. Trykk `F11` for fullskjerm manuelt hvis kiosk-flagget ikke virker.

### Valgfritt: skrivebordsikon for å starte Chromium på nytt

Hvis Chromium blir lukket under bruk, kan det være praktisk med et ikon på skrivebordet som starter nettleseren på nytt med samme kiosk-parametre.

Lag en `.desktop`-fil:

```bash
nano ~/Desktop/Start-Arcade.desktop
```

Legg inn dette:

```ini
[Desktop Entry]
Type=Application
Name=Start Arcade
Comment=Restart arcade browser in kiosk mode
Exec=chromium --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-features=Translate --disable-translate --autoplay-policy=no-user-gesture-required --password-store=basic --incognito http://localhost:3000
Terminal=false
Icon=chromium
Categories=Game;
```

Gjør filen kjørbar og marker den som trygg:

```bash
chmod +x ~/Desktop/Start-Arcade.desktop
gio set ~/Desktop/Start-Arcade.desktop metadata::trusted true
```

Hvis Raspberry Pi OS fortsatt viser en popup, høyreklikk ikonet og velg **Allow Launching** / **Trust this executable**. På noen skrivebordsmiljøer må man fortsatt velge **Execute** første gang.

Hvis `chromium` ikke finnes på Pi-en, sjekk kommandoen og bytt `Exec=`-linjen til riktig binær:

```bash
which chromium
which chromium-browser
```

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
