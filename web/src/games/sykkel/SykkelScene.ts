import Phaser from "phaser";
import { BaseGameScene } from "../../core/BaseGameScene.js";
import { Theme } from "../../core/Theme.js";
import { MAX_LEVEL, difficulty } from "../../core/LevelCurve.js";

type Kind =
  | "cyclist"
  | "lady"
  | "dog"
  | "bench"
  | "flowers"
  | "apple"
  | "water"
  | "boost";

interface Mover {
  obj: Phaser.GameObjects.Text;
  vy: number;
  dangerous: boolean;
  passed: boolean;
  hx: number;
  hy: number;
  kind: Kind;
}

export class SykkelScene extends BaseGameScene {
  private roadLeft = 450;
  private roadRight = 830;
  private player!: Phaser.GameObjects.Text;
  private playerY = 620;
  private playerX = 640;

  private movers: Mover[] = [];
  private stripes!: Phaser.GameObjects.Graphics;
  private stripeOffset = 0;

  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private leftKeyA!: Phaser.Input.Keyboard.Key;
  private rightKeyD!: Phaser.Input.Keyboard.Key;

  private speed = 320;
  private boostTime = 0;
  private invulnTime = 0;
  private spawnTimer = 0;
  private spawnInterval = 0.8;

  private distance = 0;
  private distanceTarget = 8000;

  private distanceBar!: Phaser.GameObjects.Graphics;
  private boostText!: Phaser.GameObjects.Text;

  constructor() {
    super("SykkelScene");
  }

