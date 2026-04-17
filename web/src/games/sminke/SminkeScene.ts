import Phaser from "phaser";
import { BaseGameScene } from "../../core/BaseGameScene.js";
import { Theme } from "../../core/Theme.js";
import { MAX_LEVEL, difficulty } from "../../core/LevelCurve.js";

export class SminkeScene extends BaseGameScene {
  private face!: Phaser.GameObjects.Text;
  private faceContainer!: Phaser.GameObjects.Container;
  private lipsTarget!: Phaser.GameObjects.Text;
  private lipstick!: Phaser.GameObjects.Text;
  private fill = 0;
  private rot = 0;
  private fillBar!: Phaser.GameObjects.Graphics;
  private rotBar!: Phaser.GameObjects.Graphics;
  private fillText!: Phaser.GameObjects.Text;
  private rotText!: Phaser.GameObjects.Text;
  private t = 0;
  private centerX = 640;
  private centerY = 380;
  private radiusA = 140;
  private radiusB = 80;
  private speed = 0.4;
  private wobble = 0.35;
  private targetR = 44;
  private isDrawing = false;

  constructor() {
    super("SminkeScene");
  }

  create() {
    const { width, height } = this.scale;
    this.add.graphics().fillStyle(0x2a1b34, 1).fillRect(0, 0, width, height);

    this.buildHud();

    this.faceContainer = this.add.container(this.centerX, this.centerY);
    this.face = this.add.text(0, 0, "😊", { fontSize: "260px" }).setOrigin(0.5);
    this.faceContainer.add(this.face);

    this.lipsTarget = this.add
      .text(this.centerX, this.centerY + 60, "💋", { fontSize: "48px" })
      .setOrigin(0.5)
      .setDepth(10);

    this.lipstick = this.add
      .text(this.centerX, this.centerY, "💄", { fontSize: "44px" })
      .setOrigin(0.5)
      .setDepth(20);
    this.input.setDefaultCursor("none");

    // Bars
    this.add
      .text(40, 60, "Sminke:", { fontFamily: Theme.font, fontSize: "18px", color: "#fff", fontStyle: "700" })
      .setOrigin(0, 0.5)
      .setDepth(1000);
    this.fillBar = this.add.graphics().setDepth(1000);
    this.fillText = this.add
      .text(340, 60, "0%", { fontFamily: Theme.font, fontSize: "18px", color: "#fff" })
      .setOrigin(0, 0.5)
      .setDepth(1000);

    this.add
      .text(width - 40, 60, "Rot:", { fontFamily: Theme.font, fontSize: "18px", color: "#fff", fontStyle: "700" })
      .setOrigin(1, 0.5)
      .setDepth(1000);
    this.rotBar = this.add.graphics().setDepth(1000);
    this.rotText = this.add
      .text(width - 340, 60, "0%", { fontFamily: Theme.font, fontSize: "18px", color: "#fff" })
      .setOrigin(1, 0.5)
      .setDepth(1000);

    this.add
      .text(width / 2, height - 40, "Hold venstre musknapp for å sminke leppene 💋", {
        fontFamily: Theme.font,
        fontSize: "18px",
        color: "#ffb7dd",
      })
      .setOrigin(0.5)
      .setDepth(1000);

    this.input.on("pointerdown", () => (this.isDrawing = true));
    this.input.on("pointerup", () => (this.isDrawing = false));

    this.startLevel();
    this.drawBars();
  }

  shutdown() {
    this.input.setDefaultCursor("default");
  }

  private startLevel() {
    const d = difficulty(this.level);
    this.fill = 0;
    this.speed = 0.3 + d * 0.35;
    this.wobble = 0.25 + d * 0.25;
    this.targetR = Math.max(26, 50 - this.level * 4);
    this.radiusA = 120 + this.level * 10;
    this.radiusB = 50 + this.level * 14;
    this.lipsTarget.setFontSize(Math.max(34, 52 - this.level * 3));
    // Face tilt/shake on higher levels
    if (this.level >= 3) {
      this.tweens.killTweensOf(this.faceContainer);
      this.tweens.add({
        targets: this.faceContainer,
        angle: { from: -6 - this.level, to: 6 + this.level },
        yoyo: true,
        repeat: -1,
        duration: 1800 - this.level * 150,
        ease: "Sine.easeInOut",
      });
    }
  }

