import Phaser from "phaser";
import { GAME_REGISTRY } from "../core/GameRegistry.js";
import { resetScores } from "../core/HighscoreClient.js";
import { Theme } from "../core/Theme.js";
import { addSakuraBackground, makeButton, makePanel, makeText, type Button } from "../core/ui.js";

type Data = { pin: string };

type ResetTarget = string | "all";

export class AdminScene extends Phaser.Scene {
  private pin = "";
  private pendingTarget: ResetTarget | null = null;
  private status?: Phaser.GameObjects.Text;
  private buttons: Button[] = [];
  private selected = 0;

  constructor() {
    super("AdminScene");
  }

  create(data: Data) {
    this.pin = data.pin;
    this.pendingTarget = null;
    this.buttons = [];
    this.selected = 0;

    const { width, height } = this.scale;
    this.add.graphics().fillStyle(Theme.colors.bg, 1).fillRect(0, 0, width, height);
    addSakuraBackground(this, 10);

    makeText(this, width / 2, 70, "Admin", 48, Theme.colors.accent, "900");
    makeText(this, width / 2, 118, "Nullstill highscore", 22, Theme.colors.textDim, "700");

    makePanel(this, width / 2 - 340, 160, 680, 390, Theme.colors.panel, 0.94);

    const startY = 215;
    const gap = 70;
    GAME_REGISTRY.forEach((game, i) => {
      const button = makeButton(
        this,
        width / 2,
        startY + i * gap,
        430,
        50,
        `${game.emoji} ${game.navn}`,
        () => this.confirmOrReset(game.id, game.navn),
        Theme.colors.panelLight,
      );
      this.buttons.push(button);
    });

    this.buttons.push(makeButton(
      this,
      width / 2,
      startY + GAME_REGISTRY.length * gap + 18,
      430,
      54,
      "Nullstill alle spill",
      () => this.confirmOrReset("all", "alle spill"),
      Theme.colors.accent3,
    ));

    this.status = makeText(
      this,
      width / 2,
      height - 145,
      "Velg med ↑ ↓. Trykk Enter en gang for å velge og en gang til for å bekrefte.",
      18,
      Theme.colors.textDim,
      "700",
    );

    this.buttons.push(makeButton(
      this,
      width / 2,
      height - 72,
      230,
      60,
      "← Meny",
      () => this.scene.start("MenuScene"),
      Theme.colors.panelLight,
    ));

    this.buttons.forEach((button, i) => {
      button.rect.on("pointerover", () => {
        this.selected = i;
        this.refreshFocus();
      });
    });
    this.refreshFocus();

    this.input.keyboard?.on("keydown-UP", () => this.move(-1));
    this.input.keyboard?.on("keydown-DOWN", () => this.move(1));
    this.input.keyboard?.on("keydown-W", () => this.move(-1));
    this.input.keyboard?.on("keydown-S", () => this.move(1));
    this.input.keyboard?.on("keydown-ENTER", () => this.buttons[this.selected]?.click());
    this.input.keyboard?.on("keydown-SPACE", () => this.buttons[this.selected]?.click());
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("MenuScene"));
    this.game.canvas.focus?.();
  }

  private async confirmOrReset(target: ResetTarget, label: string) {
    if (this.pendingTarget !== target) {
      this.pendingTarget = target;
      this.setStatus(`Bekreft nullstilling av ${label}: trykk samme knapp igjen.`, Theme.colors.accent3);
      return;
    }

    this.pendingTarget = null;
    this.setStatus(`Nullstiller ${label}...`, Theme.colors.textDim);
    const result = await resetScores(target, this.pin);
    if (result.ok) {
      this.setStatus(`Ferdig. Slettet ${result.deleted} score${result.deleted === 1 ? "" : "s"}.`, Theme.colors.accent2);
    } else {
      this.setStatus(result.error ?? "Kunne ikke nullstille.", Theme.colors.accent3);
    }
  }

  private setStatus(text: string, color: number) {
    this.status?.setText(text);
    this.status?.setColor(`#${color.toString(16).padStart(6, "0")}`);
  }

  private move(delta: number) {
    this.selected = (this.selected + delta + this.buttons.length) % this.buttons.length;
    this.refreshFocus();
  }

  private refreshFocus() {
    this.buttons.forEach((button, i) => button.setFocused(i === this.selected));
  }
}
