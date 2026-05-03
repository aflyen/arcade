import Phaser from "phaser";
import { Theme } from "../core/Theme.js";
import { makeText, makeButton, addSakuraBackground, autoReturnToMenu, type Button } from "../core/ui.js";
import { checkIfTop10 } from "../core/HighscoreClient.js";
import { GAME_REGISTRY } from "../core/GameRegistry.js";

type Data = { gameId: string; gameNavn: string; emoji: string; score: number };

export class GameOverScene extends Phaser.Scene {
  private buttons: Button[] = [];
  private selected = 0;

  constructor() {
    super("GameOverScene");
  }

  async create(data: Data) {
    this.buttons = [];
    this.selected = 0;

    const { width, height } = this.scale;
    this.add.graphics().fillStyle(Theme.colors.bg, 1).fillRect(0, 0, width, height);
    addSakuraBackground(this, 10);

    makeText(this, width / 2, 140, `${data.emoji} ${data.gameNavn}`, 40, Theme.colors.textSoft);
    makeText(this, width / 2, 220, "Spillet er over", 48, Theme.colors.accent, "900");
    makeText(this, width / 2, 300, `Poeng: ${data.score}`, 64, Theme.colors.accent3, "900");

    const loading = makeText(this, width / 2, 400, "Sjekker highscore…", 20, Theme.colors.textDim);

    const isTop10 = await checkIfTop10(data.gameId, data.score);
    loading.destroy();

    if (isTop10 && data.score > 0) {
      this.scene.start("NameEntryScene", {
        gameId: data.gameId,
        gameNavn: data.gameNavn,
        emoji: data.emoji,
        score: data.score,
      });
      return;
    }

    const kb = this.input.keyboard!;
    makeText(
      this,
      width / 2,
      400,
      "Prøv igjen — neste gang blir du topp 10!",
      22,
      Theme.colors.textDim,
    );
    const retry = () =>
      this.scene.start("StoryScene", {
        gameId: data.gameId,
        gameNavn: data.gameNavn,
        emoji: data.emoji,
        historie: "En ny sjanse venter!",
        kontroller: "Samme som sist.",
        sceneKey: sceneKeyFor(data.gameId),
      });
    const meny = () => this.scene.start("MenuScene");
    this.buttons.push(
      makeButton(this, width / 2 - 140, height - 140, 240, 70, "Spill igjen", retry, Theme.colors.accent2),
    );
    this.buttons.push(
      makeButton(this, width / 2 + 140, height - 140, 240, 70, "← Meny", meny, Theme.colors.panelLight),
    );
    kb.on("keydown-LEFT", () => this.move(-1));
    kb.on("keydown-RIGHT", () => this.move(1));
    kb.on("keydown-A", () => this.move(-1));
    kb.on("keydown-D", () => this.move(1));
    kb.on("keydown-ENTER", () => this.buttons[this.selected]?.click());
    kb.on("keydown-SPACE", () => this.buttons[this.selected]?.click());
    kb.on("keydown-ESC", meny);

    this.buttons.forEach((b, i) => {
      b.rect.on("pointerover", () => {
        this.selected = i;
        this.refreshFocus();
      });
    });
    this.refreshFocus();

    this.add
      .text(width / 2, height - 50, "← / → for å velge   •   Enter for å bekrefte", {
        fontFamily: Theme.font,
        fontSize: "14px",
        color: "#9a7db0",
      })
      .setOrigin(0.5);

    this.game.canvas.focus?.();
    autoReturnToMenu(this, 30);
  }

  private move(d: number) {
    if (this.buttons.length === 0) return;
    this.selected = (this.selected + d + this.buttons.length) % this.buttons.length;
    this.refreshFocus();
  }

  private refreshFocus() {
    this.buttons.forEach((b, i) => b.setFocused(i === this.selected));
  }
}

function sceneKeyFor(gameId: string): string {
  const g = GAME_REGISTRY.find((x) => x.id === gameId);
  return g?.sceneKey ?? "MenuScene";
}
