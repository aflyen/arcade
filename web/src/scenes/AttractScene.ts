import Phaser from "phaser";
import { GAME_REGISTRY } from "../core/GameRegistry.js";
import { fetchTop, type ScoreEntry } from "../core/HighscoreClient.js";
import { Theme, colorHex } from "../core/Theme.js";
import { addSakuraBackground, makePanel, makeText } from "../core/ui.js";

type Slide = "intro" | "highscore";

const SLIDE_MS = 6500;

export class AttractScene extends Phaser.Scene {
  private slideIndex = 0;
  private content: Phaser.GameObjects.GameObject[] = [];
  private timer?: Phaser.Time.TimerEvent;
  private loadingVersion = 0;

  constructor() {
    super("AttractScene");
  }

  create() {
    const { width, height } = this.scale;
    this.slideIndex = 0;
    this.content = [];

    this.add.graphics().fillStyle(Theme.colors.bg, 1).fillRect(0, 0, width, height);
    addSakuraBackground(this, 18);

    makeText(this, width / 2, 58, "Andrea's Arkade", 48, Theme.colors.accent, "900");
    makeText(this, width / 2, height - 42, "Trykk Enter eller en knapp for å spille", 26, Theme.colors.accent3, "900");

    this.input.keyboard?.once("keydown", () => this.scene.start("MenuScene"));
    this.input.once("pointerdown", () => this.scene.start("MenuScene"));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

    this.renderSlide();
    this.timer = this.time.addEvent({
      delay: SLIDE_MS,
      loop: true,
      callback: () => {
        this.slideIndex = (this.slideIndex + 1) % (GAME_REGISTRY.length + 1);
        this.renderSlide();
      },
    });

    this.game.canvas.focus?.();
  }

  private cleanup() {
    this.timer?.remove();
    this.timer = undefined;
    this.clearContent();
  }

  private renderSlide() {
    const version = ++this.loadingVersion;
    this.clearContent();

    if (this.slideIndex === 0) {
      this.renderIntro();
      return;
    }

    const game = GAME_REGISTRY[this.slideIndex - 1];
    if (!game) return;
    void this.renderHighscore(game, version);
  }

  private renderIntro() {
    const { width, height } = this.scale;

    this.content.push(
      makeText(this, width / 2, 130, "Velg et spill, sett poengrekord, skriv navnet ditt", 28, Theme.colors.textSoft, "700"),
    );

    const cardW = 245;
    const cardH = 250;
    const gap = 24;
    const totalW = GAME_REGISTRY.length * cardW + (GAME_REGISTRY.length - 1) * gap;
    const startX = (width - totalW) / 2;
    const y = height / 2 - 110;

    GAME_REGISTRY.forEach((game, i) => {
      const x = startX + i * (cardW + gap);
      this.content.push(makePanel(this, x, y, cardW, cardH, Theme.colors.panel, 0.9));
      this.content.push(makeText(this, x + cardW / 2, y + 70, game.emoji, 76, Theme.colors.text, "900"));
      this.content.push(makeText(this, x + cardW / 2, y + 145, game.navn, 26, Theme.colors.accent2, "900"));
      this.content.push(makeText(this, x + cardW / 2, y + 185, game.undertittel, 16, Theme.colors.textDim, "700"));
    });

    this.content.push(makeText(this, width / 2, height - 104, "Highscore-listene vises automatisk her", 20, Theme.colors.textDim, "700"));
  }

  private async renderHighscore(game: (typeof GAME_REGISTRY)[number], version: number) {
    const { width, height } = this.scale;
    this.content.push(makeText(this, width / 2, 140, `${game.emoji} ${game.navn}`, 42, Theme.colors.accent2, "900"));
    this.content.push(makeText(this, width / 2, 190, "Topp 10", 26, Theme.colors.textSoft, "900"));
    this.content.push(makePanel(this, width / 2 - 360, 230, 720, 340, Theme.colors.panel, 0.92));

    const loading = makeText(this, width / 2, height / 2 + 40, "Laster highscore...", 22, Theme.colors.textDim, "700");
    this.content.push(loading);

    const rows = await fetchTop(game.id);
    if (version !== this.loadingVersion) return;

    loading.destroy();
    this.content = this.content.filter((obj) => obj !== loading);

    if (rows.length === 0) {
      this.content.push(makeText(this, width / 2, height / 2 + 40, "Ingen scores enda", 28, Theme.colors.textDim, "900"));
      return;
    }

    this.renderRows(rows.slice(0, 8));
  }

  private renderRows(rows: ScoreEntry[]) {
    const { width } = this.scale;
    const startY = 275;
    const rowH = 36;

    rows.forEach((row, i) => {
      const y = startY + i * rowH;
      const color = i === 0 ? Theme.colors.accent3 : i === 1 ? Theme.colors.accent2 : Theme.colors.textSoft;
      this.content.push(
        this.add
          .text(width / 2 - 270, y, `#${row.rank}`, {
            fontFamily: Theme.font,
            fontSize: "24px",
            color: colorHex(color),
            fontStyle: "900",
          })
          .setOrigin(0, 0.5),
        this.add
          .text(width / 2 - 150, y, row.name, {
            fontFamily: Theme.font,
            fontSize: "24px",
            color: colorHex(color),
            fontStyle: "700",
          })
          .setOrigin(0, 0.5),
        this.add
          .text(width / 2 + 270, y, String(row.score), {
            fontFamily: Theme.font,
            fontSize: "24px",
            color: colorHex(color),
            fontStyle: "900",
          })
          .setOrigin(1, 0.5),
      );
    });
  }

  private clearContent() {
    this.content.forEach((obj) => obj.destroy());
    this.content = [];
  }
}
