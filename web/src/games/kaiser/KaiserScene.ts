import Phaser from "phaser";
import { BaseGameScene } from "../../core/BaseGameScene.js";
import { Theme } from "../../core/Theme.js";
import { MAX_LEVEL, difficulty } from "../../core/LevelCurve.js";

type Powerup = Phaser.GameObjects.Text & {
  kind: "bone" | "juice" | "meat";
};
type Bee = Phaser.GameObjects.Text & {
  vx: number;
  vy: number;
};

export class KaiserScene extends BaseGameScene {
  private player!: Phaser.GameObjects.Text;
  private kaiser!: Phaser.GameObjects.Text & { vx: number; vy: number };
  private obstacles: Phaser.GameObjects.Text[] = [];
  private bees: Bee[] = [];
  private powerups: Powerup[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private timerText!: Phaser.GameObjects.Text;
  private timeLeft = 0;
  private magnetUntil = 0;
  private speedUntil = 0;
  private invulnUntil = 0;
  private baseSpeed = 220;
  private splashActive = false;
  private stuckTime = 0;
  private lastKX = 0;
  private lastKY = 0;

  constructor() {
    super("KaiserScene");
  }

  create() {
    const { width, height } = this.scale;
    this.add.graphics().fillStyle(0x2a4d2a, 1).fillRect(0, 0, width, height);

    const grass = this.add.graphics();
    grass.fillStyle(0x3a6d3a, 1);
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      grass.fillCircle(x, y, 30 + Math.random() * 40);
    }

    this.buildHud();
    this.timerText = this.add
      .text(this.scale.width / 2, this.hudBottomY + 8, "", {
        fontFamily: Theme.font,
        fontSize: "22px",
        color: "#fff",
        fontStyle: "900",
        backgroundColor: "rgba(0,0,0,0.4)",
        padding: { x: 12, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setDepth(1000);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.wasd;

    this.startLevel();
  }

  private startLevel() {
    this.obstacles.forEach((o) => o.destroy());
    this.obstacles = [];
    this.bees.forEach((b) => b.destroy());
    this.bees = [];
    this.powerups.forEach((p) => p.destroy());
    this.powerups = [];

    const d = difficulty(this.level);
    const { width, height } = this.scale;

    if (!this.player || !this.player.scene) {
      this.player = this.add.text(120, height / 2, "🏃‍♀️", { fontSize: "52px" }).setOrigin(0.5);
    } else {
      this.player.setPosition(120, height / 2).setAlpha(1);
    }

    const kx = width - 180 + Math.random() * 40;
    const ky = 120 + Math.random() * (height - 240);
    if (!this.kaiser || !this.kaiser.scene) {
      const k = this.add.text(kx, ky, "🐕", { fontSize: "56px" }).setOrigin(0.5) as typeof this.kaiser;
      k.vx = 0;
      k.vy = 0;
      this.kaiser = k;
    } else {
      this.kaiser.setPosition(kx, ky);
      this.kaiser.vx = 0;
      this.kaiser.vy = 0;
    }

    const trees = 3 + Math.floor(d * 2);
    for (let i = 0; i < trees; i++) {
      const emoji = Math.random() < 0.5 ? "🌳" : "🪴";
      const t = this.add
        .text(
          200 + Math.random() * (width - 400),
          80 + Math.random() * (height - 160),
          emoji,
          { fontSize: "56px" },
        )
        .setOrigin(0.5);
      this.obstacles.push(t);
    }

    const beeCount = Math.floor((this.level - 1) * 1.2);
    for (let i = 0; i < beeCount; i++) {
      const b = this.add
        .text(Math.random() * width, Math.random() * height, "🐝", {
          fontSize: "38px",
        })
        .setOrigin(0.5) as Bee;
      const a = Math.random() * Math.PI * 2;
      const s = 80 + d * 30;
      b.vx = Math.cos(a) * s;
      b.vy = Math.sin(a) * s;
      this.bees.push(b);
    }

    const spawnP = (kind: Powerup["kind"], emoji: string) => {
      const p = this.add
        .text(
          200 + Math.random() * (width - 400),
          80 + Math.random() * (height - 160),
          emoji,
          { fontSize: "40px" },
        )
        .setOrigin(0.5) as Powerup;
      p.kind = kind;
      this.powerups.push(p);
    };
    if (Math.random() < 0.7) spawnP("bone", "🦴");
    if (Math.random() < 0.5) spawnP("juice", "🧃");
    if (this.level >= 3 && Math.random() < 0.6) spawnP("meat", "🍖");

    this.timeLeft = Math.max(25, 55 - this.level * 5);
    this.refreshTimer();
    this.magnetUntil = 0;
    this.speedUntil = 0;
    this.invulnUntil = 0;
  }

  private refreshTimer() {
    this.timerText.setText(`⏱  ${Math.ceil(this.timeLeft)}s   Fang Kaiser! 🐕`);
  }

  update(time: number, delta: number) {
    if (this.paused || this.isOver || this.splashActive) return;
    const dt = delta / 1000;

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.refreshTimer();
      this.gameOver();
      return;
    }
    this.refreshTimer();

    let dx = 0;
    let dy = 0;
    if (this.cursors.left?.isDown || this.wasd.A.isDown) dx -= 1;
    if (this.cursors.right?.isDown || this.wasd.D.isDown) dx += 1;
    if (this.cursors.up?.isDown || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down?.isDown || this.wasd.S.isDown) dy += 1;
    if (dx || dy) {
      const mag = Math.hypot(dx, dy);
      dx /= mag;
      dy /= mag;
    }
    const speed = this.baseSpeed * (time < this.speedUntil ? 1.8 : 1);
    const nx = Phaser.Math.Clamp(this.player.x + dx * speed * dt, 30, this.scale.width - 30);
    const ny = Phaser.Math.Clamp(this.player.y + dy * speed * dt, 60, this.scale.height - 30);
    if (!this.hitsObstacle(nx, ny, 24)) {
      this.player.setPosition(nx, ny);
    }

    // Kaiser AI: flee when player close, else wander.
    const pk = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.kaiser.x, this.kaiser.y);
    const d = difficulty(this.level);
    const kSpeed = 140 + d * 40;
    let kdx: number;
    let kdy: number;
    if (time < this.magnetUntil) {
      kdx = this.player.x - this.kaiser.x;
      kdy = this.player.y - this.kaiser.y;
    } else if (pk < 200) {
      kdx = this.kaiser.x - this.player.x;
      kdy = this.kaiser.y - this.player.y;
      // add perpendicular jitter so it's not trivial
      const perp = Math.sin(time / 200) * 0.6;
      const ang = Math.atan2(kdy, kdx) + perp;
      kdx = Math.cos(ang);
      kdy = Math.sin(ang);
    } else {
      this.kaiser.vx += (Math.random() - 0.5) * 40;
      this.kaiser.vy += (Math.random() - 0.5) * 40;
      kdx = this.kaiser.vx;
      kdy = this.kaiser.vy;
    }
    // Normalize intended flee/wander direction
    let km = Math.hypot(kdx, kdy) || 1;
    let ux = kdx / km;
    let uy = kdy / km;

    // Wall-repulsion so Kaiser slides along edges instead of pressing into them
    const minX = 30;
    const maxX = this.scale.width - 30;
    const minY = 60;
    const maxY = this.scale.height - 30;
    const margin = 90;
    const leftP = Math.max(0, 1 - (this.kaiser.x - minX) / margin);
    const rightP = Math.max(0, 1 - (maxX - this.kaiser.x) / margin);
    const topP = Math.max(0, 1 - (this.kaiser.y - minY) / margin);
    const botP = Math.max(0, 1 - (maxY - this.kaiser.y) / margin);
    const wallStrength = 1.4;
    ux += (leftP - rightP) * wallStrength;
    uy += (topP - botP) * wallStrength;

    // Stuck detection — if Kaiser has barely moved for ~0.6s while fleeing, force a tangential kick toward open space
    const moved = Math.hypot(this.kaiser.x - this.lastKX, this.kaiser.y - this.lastKY);
    if (moved < 0.8 && pk < 220) {
      this.stuckTime += dt;
    } else {
      this.stuckTime = 0;
    }
    if (this.stuckTime > 0.6) {
      const cx = this.scale.width / 2;
      const cy = (minY + maxY) / 2;
      const tx = cx - this.kaiser.x;
      const ty = cy - this.kaiser.y;
      const tm = Math.hypot(tx, ty) || 1;
      ux += (tx / tm) * 2.2;
      uy += (ty / tm) * 2.2;
    }

    km = Math.hypot(ux, uy) || 1;
    const kvx = (ux / km) * kSpeed;
    const kvy = (uy / km) * kSpeed;
    let knx = Phaser.Math.Clamp(this.kaiser.x + kvx * dt, minX, maxX);
    let kny = Phaser.Math.Clamp(this.kaiser.y + kvy * dt, minY, maxY);
    if (this.hitsObstacle(knx, kny, 28)) {
      // Try axis-separated sliding before giving up
      if (!this.hitsObstacle(knx, this.kaiser.y, 28)) {
        kny = this.kaiser.y;
      } else if (!this.hitsObstacle(this.kaiser.x, kny, 28)) {
        knx = this.kaiser.x;
      } else {
        knx = this.kaiser.x;
        kny = this.kaiser.y;
      }
      this.kaiser.vx = -this.kaiser.vx;
      this.kaiser.vy = -this.kaiser.vy;
    }
    this.lastKX = this.kaiser.x;
    this.lastKY = this.kaiser.y;
    this.kaiser.setPosition(knx, kny);

    // Bees
    for (const b of this.bees) {
      let bx = b.x + b.vx * dt;
      let by = b.y + b.vy * dt;
      if (bx < 20 || bx > this.scale.width - 20) b.vx *= -1;
      if (by < 60 || by > this.scale.height - 20) b.vy *= -1;
      bx = Phaser.Math.Clamp(bx, 20, this.scale.width - 20);
      by = Phaser.Math.Clamp(by, 60, this.scale.height - 20);
      b.setPosition(bx, by);
      if (time > this.invulnUntil && Phaser.Math.Distance.Between(bx, by, this.player.x, this.player.y) < 36) {
        this.invulnUntil = time + 1200;
        this.cameras.main.shake(150, 0.01);
        if (this.loseLife()) {
          this.gameOver();
          return;
        }
        this.flashPlayer();
      }
    }

    // Powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      if (Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) < 36) {
        if (p.kind === "bone") {
          this.speedUntil = time + 4000;
          this.addScore(50);
        } else if (p.kind === "juice") {
          this.lives += 1;
          this.refreshHud();
          this.addScore(30);
        } else if (p.kind === "meat") {
          this.magnetUntil = time + 3000;
          this.addScore(80);
        }
        p.destroy();
        this.powerups.splice(i, 1);
      }
    }

