import Phaser from "phaser";
import { Theme, colorHex, GAME_WIDTH, GAME_HEIGHT } from "../core/Theme.js";
import { GAME_REGISTRY } from "../core/GameRegistry.js";
import { addSakuraBackground, makeButton, makePanel, makeText, type Button } from "../core/ui.js";

const ADMIN_PIN = "2608";
type MenuFocus = "games" | "highscores";

type Card = {
  id: string;
  cx: number;
  cy: number;
  hit: Phaser.GameObjects.Rectangle;
  bg: Phaser.GameObjects.Graphics;
  texts: Phaser.GameObjects.Text[];
  w: number;
  h: number;
  draw: (focused: boolean) => void;
};

export class MenuScene extends Phaser.Scene {
  private selected = 0;
  private focus: MenuFocus = "games";
  private cards: Card[] = [];
  private highscoreButton?: Button;
  private adminClickCount = 0;
  private lastAdminClick = 0;
  private pinOverlay: Phaser.GameObjects.GameObject[] = [];
  private pinValue = "";
  private pinText?: Phaser.GameObjects.Text;
  private pinError?: Phaser.GameObjects.Text;
  private suppressMenuInput = false;

  constructor() {
    super("MenuScene");
  }

  create() {
    this.cards = [];
    this.selected = 0;
    this.focus = "games";
    this.suppressMenuInput = false;
    const { width, height } = this.scale;

    const bg = this.add.graphics();
    bg.fillGradientStyle(
      Theme.colors.bg, Theme.colors.bg,
      Theme.colors.bgSoft, Theme.colors.bgSoft,
      1,
    );
    bg.fillRect(0, 0, width, height);

    addSakuraBackground(this, 18);

    this.add
      .text(width / 2, 60, "🌸 Andrea's Arkade 🌸", {
        fontFamily: Theme.font,
        fontSize: "56px",
        color: colorHex(Theme.colors.accent),
        fontStyle: "900",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 112, "〜 konfirmasjon edition 〜", {
        fontFamily: Theme.font,
        fontSize: "22px",
        color: colorHex(Theme.colors.textDim),
        fontStyle: "500",
      })
      .setOrigin(0.5);

    const n = GAME_REGISTRY.length;
    const cardW = 250;
    const cardH = 320;
    const gap = 24;
    const totalW = n * cardW + (n - 1) * gap;
    const startX = (width - totalW) / 2 + cardW / 2;
    const cardY = height / 2 + 20;

    GAME_REGISTRY.forEach((game, i) => {
      const x = startX + i * (cardW + gap);
      this.cards.push(this.buildCard(game.id, x, cardY, cardW, cardH, game.navn, game.emoji, game.undertittel));
    });

    this.highscoreButton = makeButton(
      this,
      width / 2,
      cardY + cardH / 2 + 50,
      290,
      56,
      "🏆 Highscore",
      () => this.scene.start("AllHighscoresScene"),
      Theme.colors.accent,
    );
    this.highscoreButton.rect.on("pointerover", () => {
      this.focus = "highscores";
      this.highlight();
    });
    this.highscoreButton.rect.on("pointerout", () => {
      if (this.focus === "highscores") {
        this.highscoreButton?.setFocused(true);
      }
    });

    this.input.keyboard?.on("keydown-LEFT", () => this.move(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.move(1));
    this.input.keyboard?.on("keydown-A", () => this.move(-1));
    this.input.keyboard?.on("keydown-D", () => this.move(1));
    this.input.keyboard?.on("keydown-UP", () => this.moveFocus("games"));
    this.input.keyboard?.on("keydown-DOWN", () => this.moveFocus("highscores"));
    this.input.keyboard?.on("keydown-W", () => this.moveFocus("games"));
    this.input.keyboard?.on("keydown-S", () => this.moveFocus("highscores"));
    this.input.keyboard?.on("keydown-ENTER", () => this.activateSelected());
    this.input.keyboard?.on("keydown-SPACE", () => this.activateSelected());

    this.add
      .text(width / 2, height - 26, "← → / A D velger spill   •   ↑ ↓ velger rad   •   Enter starter", {
        fontFamily: Theme.font,
        fontSize: "16px",
        color: colorHex(Theme.colors.textDim),
      })
      .setOrigin(0.5);

    this.addAdminTrigger();
    this.highlight();
    this.game.canvas.focus?.();
  }

  private buildCard(
    id: string,
    cx: number,
    cy: number,
    w: number,
    h: number,
    navn: string,
    emoji: string,
    undertittel: string,
  ): Card {
    const bg = this.add.graphics();
    const draw = (focused: boolean) => {
      bg.clear();
      bg.fillStyle(focused ? Theme.colors.panelLight : Theme.colors.panel, 0.95);
      bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 22);
      bg.lineStyle(focused ? 5 : 2, focused ? Theme.colors.accent : Theme.colors.panelLight, 1);
      bg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 22);
    };
    draw(false);

    const texts = [
      makeText(this, cx, cy - 90, emoji, 110),
      makeText(this, cx, cy + 30, navn, 28, Theme.colors.text, "900"),
      makeText(this, cx, cy + 72, undertittel, 16, Theme.colors.textSoft, "500"),
      makeText(this, cx, cy + h / 2 - 32, "Trykk Enter", 14, Theme.colors.accent, "700"),
    ];

    const hit = this.add
      .rectangle(cx, cy, w, h, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });

    hit.on("pointerover", () => {
      this.selected = GAME_REGISTRY.findIndex((g) => g.id === id);
      this.focus = "games";
      this.highlight();
    });
    hit.on("pointerup", () => {
      this.selected = GAME_REGISTRY.findIndex((g) => g.id === id);
      this.focus = "games";
      this.highlight();
      this.startSelected();
    });

