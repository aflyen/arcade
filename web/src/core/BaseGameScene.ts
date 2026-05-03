import Phaser from "phaser";
import { Theme, colorHex } from "./Theme.js";
import { MAX_LEVEL } from "./LevelCurve.js";
import { makeText } from "./ui.js";

export type SceneStartData = {
  gameId: string;
  gameNavn: string;
  emoji: string;
};

export abstract class BaseGameScene extends Phaser.Scene {
  protected gameId = "";
  protected gameNavn = "";
  protected emoji = "";
  protected level = 1;
  protected score = 0;
  protected lives = 3;
  protected paused = false;
  protected isOver = false;
  protected splashActive = false;

  private hudText?: Phaser.GameObjects.Text;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private confirmOverlay?: Phaser.GameObjects.Container;
  private abortSelection = 1;
  private abortHandlers?: {
    left: () => void;
    right: () => void;
    enter: () => void;
    escape: () => void;
  };

  init(data: SceneStartData) {
    this.gameId = data.gameId;
    this.gameNavn = data.gameNavn;
    this.emoji = data.emoji;
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.paused = false;
    this.isOver = false;
    this.splashActive = false;
  }

  protected hudBottomY = 46;

  protected buildHud() {
    const barH = 44;
    const bar = this.add.graphics().setScrollFactor(0).setDepth(999);
    bar.fillStyle(0x000000, 0.45);
    bar.fillRect(0, 0, this.scale.width, barH);
    this.hudBottomY = barH + 2;

    const hud = this.add
      .text(16, barH / 2, "", {
        fontFamily: Theme.font,
        fontSize: "20px",
        color: colorHex(Theme.colors.textSoft),
        fontStyle: "700",
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1000);
    this.hudText = hud;
    this.refreshHud();

    const back = this.add
      .text(this.scale.width - 16, barH / 2, "← Meny (ESC)", {
        fontFamily: Theme.font,
        fontSize: "18px",
        color: colorHex(Theme.colors.accent),
        fontStyle: "700",
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.askAbort());

    this.input.keyboard?.on("keydown-ESC", () => this.askAbort());
    this.input.keyboard?.on("keydown-P", () => this.togglePause());
  }

  protected showLives = true;

  protected refreshHud() {
    if (!this.hudText) return;
    const hjerter = this.showLives ? "❤️".repeat(Math.max(0, this.lives)) : "";
    this.hudText.setText(
      `${this.emoji} ${this.gameNavn}   Nivå ${this.level}/${MAX_LEVEL}   Poeng ${Math.round(this.score)}${hjerter ? "   " + hjerter : ""}   [P] pause`,
    );
  }

  protected addScore(n: number) {
    this.score += n;
    this.refreshHud();
  }

  protected setLevel(level: number) {
    this.level = level;
    this.refreshHud();
  }

  protected loseLife(): boolean {
    this.lives -= 1;
    this.refreshHud();
    return this.lives <= 0;
  }

  protected togglePause() {
    if (this.isOver) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.physics.world.pause();
      this.time.paused = true;
      this.tweens.pauseAll();
      this.pauseOverlay = this.buildOverlay("⏸  Pause", "Trykk P for å fortsette");
    } else {
      this.physics.world.resume();
      this.time.paused = false;
      this.tweens.resumeAll();
      this.pauseOverlay?.destroy();
      this.pauseOverlay = undefined;
    }
  }

  protected askAbort() {
    if (this.confirmOverlay || this.isOver) return;
    const w = this.scale.width;
    const h = this.scale.height;
    const c = this.add.container(w / 2, h / 2).setDepth(2000).setScrollFactor(0);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(-w, -h, w * 2, h * 2);
    const panel = this.add.graphics();
    panel.fillStyle(Theme.colors.panel, 1);
    panel.fillRoundedRect(-300, -130, 600, 260, 18);
    const title = makeText(this, 0, -70, "Avbryte spillet?", 34);
    const sub = makeText(
      this,
      0,
      -20,
      "Poeng blir ikke lagret.",
      20,
      Theme.colors.textDim,
    );
    const ja = makeText(this, -120, 60, "Ja, tilbake til meny", 22, Theme.colors.red)
      .setInteractive({ useHandCursor: true });
    const nei = makeText(this, 140, 60, "Fortsett (P)", 22, Theme.colors.accent2)
      .setInteractive({ useHandCursor: true });
    const updateSelection = () => {
      ja.setScale(this.abortSelection === 0 ? 1.12 : 1);
      nei.setScale(this.abortSelection === 1 ? 1.12 : 1);
      ja.setColor(colorHex(this.abortSelection === 0 ? Theme.colors.accent3 : Theme.colors.red));
      nei.setColor(colorHex(this.abortSelection === 1 ? Theme.colors.accent3 : Theme.colors.accent2));
    };
    c.add([bg, panel, title, sub, ja, nei]);
    if (!this.paused) {
      this.physics.world.pause();
      this.time.paused = true;
      this.tweens.pauseAll();
    }
    ja.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });
    const close = () => {
      this.removeAbortHandlers();
      c.destroy();
      this.confirmOverlay = undefined;
      if (!this.paused) {
        this.physics.world.resume();
        this.time.paused = false;
        this.tweens.resumeAll();
      }
    };
    nei.on("pointerdown", close);
    ja.on("pointerover", () => {
      this.abortSelection = 0;
      updateSelection();
    });
    nei.on("pointerover", () => {
      this.abortSelection = 1;
      updateSelection();
    });
    this.abortSelection = 1;
    this.abortHandlers = {
      left: () => {
        this.abortSelection = 0;
        updateSelection();
      },
      right: () => {
        this.abortSelection = 1;
        updateSelection();
      },
      enter: () => {
        if (this.abortSelection === 0) {
          this.scene.start("MenuScene");
        } else {
          close();
        }
      },
      escape: close,
    };
    this.input.keyboard?.on("keydown-LEFT", this.abortHandlers.left);
    this.input.keyboard?.on("keydown-A", this.abortHandlers.left);
    this.input.keyboard?.on("keydown-RIGHT", this.abortHandlers.right);
    this.input.keyboard?.on("keydown-D", this.abortHandlers.right);
    this.input.keyboard?.on("keydown-ENTER", this.abortHandlers.enter);
    this.input.keyboard?.on("keydown-SPACE", this.abortHandlers.enter);
    this.input.keyboard?.on("keydown-ESC", this.abortHandlers.escape);
    updateSelection();
    this.confirmOverlay = c;
  }

  private removeAbortHandlers() {
    if (!this.abortHandlers) return;
    this.input.keyboard?.off("keydown-LEFT", this.abortHandlers.left);
    this.input.keyboard?.off("keydown-A", this.abortHandlers.left);
    this.input.keyboard?.off("keydown-RIGHT", this.abortHandlers.right);
    this.input.keyboard?.off("keydown-D", this.abortHandlers.right);
    this.input.keyboard?.off("keydown-ENTER", this.abortHandlers.enter);
    this.input.keyboard?.off("keydown-SPACE", this.abortHandlers.enter);
    this.input.keyboard?.off("keydown-ESC", this.abortHandlers.escape);
    this.abortHandlers = undefined;
  }

  private buildOverlay(title: string, subtitle: string): Phaser.GameObjects.Container {
    const w = this.scale.width;
    const h = this.scale.height;
    const c = this.add.container(w / 2, h / 2).setDepth(2000).setScrollFactor(0);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.55);
    bg.fillRect(-w, -h, w * 2, h * 2);
    c.add(bg);
    c.add(makeText(this, 0, -30, title, 48));
    c.add(makeText(this, 0, 30, subtitle, 22, Theme.colors.textDim));
    return c;
  }

  protected gameOver(finalScore?: number) {
    if (this.isOver) return;
    this.isOver = true;
    const s = Math.round(finalScore ?? this.score);
    this.scene.start("GameOverScene", {
      gameId: this.gameId,
      gameNavn: this.gameNavn,
      emoji: this.emoji,
      score: s,
    });
  }

  protected win(finalScore?: number) {
    this.gameOver(finalScore);
  }

  protected showLevelSplash(
    completedLevel: number,
    onDone: () => void,
    nextHint?: string,
  ) {
    if (this.isOver) {
      onDone();
      return;
    }
    this.splashActive = true;
    const w = this.scale.width;
    const h = this.scale.height;
    const c = this.add.container(w / 2, h / 2).setDepth(1500).setScrollFactor(0);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.55);
    bg.fillRect(-w, -h, w * 2, h * 2);
    const panel = this.add.graphics();
    panel.fillStyle(Theme.colors.panel, 0.95);
    panel.fillRoundedRect(-300, -110, 600, 220, 22);
    panel.lineStyle(3, Theme.colors.accent, 1);
    panel.strokeRoundedRect(-300, -110, 600, 220, 22);
    const title = makeText(this, 0, -40, `🎉 Nivå ${completedLevel} fullført!`, 44).setColor(
      "#ffb7dd",
    );
    const sub = makeText(
      this,
      0,
      40,
      nextHint ?? `Neste: nivå ${completedLevel + 1} ${this.emoji}`,
      24,
    );
    c.add([bg, panel, title, sub]);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 160, ease: "Cubic.easeOut" });
    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: c,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          c.destroy();
          this.splashActive = false;
          onDone();
        },
      });
    });
  }
}