  create() {
    const { width, height } = this.scale;

    this.add.graphics().fillStyle(0x6cb27a, 1).fillRect(0, 0, width, height);

    const water = this.add.graphics();
    water.fillStyle(0x4a90c8, 1);
    water.fillRect(0, 0, this.roadLeft - 24, height);
    water.fillRect(this.roadRight + 24, 0, width - this.roadRight - 24, height);

    this.buildHud();

    const roadW = this.roadRight - this.roadLeft;
    this.add.graphics().fillStyle(0x4a4f55, 1).fillRect(this.roadLeft, 0, roadW, height);

    const railL = this.add.graphics();
    railL.fillStyle(0xb88848, 1);
    railL.fillRect(this.roadLeft - 24, 0, 20, height);
    const railR = this.add.graphics();
    railR.fillStyle(0xb88848, 1);
    railR.fillRect(this.roadRight + 4, 0, 20, height);

    this.stripes = this.add.graphics();

    this.player = this.add
      .text(this.playerX, this.playerY, "🚴‍♀️", { fontSize: "56px" })
      .setOrigin(0.5)
      .setDepth(50)
      .setRotation(Math.PI / 2);

    const k = this.input.keyboard!;
    this.leftKey = k.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = k.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.leftKeyA = k.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.rightKeyD = k.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.add
      .text(width / 2, this.hudBottomY + 22, "🌉 Vinges-brua", {
        fontFamily: Theme.font,
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "700",
      })
      .setOrigin(0.5)
      .setDepth(1000);

    this.distanceBar = this.add.graphics().setDepth(1000);

    this.boostText = this.add
      .text(24, this.hudBottomY + 22, "", {
        fontFamily: Theme.font,
        fontSize: "20px",
        color: "#7cffbc",
        fontStyle: "700",
      })
      .setOrigin(0, 0.5)
      .setDepth(1000);

    this.add
      .text(width / 2, height - 24, "← → (eller A/D) for å styre. Sank 🍎/💧 og ⚡, unngå hindre!", {
        fontFamily: Theme.font,
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(1000);

    this.startLevel();
  }

  private startLevel() {
    difficulty(this.level);
    this.speed = 280 + (this.level - 1) * 85;
    this.spawnInterval = Math.max(0.28, 0.95 - (this.level - 1) * 0.16);
    this.distanceTarget = this.speed * 28;
    this.distance = 0;
    this.boostTime = 0;
    this.invulnTime = 0;
    this.spawnTimer = 0;
    this.movers.forEach((m) => m.obj.destroy());
    this.movers = [];
    this.playerX = (this.roadLeft + this.roadRight) / 2;
    this.player.setPosition(this.playerX, this.playerY).setAlpha(1);
  }

  update(_t: number, delta: number) {
    if (this.paused || this.isOver || this.splashActive) return;
    const dt = delta / 1000;

    const left = this.leftKey.isDown || this.leftKeyA.isDown;
    const right = this.rightKey.isDown || this.rightKeyD.isDown;
    const steerSpeed = 380;
    if (left) this.playerX -= steerSpeed * dt;
    if (right) this.playerX += steerSpeed * dt;
    this.playerX = Phaser.Math.Clamp(this.playerX, this.roadLeft + 30, this.roadRight - 30);
    this.player.setPosition(this.playerX, this.playerY);

    const boostMul = this.boostTime > 0 ? 1.7 : 1;
    const scroll = this.speed * boostMul;
    this.boostTime = Math.max(0, this.boostTime - dt);
    this.invulnTime = Math.max(0, this.invulnTime - dt);
    this.player.setAlpha(
      this.invulnTime > 0 && Math.floor(this.invulnTime * 12) % 2 === 0 ? 0.35 : 1,
    );

    this.stripeOffset = (this.stripeOffset + scroll * dt) % 80;
    this.stripes.clear();
    this.stripes.fillStyle(0xfff2a8, 0.8);
    const cx = (this.roadLeft + this.roadRight) / 2;
    for (let y = -80 + this.stripeOffset; y < this.scale.height; y += 80) {
      this.stripes.fillRect(cx - 4, y, 8, 40);
    }

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnSomething();
    }

    for (const m of this.movers) {
      if (!m.obj.active) continue;
      const relSpeed = scroll - m.vy;
      m.obj.y += relSpeed * dt;

      if (!m.passed) {
        const dx = m.obj.x - this.playerX;
        const dy = m.obj.y - this.playerY;
        if (Math.abs(dx) < m.hx + 22 && Math.abs(dy) < m.hy + 26) {
          if (m.kind === "apple" || m.kind === "water") {
            this.addScore(40);
            this.spawnFloat(m.obj.x, m.obj.y, "+40", "#fff2a8");
            m.passed = true;
            m.obj.destroy();
            continue;
          } else if (m.kind === "boost") {
            this.boostTime = Math.min(6, this.boostTime + 3);
            this.addScore(20);
            this.spawnFloat(m.obj.x, m.obj.y, "BOOST! ⚡", "#7cffbc");
            m.passed = true;
            m.obj.destroy();
            continue;
          } else if (this.invulnTime <= 0) {
            this.cameras.main.shake(180, 0.014);
            this.cameras.main.flash(120, 255, 80, 80);
            this.invulnTime = 1.4;
            this.spawnFloat(this.playerX, this.playerY - 30, "AUDA!", "#ff6b9a");
            const dead = this.loseLife();
            if (dead) {
              this.gameOver();
              return;
            }
          }
        }
        if (m.obj.y > this.playerY + 70) {
          m.passed = true;
          if (m.dangerous) {
            this.addScore(10);
            this.spawnFloat(m.obj.x, this.playerY + 50, "+10", "#a6e9ff");
          }
        }
      }
    }
    this.movers = this.movers.filter((m) => {
      if (!m.obj.active) return false;
      if (m.obj.y > this.scale.height + 80) {
        m.obj.destroy();
        return false;
      }
      return true;
    });

    this.distance += scroll * dt;

    const barX = 200,
      barY = this.hudBottomY + 12,
      barW = 600,
      barH = 20;
    this.distanceBar.clear();
    this.distanceBar.fillStyle(0x222831, 1);
    this.distanceBar.fillRoundedRect(barX, barY, barW, barH, 6);
    const dp = Math.min(1, this.distance / this.distanceTarget);
    this.distanceBar.fillStyle(0x7cffbc, 1);
    this.distanceBar.fillRoundedRect(barX, barY, barW * dp, barH, 6);
    this.distanceBar.fillStyle(0xffffff, 0.9);
    this.distanceBar.fillRect(barX + barW - 2, barY - 4, 3, barH + 8);

    this.boostText.setText(this.boostTime > 0 ? `⚡ ${this.boostTime.toFixed(1)}s` : "");

    if (this.distance >= this.distanceTarget) {
      this.addScore(200 + this.level * 100);
      this.cameras.main.flash(240, 124, 255, 188);
      if (this.level >= MAX_LEVEL) {
        this.addScore(800);
        this.win();
        return;
      }
      const completed = this.level;
      this.showLevelSplash(completed, () => {
        this.setLevel(completed + 1);
        this.startLevel();
      });
      return;
    }
  }

  private spawnSomething() {
    const r = Math.random();
    let kind: Kind;
    if (r < 0.1) kind = "apple";
    else if (r < 0.16) kind = "water";
    else if (r < 0.21) kind = "boost";
    else if (r < 0.4) kind = "cyclist";
    else if (r < 0.55) kind = "lady";
    else if (r < 0.7) kind = "dog";
    else if (r < 0.85) kind = "bench";
    else kind = "flowers";

    const META: Record<Kind, { e: string; size: number; vy: number; danger: boolean }> = {
      cyclist: { e: "🚴", size: 48, vy: 90, danger: true },
      lady: { e: "👵", size: 48, vy: 30, danger: true },
      dog: { e: "🐕", size: 44, vy: -20, danger: true },
      bench: { e: "🪑", size: 52, vy: 0, danger: true },
      flowers: { e: "🌷", size: 44, vy: 0, danger: true },
      apple: { e: "🍎", size: 36, vy: 0, danger: false },
      water: { e: "💧", size: 36, vy: 0, danger: false },
      boost: { e: "⚡", size: 40, vy: 0, danger: false },
    };
    const meta = META[kind];
    const x = Phaser.Math.Between(this.roadLeft + 36, this.roadRight - 36);
    const obj = this.add
      .text(x, -60, meta.e, { fontSize: `${meta.size}px` })
      .setOrigin(0.5)
      .setDepth(40);
    this.movers.push({
      obj,
      vy: meta.vy,
      dangerous: meta.danger,
      passed: false,
      hx: meta.size * 0.38,
      hy: meta.size * 0.42,
      kind,
    });
  }

  private spawnFloat(x: number, y: number, text: string, color: string) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: Theme.font,
        fontSize: "20px",
        color,
        fontStyle: "700",
      })
      .setOrigin(0.5)
      .setDepth(80);
    this.tweens.add({
      targets: t,
      y: y - 50,
      alpha: 0,
      duration: 700,
      onComplete: () => t.destroy(),
    });
  }
}