  update(_time: number, delta: number) {
    if (this.paused || this.isOver) return;
    const dt = delta / 1000;
    this.t += dt * this.speed;

    // Move lips target along lissajous-like noisy path
    const lx = this.centerX + Math.sin(this.t) * this.radiusA + Math.sin(this.t * 2.3 + 0.4) * this.wobble * 40;
    const ly =
      this.centerY + 50 + Math.cos(this.t * 1.4) * this.radiusB + Math.cos(this.t * 2.1 + 1.1) * this.wobble * 30;
    this.lipsTarget.setPosition(lx, ly);

    // Lipstick follows pointer
    const p = this.input.activePointer;
    this.lipstick.setPosition(p.x, p.y);
    this.lipstick.setRotation(this.isDrawing ? -0.4 : 0);

    // Draw/apply logic
    const dx = p.x - lx;
    const dy = p.y - ly;
    const inside = Math.hypot(dx, dy) < this.targetR;

    if (this.isDrawing) {
      if (inside) {
        this.fill = Math.min(100, this.fill + 38 * dt);
        this.addScore(12 * dt * this.level);
        if (Math.random() < 0.25) this.spawnHeart(p.x, p.y);
      } else {
        this.rot = Math.min(100, this.rot + 22 * dt);
        this.spawnSmudge(p.x, p.y);
      }
    }

    this.drawBars();

    if (this.fill >= 100) {
      this.addScore(250 * this.level);
      this.cameras.main.flash(200, 255, 220, 240);
      if (this.level >= MAX_LEVEL) {
        this.addScore(500);
        this.win();
        return;
      }
      this.setLevel(this.level + 1);
      this.startLevel();
    }

    if (this.rot >= 100) {
      this.face.setText("😵");
      this.gameOver();
    }
  }

  private drawBars() {
    const barW = 240;
    this.fillBar.clear();
    this.fillBar.fillStyle(0x333333, 1);
    this.fillBar.fillRoundedRect(96, 49, barW, 22, 6);
    const fp = this.fill / 100;
    this.fillBar.fillStyle(0xff8fcf, 1);
    this.fillBar.fillRoundedRect(96, 49, barW * fp, 22, 6);
    this.fillText.setText(`${Math.round(this.fill)}%`);

    this.rotBar.clear();
    this.rotBar.fillStyle(0x333333, 1);
    this.rotBar.fillRoundedRect(this.scale.width - 96 - barW, 49, barW, 22, 6);
    const rp = this.rot / 100;
    const rcol = rp < 0.5 ? 0x7cffbc : rp < 0.8 ? 0xfbe5a4 : 0xff6b9a;
    this.rotBar.fillStyle(rcol, 1);
    this.rotBar.fillRoundedRect(this.scale.width - 96 - barW, 49, barW * rp, 22, 6);
    this.rotText.setText(`${Math.round(this.rot)}%`);
  }

  private spawnSmudge(x: number, y: number) {
    const g = this.add.graphics();
    g.fillStyle(0xff6b9a, 0.9);
    g.fillCircle(x, y, 6 + Math.random() * 4);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 1500 + Math.random() * 800,
      onComplete: () => g.destroy(),
    });
  }

  private spawnHeart(x: number, y: number) {
    const t = this.add.text(x, y, "💗", { fontSize: "22px" }).setOrigin(0.5);
    this.tweens.add({
      targets: t,
      y: y - 60,
      alpha: 0,
      duration: 800,
      onComplete: () => t.destroy(),
    });
  }
}
