import Phaser from "phaser";
import { Theme, colorHex } from "../core/Theme.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    const g = this.add.graphics();
    g.fillStyle(Theme.colors.bg, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, "🌸 Laster…", {
        fontFamily: Theme.font,
        fontSize: "48px",
        color: colorHex(Theme.colors.accent),
        fontStyle: "900",
      })
      .setOrigin(0.5);
  }

  async create() {
    await waitForFont("Zen Maru Gothic");
    this.scene.start("MenuScene");
  }
}

async function waitForFont(name: string, timeoutMs = 2500): Promise<void> {
  if (!("fonts" in document)) return;
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (document.fonts.check(`16px "${name}"`)) return;
    await new Promise((r) => setTimeout(r, 50));
  }
}
