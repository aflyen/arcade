import Phaser from "phaser";
import { GAME_REGISTRY } from "../core/GameRegistry.js";
import { fetchTop, type ScoreEntry } from "../core/HighscoreClient.js";
import { Theme, colorHex } from "../core/Theme.js";
import { addSakuraBackground, makeButton, makePanel, makeText, type Button } from "../core/ui.js";

type HighscoreFocus = "tabs" | "menu";

export class AllHighscoresScene extends Phaser.Scene {
  private selected = 0;
  private focus: HighscoreFocus = "tabs";
  private content: Phaser.GameObjects.GameObject[] = [];
  private tabLabels: Phaser.GameObjects.Text[] = [];
  private tabBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  private menuButton?: Button;
  private loadingVersion = 0;

  constructor() {
    super("AllHighscoresScene");
  }

  create() {
    const { width, height } = this.scale;
    this.selected = 0;
    this.focus = "tabs";
    this.content = [];
    this.tabLabels = [];
    this.tabBackgrounds = [];

    this.add.graphics().fillStyle(Theme.colors.bg, 1).fillRect(0, 0, width, height);
    addSakuraBackground(this, 12);

    makeText(this, width / 2, 66, "🏆 Highscore", 46, Theme.colors.accent, "900");
    makeText(this, width / 2, 112, "← → blar mellom spill   •   ↑ ↓ velger rad   •   Enter åpner", 18, Theme.colors.textDim, "700");

    this.buildTabs();
    makePanel(this, width / 2 - 390, 180, 780, 400, Theme.colors.panel, 0.92);

    this.menuButton = makeButton(
      this,
      width / 2,
      height - 70,
      250,
      62,
      "← Meny",
      () => this.scene.start("MenuScene"),
      Theme.colors.panelLight,
    );
    this.menuButton.rect.on("pointerover", () => {
      this.focus = "menu";
      this.updateFocus();
    });

    this.input.keyboard?.on("keydown-LEFT", () => this.move(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.move(1));
    this.input.keyboard?.on("keydown-A", () => this.move(-1));
    this.input.keyboard?.on("keydown-D", () => this.move(1));
    this.input.keyboard?.on("keydown-UP", () => this.moveFocus("tabs"));
    this.input.keyboard?.on("keydown-DOWN", () => this.moveFocus("menu"));
    this.input.keyboard?.on("keydown-W", () => this.moveFocus("tabs"));
    this.input.keyboard?.on("keydown-S", () => this.moveFocus("menu"));
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("MenuScene"));
    this.input.keyboard?.on("keydown-ENTER", () => this.activateSelected());
    this.input.keyboard?.on("keydown-SPACE", () => this.activateSelected());

    this.renderSelected();
    this.game.canvas.focus?.();
  }

  private buildTabs() {
    const { width } = this.scale;
    const tabW = 210;
    const tabH = 52;
    const gap = 14;
    const totalW = GAME_REGISTRY.length * tabW + (GAME_REGISTRY.length - 1) * gap;
    const startX = (width - totalW) / 2 + tabW / 2;

    GAME_REGISTRY.forEach((game, i) => {
      const x = startX + i * (tabW + gap);
      const bg = this.add
        .rectangle(x, 150, tabW, tabH, Theme.colors.panelLight, 0.85)
        .setStrokeStyle(2, Theme.colors.textDim)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(x, 150, `${game.emoji} ${game.navn}`, {
          fontFamily: Theme.font,
          fontSize: "18px",
          color: colorHex(Theme.colors.textSoft),
          fontStyle: "900",
        })
        .setOrigin(0.5);

      bg.on("pointerup", () => {
        this.selected = i;
        this.focus = "tabs";
        this.renderSelected();
      });
      bg.on("pointerover", () => {
        this.selected = i;
        this.focus = "tabs";
        this.renderSelected();
      });

      this.tabBackgrounds.push(bg);
      this.tabLabels.push(label);
    });
  }

  private move(delta: number) {
    if (this.focus === "menu") {
      this.focus = "tabs";
      this.updateFocus();
      return;
    }
    this.selected = (this.selected + delta + GAME_REGISTRY.length) % GAME_REGISTRY.length;
    this.renderSelected();
  }

  private moveFocus(focus: HighscoreFocus) {
    this.focus = focus;
    this.updateFocus();
  }

  private activateSelected() {
    if (this.focus === "menu") {
      this.scene.start("MenuScene");
    }
  }

  private async renderSelected() {
    const game = GAME_REGISTRY[this.selected];
    if (!game) return;

    this.updateFocus();
    this.clearContent();

    const { width, height } = this.scale;
    const version = ++this.loadingVersion;
    this.content.push(makeText(this, width / 2, height / 2, "Laster...", 24, Theme.colors.textDim, "700"));

    const rows = await fetchTop(game.id);
    if (version !== this.loadingVersion) return;

    this.clearContent();
    this.content.push(makeText(this, width / 2, 222, `${game.emoji} ${game.navn}`, 30, Theme.colors.accent3, "900"));

    if (rows.length === 0) {
      this.content.push(makeText(this, width / 2, height / 2, "Ingen scores enda", 26, Theme.colors.textDim, "700"));
      return;
    }

    this.renderRows(rows);
  }

  private renderRows(rows: ScoreEntry[]) {
    const { width } = this.scale;
    const startY = 275;
    const rowH = 34;

    rows.forEach((row, i) => {
      const y = startY + i * rowH;
      const color = i === 0 ? Theme.colors.accent3 : i === 1 ? Theme.colors.accent2 : Theme.colors.textSoft;

      this.content.push(
        this.add
          .text(width / 2 - 295, y, `#${row.rank}`, {
            fontFamily: Theme.font,
            fontSize: "22px",
            color: colorHex(color),
            fontStyle: "900",
          })
          .setOrigin(0, 0.5),
        this.add
          .text(width / 2 - 190, y, row.name, {
            fontFamily: Theme.font,
            fontSize: "22px",
            color: colorHex(color),
            fontStyle: "700",
          })
          .setOrigin(0, 0.5),
        this.add
          .text(width / 2 + 295, y, String(row.score), {
            fontFamily: Theme.font,
            fontSize: "22px",
            color: colorHex(color),
            fontStyle: "900",
          })
          .setOrigin(1, 0.5),
      );
    });
  }

  private updateFocus() {
    this.tabBackgrounds.forEach((bg, i) => {
      const focused = this.focus === "tabs" && i === this.selected;
      bg.setFillStyle(focused ? Theme.colors.accent : Theme.colors.panelLight, focused ? 1 : 0.85);
      bg.setStrokeStyle(focused ? 4 : 2, focused ? Theme.colors.accent3 : Theme.colors.textDim);
    });
    this.tabLabels.forEach((label, i) => {
      label.setColor(colorHex(this.focus === "tabs" && i === this.selected ? Theme.colors.bgSoft : Theme.colors.textSoft));
    });
    this.menuButton?.setFocused(this.focus === "menu");
  }

  private clearContent() {
    this.content.forEach((obj) => obj.destroy());
    this.content = [];
  }
}