    return { id, cx, cy, hit, bg, texts, w, h, draw };
  }

  private move(d: number) {
    if (this.pinOverlay.length > 0 || this.suppressMenuInput) return;
    if (this.focus === "highscores") {
      this.focus = "games";
      this.highlight();
      return;
    }
    this.selected = (this.selected + d + GAME_REGISTRY.length) % GAME_REGISTRY.length;
    this.highlight();
  }

  private moveFocus(focus: MenuFocus) {
    if (this.pinOverlay.length > 0 || this.suppressMenuInput) return;
    this.focus = focus;
    this.highlight();
  }

  private highlight() {
    this.cards.forEach((card, i) => {
      const focused = this.focus === "games" && i === this.selected;
      card.draw(focused);
      const s = focused ? 1.06 : 1.0;
      this.tweens.add({
        targets: card.texts,
        scale: s,
        duration: 180,
        ease: "Cubic.easeOut",
      });
    });
    this.highscoreButton?.setFocused(this.focus === "highscores");
  }

  private activateSelected() {
    if (this.pinOverlay.length > 0 || this.suppressMenuInput) return;
    if (this.focus === "highscores") {
      this.scene.start("AllHighscoresScene");
      return;
    }
    this.startSelected();
  }

  private startSelected() {
    const game = GAME_REGISTRY[this.selected];
    if (!game) return;
    this.scene.start("StoryScene", {
      gameId: game.id,
      gameNavn: game.navn,
      emoji: game.emoji,
      historie: game.historie,
      kontroller: game.kontroller,
      sceneKey: game.sceneKey,
    });
  }

  private addAdminTrigger() {
    const { width, height } = this.scale;
    const symbol = this.add
      .text(width - 22, height - 18, "⚙", {
        fontFamily: Theme.font,
        fontSize: "20px",
        color: colorHex(Theme.colors.textDim),
      })
      .setOrigin(0.5)
      .setAlpha(0.45)
      .setInteractive({ useHandCursor: true });

    symbol.on("pointerup", () => {
      const now = this.time.now;
      this.adminClickCount = now - this.lastAdminClick > 1600 ? 1 : this.adminClickCount + 1;
      this.lastAdminClick = now;

      if (this.adminClickCount >= 5) {
        this.adminClickCount = 0;
        this.showPinOverlay();
      }
    });
  }

  private showPinOverlay() {
    if (this.pinOverlay.length > 0) return;

    const { width, height } = this.scale;
    this.pinValue = "";

    const backdrop = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.55)
      .setInteractive();
    const panel = makePanel(this, width / 2 - 230, height / 2 - 160, 460, 320, Theme.colors.panel, 0.98);
    const title = makeText(this, width / 2, height / 2 - 105, "Admin PIN", 34, Theme.colors.accent, "900");
    const hint = makeText(this, width / 2, height / 2 - 62, "Skriv PIN og trykk Enter", 18, Theme.colors.textDim, "700");
    this.pinText = makeText(this, width / 2, height / 2 - 8, "____", 38, Theme.colors.text, "900");
    this.pinError = makeText(this, width / 2, height / 2 + 40, "", 16, Theme.colors.accent3, "700");

    const cancel = makeButton(
      this,
      width / 2 - 85,
      height / 2 + 105,
      145,
      54,
      "Avbryt",
      () => this.hidePinOverlay(),
      Theme.colors.panelLight,
    );
    const open = makeButton(
      this,
      width / 2 + 85,
      height / 2 + 105,
      145,
      54,
      "Åpne",
      () => this.submitPin(),
      Theme.colors.accent,
    );

    this.pinOverlay = [
      backdrop,
      panel,
      title,
      hint,
      this.pinText,
      this.pinError,
      cancel.rect,
      cancel.text,
      open.rect,
      open.text,
    ];

    this.input.keyboard?.on("keydown", this.handlePinKey, this);
  }

  private hidePinOverlay() {
    this.input.keyboard?.off("keydown", this.handlePinKey, this);
    this.pinOverlay.forEach((obj) => obj.destroy());
    this.pinOverlay = [];
    this.pinText = undefined;
    this.pinError = undefined;
    this.pinValue = "";
  }

  private handlePinKey(event: KeyboardEvent) {
    if (this.pinOverlay.length === 0) return;
    if (/^\d$/.test(event.key) && this.pinValue.length < 8) {
      this.pinValue += event.key;
      this.redrawPin();
      return;
    }
    if (event.key === "Backspace") {
      this.pinValue = this.pinValue.slice(0, -1);
      this.redrawPin();
      return;
    }
    if (event.key === "Enter") {
      this.submitPin();
      return;
    }
    if (event.key === "Escape") {
      this.hidePinOverlay();
    }
  }

  private redrawPin() {
    this.pinText?.setText(`${"*".repeat(this.pinValue.length)}${"_".repeat(Math.max(0, 4 - this.pinValue.length))}`);
    this.pinError?.setText("");
  }

  private submitPin() {
    if (this.pinValue !== ADMIN_PIN) {
      this.pinValue = "";
      this.redrawPin();
      this.pinError?.setText("Feil PIN");
      return;
    }
    const pin = this.pinValue;
    this.suppressMenuInput = true;
    this.hidePinOverlay();
    this.scene.stop("MenuScene");
    this.scene.start("AdminScene", { pin });
  }
}

// Re-export for Theme sizes used elsewhere
export { GAME_WIDTH, GAME_HEIGHT };
