import Phaser from "phaser";
import { Theme, colorHex } from "../core/Theme.js";
import { makeButton, makeText, addSakuraBackground } from "../core/ui.js";
import { fetchTop } from "../core/HighscoreClient.js";

type Data = { gameId: string; gameNavn: string; emoji: string; highlightName?: string };

export class HighscoreScene extends Phaser.Scene {
  constructor() {
    super("HighscoreScene");
  }

  async create(data: Data) {
    const { width, height } = this.scale;
    this.add.graphics().fillStyle(Theme.colors.bg, 1).fillRect(0, 0, width, height);
    addSakuraBackground(this, 10);

    makeText(this, width / 2, 80, `🏆 Highscore ${data.emoji} ${data.gameNavn}`, 38, Theme.colors.accent, "900");

    const rows = await fetchTop(data.gameId);

    if (rows.length === 0) {
      makeText(this, width / 2, height / 2, "Ingen scores enda — vær den første!", 24, Theme.colors.textDim);
    } else {
      const startY = 160;
      const rowH = 42;
      rows.forEach((r, i) => {
        const y = startY + i * rowH;
        const highlight = data.highlightName && r.name === data.highlightName;
        const color = highlight ? Theme.colors.accent2 : i === 0 ? Theme.colors.accent3 : Theme.colors.textSoft;

        this.add
          .text(width / 2 - 260, y, `#${r.rank}`, {
            fontFamily: Theme.font,
            fontSize: "24px",
            color: colorHex(color),
            fontStyle: "900",
          })
          .setOrigin(0, 0.5);

        this.add
          .text(width / 2 - 170, y, r.name, {
            fontFamily: Theme.font,
            fontSize: "24px",
            color: colorHex(color),
            fontStyle: "700",
          })
          .setOrigin(0, 0.5);

        this.add
          .text(width / 2 + 260, y, String(r.score), {
            fontFamily: Theme.font,
            fontSize: "24px",
            color: colorHex(color),
            fontStyle: "900",
          })
          .setOrigin(1, 0.5);
      });
    }

    makeButton(
      this,
      width / 2,
      height - 80,
      260,
      70,
      "← Meny",
      () => this.scene.start("MenuScene"),
      Theme.colors.panelLight,
    );
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("MenuScene"));
    this.input.keyboard?.on("keydown-ENTER", () => this.scene.start("MenuScene"));
  }
}