    // Catch Kaiser!
    if (Phaser.Math.Distance.Between(this.kaiser.x, this.kaiser.y, this.player.x, this.player.y) < 40) {
      const bonus = Math.round(this.timeLeft * 10 * this.level);
      this.addScore(200 * this.level + bonus);
      this.cameras.main.flash(300, 255, 200, 230);
      if (this.level >= MAX_LEVEL) {
        this.addScore(500);
        this.win();
        return;
      }
      const nextLevel = this.level + 1;
      this.showLevelSplash(this.level, () => {
        this.setLevel(nextLevel);
        this.startLevel();
      });
    }
  }

  private showLevelSplash(completedLevel: number, onDone: () => void) {
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
    const title = this.add
      .text(0, -40, `🎉 Nivå ${completedLevel} fullført!`, {
        fontFamily: Theme.font,
        fontSize: "44px",
        color: "#ffb7dd",
        fontStyle: "900",
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(0, 40, `Neste: nivå ${completedLevel + 1} 🐕`, {
        fontFamily: Theme.font,
        fontSize: "24px",
        color: "#fff",
      })
      .setOrigin(0.5);
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

  private hitsObstacle(x: number, y: number, r: number): boolean {
    for (const o of this.obstacles) {
      if (Phaser.Math.Distance.Between(o.x, o.y, x, y) < r + 22) return true;
    }
    return false;
  }

  private flashPlayer() {
    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      yoyo: true,
      repeat: 3,
      duration: 120,
      onComplete: () => this.player.setAlpha(1),
    });
  }
}
