import Phaser from "phaser";
import { BaseGameScene } from "../../core/BaseGameScene.js";
import { Theme } from "../../core/Theme.js";
import { MAX_LEVEL, difficulty } from "../../core/LevelCurve.js";

type Flavor = { color: number; emoji: string };

const FLAVORS: Flavor[] = [
  { color: 0x4fc3f7, emoji: "🔵" },
  { color: 0xff5b8a, emoji: "🔴" },
  { color: 0x7cffbc, emoji: "🟢" },
  { color: 0xfbe5a4, emoji: "🟡" },
  { color: 0xcdb4f6, emoji: "🟣" },
];

type Machine = {
  x: number;
  flavor: Flavor;
  body: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics;
  active: boolean;
};

type Drop = {
  g: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vy: number;
  color: number;
  machineIdx: number;
};

export class SlushScene extends BaseGameScene {
  private machines: Machine[] = [];
  private drops: Drop[] = [];
  private beger!: Phaser.GameObjects.Container;
  private begerX = 640;
  private cupWidth = 110;
  private cupTopY = 0;
  private switchAt = 0;
  private spawnAt = 0;
  private caught = 0;
  private missed = 0;
  private catchTarget = 15;
  private levelStartTime = 0;
  private missesPerLife = 5;
  private statusText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private usingMouse = false;

  constructor() {
    super("SlushScene");
  }

  create() {
    const { width, height } = this.scale;
    this.add.graphics().fillStyle(0x1a0f1f, 1).fillRect(0, 0, width, height);

    this.buildHud();

    // Shelf under machines
    const shelf = this.add.graphics();
    shelf.fillStyle(0x5a3a78, 1);
    shelf.fillRect(0, 200, width, 18);

    // 5 machines
    const xs = [190, 370, 550, 730, 910, 1090].slice(0, 5);
    // Evenly space 5 machines across width 1280 with ~60px margins
    const nM = 5;
    const margin = 120;
    const step = (width - 2 * margin) / (nM - 1);
    for (let i = 0; i < nM; i++) {
      const mx = margin + i * step;
      const fl = FLAVORS[i];
      const body = this.add.graphics();
      body.fillStyle(0xcccccc, 1);
      body.fillRoundedRect(mx - 62, 70, 124, 110, 12);
      body.fillStyle(fl.color, 1);
      body.fillRoundedRect(mx - 48, 88, 96, 76, 8);
      body.fillStyle(0x888888, 1);
      body.fillRect(mx - 8, 164, 16, 40);
      this.add
        .text(mx, 210, fl.emoji, { fontSize: "28px" })
        .setOrigin(0.5, 1)
        .setDepth(2);
      const glow = this.add.graphics();
      this.machines.push({ x: mx, flavor: fl, body, glow, active: false });
    }

    // Beger
    this.cupTopY = height - 160;
    this.beger = this.add.container(this.begerX, height - 120);
    const cup = this.add.graphics();
    cup.fillStyle(0xe8d5f0, 0.95);
    cup.fillRoundedRect(-this.cupWidth / 2, -60, this.cupWidth, 120, 10);
    cup.lineStyle(3, 0xffffff, 1);
    cup.strokeRoundedRect(-this.cupWidth / 2, -60, this.cupWidth, 120, 10);
    this.beger.add(cup);

    this.statusText = this.add
      .text(width / 2, this.hudBottomY + 10, "", {
        fontFamily: Theme.font,
        fontSize: "20px",
        color: "#ffb7dd",
        fontStyle: "700",
        backgroundColor: "rgba(0,0,0,0.4)",
        padding: { x: 12, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setDepth(1000);

    this.progressText = this.add
      .text(width / 2, height - 30, "", {
        fontFamily: Theme.font,
        fontSize: "18px",
        color: "#e8d5f0",
        fontStyle: "700",
      })
      .setOrigin(0.5)
      .setDepth(1000);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.leftKey = this.input.keyboard!.addKey("A");
    this.rightKey = this.input.keyboard!.addKey("D");
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      this.usingMouse = true;
      this.begerX = p.x;
    });

    this.startLevel();
    this.refreshStatus();
    this.refreshProgress();
  }

  private startLevel() {
    this.caught = 0;
    this.missed = 0;
    this.drops.forEach((d) => d.g.destroy());
    this.drops = [];
    this.catchTarget = 12 + this.level * 3;
    this.levelStartTime = this.time.now;
    this.pickNextActive();
    this.spawnAt = this.time.now + 250;
    this.cameras.main.flash(200, 180, 220, 255);
  }

  private pickNextActive() {
    const d = difficulty(this.level);
    const want = this.level >= 3 && Math.random() < 0.35 ? 2 : 1;
    // Deactivate all
    this.machines.forEach((m) => {
      m.active = false;
      m.glow.clear();
    });
    // Pick `want` random machines
    const idxs = [0, 1, 2, 3, 4];
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    for (let k = 0; k < want; k++) {
      const mi = idxs[k];
      const m = this.machines[mi];
      m.active = true;
      m.glow.lineStyle(4, m.flavor.color, 1);
      m.glow.strokeRoundedRect(m.x - 68, 64, 136, 142, 14);
    }
    const holdMs = Math.max(600, 2400 - this.level * 280);
    this.switchAt = this.time.now + holdMs + Math.random() * 300;
  }

  private refreshStatus() {
    this.statusText.setText(`Nivå ${this.level}/${MAX_LEVEL}  •  fang ${this.catchTarget} slush!`);
  }

  private refreshProgress() {
    const missBudget = this.missesPerLife - (this.missed % this.missesPerLife);
    this.progressText.setText(
      `Fanget ${this.caught}/${this.catchTarget}   |   Bommer før liv mistes: ${missBudget}`,
    );
  }

  update(_time: number, delta: number) {
    if (this.paused || this.isOver) return;
    const dt = delta / 1000;
    const now = this.time.now;

    // Move beger
    const kLeft = this.cursors.left?.isDown || this.leftKey.isDown;
    const kRight = this.cursors.right?.isDown || this.rightKey.isDown;
    if (kLeft || kRight) {
      this.usingMouse = false;
      this.begerX += ((kRight ? 1 : 0) - (kLeft ? 1 : 0)) * 520 * dt;
    }
    this.begerX = Phaser.Math.Clamp(this.begerX, this.cupWidth / 2 + 10, this.scale.width - this.cupWidth / 2 - 10);
    this.beger.setX(this.begerX);

    // Switch active machines
    if (now >= this.switchAt) {
      this.pickNextActive();
    }

    // Spawn drops from active machines
    if (now >= this.spawnAt) {
      const d = difficulty(this.level);
      const interval = Math.max(160, 620 - this.level * 70);
      for (const m of this.machines) {
        if (m.active) this.spawnDrop(m);
      }
      this.spawnAt = now + interval + Math.random() * 120;
    }

    // Update drops
    const dropSpeed = 280 + difficulty(this.level) * 90;
    const floorY = this.scale.height - 30;
    const cupHalf = this.cupWidth / 2;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.y += drop.vy * dt;
      drop.g.setPosition(drop.x, drop.y);

      // Caught?
      if (
        drop.y >= this.cupTopY &&
        drop.y <= this.cupTopY + 30 &&
        Math.abs(drop.x - this.begerX) <= cupHalf
      ) {
        this.onCatch(drop);
        drop.g.destroy();
        this.drops.splice(i, 1);
        continue;
      }
      // Floor — missed
      if (drop.y >= floorY) {
        this.onMiss(drop);
        drop.g.destroy();
        this.drops.splice(i, 1);
        continue;
      }
    }
  }

