import Phaser from "phaser";
import { Theme, colorHex, GAME_WIDTH, GAME_HEIGHT } from "../core/Theme.js";
import { GAME_REGISTRY } from "../core/GameRegistry.js";
import { addSakuraBackground, makeText, makePanel } from "../core/ui.js";

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
  private cards: Card[] = [];

  constructor() {
    super("MenuScene");
  }

  create() {
    this.cards = [];
    this.selected = 0;
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
      .text(width / 2, 60, "🌸 Andreas Arkade 🌸", {
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

    this.input.keyboard?.on("keydown-LEFT", () => this.move(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.move(1));
    this.input.keyboard?.on("keydown-A", () => this.move(-1));
    this.input.keyboard?.on("keydown-D", () => this.move(1));
    this.input.keyboard?.on("keydown-ENTER", () => this.startSelected());
    this.input.keyboard?.on("keydown-SPACE", () => this.startSelected());

    this.add
      .text(width / 2, height - 36, "← → / A D for å velge   •   Enter for å starte   •   ESC avbryter i spill", {
        fontFamily: Theme.font,
        fontSize: "16px",
        color: colorHex(Theme.colors.textDim),
      })
      .setOrigin(0.5);

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
      this.highlight();
    });
    hit.on("pointerup", () => {
      this.selected = GAME_REGISTRY.findIndex((g) => g.id === id);
      this.highlight();
      this.startSelected();
    });

    return { id, cx, cy, hit, bg, texts, w, h, draw };
  }

  private move(d: number) {
    this.selected = (this.selected + d + GAME_REGISTRY.length) % GAME_REGISTRY.length;
    this.highlight();
  }

  private highlight() {
    this.cards.forEach((card, i) => {
      const focused = i === this.selected;
      card.draw(focused);
      const s = focused ? 1.06 : 1.0;
      this.tweens.add({
        targets: card.texts,
        scale: s,
        duration: 180,
        ease: "Cubic.easeOut",
      });
    });
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
}

// Re-export for Theme sizes used elsewhere
export { GAME_WIDTH, GAME_HEIGHT };
