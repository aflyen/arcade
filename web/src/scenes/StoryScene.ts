import Phaser from "phaser";
import { Theme, colorHex } from "../core/Theme.js";
import { makeText, makeButton, addSakuraBackground, type Button } from "../core/ui.js";

type StoryData = {
  gameId: string;
  gameNavn: string;
  emoji: string;
  historie: string;
  kontroller: string;
  sceneKey: string;
};

export class StoryScene extends Phaser.Scene {
  private buttons: Button[] = [];
  private selected = 0;

  constructor() {
    super("StoryScene");
  }

  create(data: StoryData) {
    this.buttons = [];
    this.selected = 0;

    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillStyle(Theme.colors.bg, 1);
    bg.fillRect(0, 0, width, height);
    addSakuraBackground(this, 12);

    makeText(this, width / 2, 110, `${data.emoji} ${data.gameNavn}`, 54, Theme.colors.accent, "900");

    const panel = this.add.graphics();
    panel.fillStyle(Theme.colors.panel, 0.92);
    panel.fillRoundedRect(width / 2 - 420, 180, 840, 320, 22);
    panel.lineStyle(2, Theme.colors.panelLight, 1);
    panel.strokeRoundedRect(width / 2 - 420, 180, 840, 320, 22);

    this.add
      .text(width / 2, 230, data.historie, {
        fontFamily: Theme.font,
        fontSize: "22px",
        color: colorHex(Theme.colors.textSoft),
        align: "center",
        wordWrap: { width: 780 },
      })
      .setOrigin(0.5, 0);

    this.add
      .text(width / 2, 440, `🎮 ${data.kontroller}`, {
        fontFamily: Theme.font,
        fontSize: "18px",
        color: colorHex(Theme.colors.accent2),
        fontStyle: "700",
        align: "center",
        wordWrap: { width: 780 },
      })
      .setOrigin(0.5, 0);

    const startGame = () => {
      this.scene.start(data.sceneKey, {
        gameId: data.gameId,
        gameNavn: data.gameNavn,
        emoji: data.emoji,
      });
    };
    const goMeny = () => this.scene.start("MenuScene");

    const startBtn = makeButton(this, width / 2 - 140, height - 120, 240, 74, "▶ Start!", startGame, Theme.colors.pink);
    const menyBtn = makeButton(this, width / 2 + 140, height - 120, 240, 74, "← Meny", goMeny, Theme.colors.panelLight);
    this.buttons = [startBtn, menyBtn];

    this.buttons.forEach((b, i) => {
      b.rect.on("pointerover", () => {
        this.selected = i;
        this.refreshFocus();
      });
    });
    this.refreshFocus();

    this.add
      .text(width / 2, height - 30, "← / → for å velge   •   Enter eller Space for å starte", {
        fontFamily: Theme.font,
        fontSize: "16px",
        color: colorHex(Theme.colors.textDim),
      })
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on("keydown-LEFT", () => this.move(-1));
    kb.on("keydown-RIGHT", () => this.move(1));
    kb.on("keydown-A", () => this.move(-1));
    kb.on("keydown-D", () => this.move(1));
    kb.on("keydown-ENTER", () => this.buttons[this.selected]?.click());
    kb.on("keydown-SPACE", () => this.buttons[this.selected]?.click());
    kb.on("keydown-ESC", goMeny);

    this.game.canvas.focus?.();
  }

  private move(d: number) {
    this.selected = (this.selected + d + this.buttons.length) % this.buttons.length;
    this.refreshFocus();
  }

  private refreshFocus() {
    this.buttons.forEach((b, i) => b.setFocused(i === this.selected));
  }
}