  private spawnDrop(m: Machine) {
    const speed = 280 + difficulty(this.level) * 90;
    const g = this.add.graphics();
    g.fillStyle(m.flavor.color, 1);
    g.fillCircle(0, 0, 10);
    g.lineStyle(2, 0xffffff, 0.5);
    g.strokeCircle(0, 0, 10);
    g.setPosition(m.x, 206);
    const drop: Drop = {
      g,
      x: m.x + (Math.random() - 0.5) * 8,
      y: 206,
      vy: speed,
      color: m.flavor.color,
      machineIdx: this.machines.indexOf(m),
    };
    this.drops.push(drop);
  }

  private onCatch(drop: Drop) {
    this.caught += 1;
    this.addScore(20 * this.level);
    this.spawnCatchParticles(drop.x, this.cupTopY, drop.color);
    this.refreshProgress();
    if (this.caught >= this.catchTarget) {
      this.addScore(150 * this.level);
      this.cameras.main.flash(250, 180, 255, 220);
      if (this.level >= MAX_LEVEL) {
        this.addScore(500);
        this.win();
        return;
      }
      this.setLevel(this.level + 1);
      this.startLevel();
      this.refreshStatus();
      this.refreshProgress();
    }
  }

  private onMiss(drop: Drop) {
    this.missed += 1;
    this.spawnSplashOnFloor(drop.x, this.scale.height - 30, drop.color);
    this.cameras.main.shake(80, 0.004);
    if (this.missed % this.missesPerLife === 0) {
      if (this.loseLife()) {
        this.gameOver();
        return;
      }
    }
    this.refreshProgress();
  }

  private spawnCatchParticles(x: number, y: number, color: number) {
    for (let i = 0; i < 4; i++) {
      const p = this.add.graphics();
      p.fillStyle(color, 1);
      p.fillCircle(0, 0, 3 + Math.random() * 3);
      p.setPosition(x + (Math.random() - 0.5) * 10, y);
      this.tweens.add({
        targets: p,
        y: y - 40,
        alpha: 0,
        duration: 400,
        onComplete: () => p.destroy(),
      });
    }
  }

  private spawnSplashOnFloor(x: number, y: number, color: number) {
    const puddle = this.add.graphics();
    puddle.fillStyle(color, 0.7);
    puddle.fillEllipse(x, y, 40, 10);
    this.tweens.add({
      targets: puddle,
      alpha: 0,
      duration: 1400,
      onComplete: () => puddle.destroy(),
    });
    for (let i = 0; i < 5; i++) {
      const p = this.add.graphics();
      p.fillStyle(color, 1);
      p.fillCircle(0, 0, 2 + Math.random() * 3);
      p.setPosition(x, y);
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const spd = 80 + Math.random() * 120;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * spd * 0.5,
        y: y + Math.sin(ang) * spd * 0.3,
        alpha: 0,
        duration: 500,
        onComplete: () => p.destroy(),
      });
    }
  }
}
