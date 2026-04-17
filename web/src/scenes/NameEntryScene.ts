import Phaser from "phaser";
import { Theme, colorHex } from "../core/Theme.js";
import { makeButton, makeText, addSakuraBackground, autoReturnToMenu } from "../core/ui.js";
import { submitScore } from "../core/HighscoreClient.js";

type Data = { gameId: string; gameNavn: string; emoji: string; score: number };

export class NameEntryScene extends Phaser.Scene {
  private name = "";
  private display?: Phaser.GameObjects.Text;
  private busy = false;

  constructor() {
    super("NameEntryScene");
  }

  create(data: Data) {
    const { width, height } = this.scale;
    this.name = "";
    this.busy = false;

    this.add.graphics().fillStyle(Theme.colors.bg, 1).fillRect(0, 0, width, height);
    addSakuraBackground(this, 10);

    makeText(this, width / 2, 120, `${data.emoji} ${data.gameNavn}`, 32, Theme.colors.textSoft);
    makeText(this, width / 2, 180, "🏆 TOPP 10!", 48, Theme.colors.accent2, "900");
    makeText(this, width / 2, 250, `Poeng: ${data.score}`, 36, Theme.colors.accent3, "900");
    makeText(this, width / 2, 320, "Skriv inn navnet ditt (maks 12 tegn):", 22, Theme.colors.textSoft);

    const box = this.add.graphics();
    box.fillStyle(Theme.colors.panel, 1);
    box.fillRoundedRect(width / 2 - 250, 360, 500, 80, 16);
    box.lineStyle(3, Theme.colors.accent, 1);
    box.strokeRoundedRect(width / 2 - 250, 360, 500, 80, 16);

    this.display = this.add
      .text(width / 2, 400, "_", {
        fontFamily: Theme.font,
        fontSize: "42px",
        color: colorHex(Theme.colors.text),
        fontStyle: "900",
      })
      .setOrigin(0.5);

    makeText(this, width / 2, 470, "Enter = lagre   •   Backspace = slett", 16, Theme.colors.textDim);

    makeButton(
      this,
      width / 2,
      height - 100,
      260,
      70,
      "Lagre ✨",
      () => this.submit(data),
      Theme.colors.pink,
    );

    this.input.keyboard?.on("keydown", (e: KeyboardEvent) => this.onKey(e, data));

    autoReturnToMenu(this, 30);
  }

  private onKey(e: KeyboardEvent, data: Data) {
    if (this.busy) return;
    if (e.key === "Enter") {
      this.submit(data);
      return;
    }
    if (e.key === "Backspace") {
      this.name = this.name.slice(0, -1);
    } else if (e.key.length === 1 && /^[\p{L}\p{N} _.\-!?]$/u.test(e.key)) {
      if (this.name.length < 12) this.name += e.key;
    }
    this.refresh();
  }

  private refresh() {
    if (!this.display) return;
    this.display.setText(this.name.length === 0 ? "_" : this.name);
  }

  private async submit(data: Data) {
    const trimmed = this.name.trim();
    if (trimmed.length === 0 || this.busy) return;
    this.busy = true;
    this.display?.setText(`${trimmed}  ✨`);
    await submitScore(data.gameId, trimmed, data.score);
    this.scene.start("HighscoreScene", {
      gameId: data.gameId,
      gameNavn: data.gameNavn,
      emoji: data.emoji,
      highlightName: trimmed,
    });
  }
}
