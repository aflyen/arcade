import Phaser from "phaser";
import { BaseGameScene } from "../../core/BaseGameScene.js";
import { Theme } from "../../core/Theme.js";
import { MAX_LEVEL, difficulty } from "../../core/LevelCurve.js";

type KeyCode = "UP" | "DOWN" | "LEFT" | "RIGHT";
const KEY_ARROWS: Record<KeyCode, string> = { UP: "↑", DOWN: "↓", LEFT: "←", RIGHT: "→" };

type Phase = "running" | "takeoff" | "jumping" | "judged";

export class TrampettScene extends BaseGameScene {
  private andrea!: Phaser.GameObjects.Text;
  private trampett!: Phaser.GameObjects.Graphics;
  private sweetZone!: Phaser.GameObjects.Graphics;
  private phase: Phase = "running";
  private runSpeed = 320;
  private attemptsLeft = 3;
  private attemptsPerLevel = 3;
  private attemptsThisLevel = 0;
  private successesThisLevel = 0;
  private trickSeq: KeyCode[] = [];
  private trickProgress = 0;
  private trickStartTime = 0;
  private trickDuration = 0;
  private seqText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private judgeText!: Phaser.GameObjects.Text;
  private attemptText!: Phaser.GameObjects.Text;
  private sweetZoneW = 120;
  private sweetCenter = 620;
  private jumpStartX = 0;
  private jumpTime = 0;
  private jumpDur = 0;
  private jumpMaxH = 0;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("TrampettScene");
  }

  create() {
    const { width, height } = this.scale;
    // Gym floor
    this.add.graphics().fillStyle(0x2a1b34, 1).fillRect(0, 0, width, height);
    const floor = this.add.graphics();
    floor.fillStyle(0x8b5a3c, 1);
    floor.fillRect(0, height - 120, width, 120);
    // Mat on landing side
    const mat = this.add.graphics();
    mat.fillStyle(0x4169e1, 1);
    mat.fillRoundedRect(800, height - 160, 420, 40, 8);

    // Trampett
    this.trampett = this.add.graphics();
    this.redrawTrampett();

    // Sweet zone indicator (below trampett)
    this.sweetZone = this.add.graphics();
    this.redrawSweetZone(true);

    // Sign
    this.add
      .text(width / 2, 60, "🤸 Trampett-Triks 🤸", {
        fontFamily: Theme.font,
        fontSize: "32px",
        color: "#ffb7dd",
        fontStyle: "900",
      })
      .setOrigin(0.5);

    this.andrea = this.add.text(100, height - 140, "🏃‍♀️", { fontSize: "56px" }).setOrigin(0.5);

    this.seqText = this.add
      .text(width / 2, 280, "", {
        fontFamily: Theme.font,
        fontSize: "64px",
        color: "#fff",
        fontStyle: "900",
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(width / 2, 220, "", {
        fontFamily: Theme.font,
        fontSize: "24px",
        color: "#a0e7e5",
        fontStyle: "700",
      })
      .setOrigin(0.5);

    this.judgeText = this.add
      .text(width / 2, 360, "", {
        fontFamily: Theme.font,
        fontSize: "72px",
      })
      .setOrigin(0.5);

    this.attemptText = this.add
      .text(width - 20, 60, "", {
        fontFamily: Theme.font,
        fontSize: "22px",
        color: "#ffb7dd",
        fontStyle: "900",
      })
      .setOrigin(1, 0.5)
      .setDepth(1000);

    this.buildHud();
    this.spaceKey = this.input.keyboard!.addKey("SPACE");

    this.input.keyboard!.on("keydown-UP", () => this.onTrickKey("UP"));
    this.input.keyboard!.on("keydown-DOWN", () => this.onTrickKey("DOWN"));
    this.input.keyboard!.on("keydown-LEFT", () => this.onTrickKey("LEFT"));
    this.input.keyboard!.on("keydown-RIGHT", () => this.onTrickKey("RIGHT"));
    this.input.keyboard!.on("keydown-SPACE", () => this.onSpace());

    this.startLevel();
    this.startAttempt();
  }

  private redrawTrampett() {
    this.trampett.clear();
    this.trampett.fillStyle(0x222222, 1);
    this.trampett.fillRoundedRect(this.sweetCenter - 70, this.scale.height - 130, 140, 14, 6);
    this.trampett.fillStyle(0xff6b9a, 1);
    this.trampett.fillRoundedRect(this.sweetCenter - 60, this.scale.height - 124, 120, 6, 3);
  }

  private redrawSweetZone(visible: boolean) {
    this.sweetZone.clear();
    if (!visible) return;
    this.sweetZone.fillStyle(0x7cffbc, 0.25);
    this.sweetZone.fillRect(
      this.sweetCenter - this.sweetZoneW / 2,
      this.scale.height - 200,
      this.sweetZoneW,
      70,
    );
    this.sweetZone.lineStyle(2, 0x7cffbc, 0.8);
    this.sweetZone.strokeRect(
      this.sweetCenter - this.sweetZoneW / 2,
      this.scale.height - 200,
      this.sweetZoneW,
      70,
    );
  }

  private startLevel() {
    this.attemptsThisLevel = 0;
    this.successesThisLevel = 0;
    const d = difficulty(this.level);
    this.sweetZoneW = Math.max(36, 140 - this.level * 16);
    this.runSpeed = 300 + d * 35;
    this.redrawSweetZone(true);
    this.updateAttemptText();
  }

  private updateAttemptText() {
    this.attemptText.setText(
      `Forsøk ${this.attemptsThisLevel + 1}/${this.attemptsPerLevel}   Treff: ${this.successesThisLevel}`,
    );
  }

  private startAttempt() {
    this.phase = "running";
    this.andrea.setPosition(100, this.scale.height - 140);
    this.andrea.setRotation(0);
    this.andrea.setText("🏃‍♀️");
    this.trickSeq = [];
    this.trickProgress = 0;
    this.seqText.setText("");
    this.statusText.setText("Løp mot trampetten → trykk SPACE i den grønne sonen!");
    this.judgeText.setText("");
    this.redrawSweetZone(true);
    this.updateAttemptText();
  }

  private generateSequence(): KeyCode[] {
    const d = difficulty(this.level);
    const len = Math.min(6, 2 + Math.floor(d));
    const pool: KeyCode[] = ["UP", "DOWN", "LEFT", "RIGHT"];
    const seq: KeyCode[] = [];
    for (let i = 0; i < len; i++) {
      seq.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return seq;
  }

  private onSpace() {
    if (this.phase !== "running") return;
    const dist = Math.abs(this.andrea.x - this.sweetCenter);
    if (dist <= this.sweetZoneW / 2) {
      this.launch(true);
    } else {
      this.launch(false);
    }
  }

  private launch(hit: boolean) {
    this.phase = "takeoff";
    if (!hit) {
      // Stumble fail — no trick
      this.statusText.setText("Bommet på trampetten!");
      this.tweens.add({
        targets: this.andrea,
        angle: 720,
        y: this.scale.height - 160,
        x: this.andrea.x + 200,
        duration: 900,
        onComplete: () => this.judge(false, 0, 0),
      });
      return;
    }

    this.trickSeq = this.generateSequence();
    this.trickProgress = 0;
    this.refreshSeqDisplay();
    this.statusText.setText("🛫 I lufta! Trykk tastene i riktig rekkefølge!");
    this.jumpStartX = this.andrea.x;
    this.jumpTime = 0;
    this.jumpDur = Math.max(900, 1900 - this.level * 200);
    this.jumpMaxH = 320;
    this.trickStartTime = this.time.now;
    this.trickDuration = this.jumpDur;
    this.phase = "jumping";
  }

  private refreshSeqDisplay() {
    const parts = this.trickSeq.map((k, i) => {
      const ch = KEY_ARROWS[k];
      if (i < this.trickProgress) return `[${ch}]`;
      return ch;
    });
    this.seqText.setText(parts.join("  "));
  }

  private onTrickKey(k: KeyCode) {
    if (this.phase !== "jumping") return;
    const expected = this.trickSeq[this.trickProgress];
    if (expected === k) {
      this.trickProgress += 1;
      this.refreshSeqDisplay();
      if (this.trickProgress >= this.trickSeq.length) {
        this.statusText.setText("✨ Perfekt sekvens!");
      }
    } else {
      // Penalty: reset progress (brutal but forgiving since seq is short)
      this.trickProgress = Math.max(0, this.trickProgress - 1);
      this.refreshSeqDisplay();
      this.cameras.main.shake(120, 0.006);
    }
  }

  private judge(takeoffHit: boolean, correct: number, total: number) {
    this.phase = "judged";
    let judgeEmoji = "💀";
    let points = 0;
    let success = false;
    if (!takeoffHit) {
      judgeEmoji = "💥";
      points = 5;
    } else {
      const ratio = total === 0 ? 0 : correct / total;
      if (ratio >= 1) {
        judgeEmoji = "🏅✨👍👍";
        points = 200 * this.level + 50;
        success = true;
      } else if (ratio >= 0.6) {
        judgeEmoji = "👍👌";
        points = Math.round(120 * ratio) * this.level;
        success = true;
      } else if (ratio > 0) {
        judgeEmoji = "👎😬";
        points = Math.round(40 * ratio);
      } else {
        judgeEmoji = "🙈";
        points = 10;
      }
    }
    this.judgeText.setText(judgeEmoji);
    this.addScore(points);
    if (success) this.successesThisLevel += 1;
    this.attemptsThisLevel += 1;
    this.updateAttemptText();

    this.time.delayedCall(1400, () => this.afterAttempt());
  }

  private afterAttempt() {
    if (this.attemptsThisLevel >= this.attemptsPerLevel) {
      const passed = this.successesThisLevel >= 2;
      if (!passed) {
        if (this.loseLife()) {
          this.gameOver();
          return;
        }
      }
      if (passed) {
        if (this.level >= MAX_LEVEL) {
          this.addScore(500);
          this.win();
          return;
        }
        this.setLevel(this.level + 1);
      }
      this.startLevel();
    }
    this.startAttempt();
  }

  update(_time: number, delta: number) {
    if (this.paused || this.isOver) return;
    const dt = delta / 1000;

    if (this.phase === "running") {
      this.andrea.x += this.runSpeed * dt;
      if (this.andrea.x > this.sweetCenter + 80) {
        // Ran past without jumping
        this.launch(false);
      }
    } else if (this.phase === "jumping") {
      this.jumpTime += delta;
      const t = Math.min(1, this.jumpTime / this.jumpDur);
      const x = Phaser.Math.Linear(this.jumpStartX, 1050, t);
      const h = Math.sin(t * Math.PI) * this.jumpMaxH;
      this.andrea.setPosition(x, this.scale.height - 140 - h);
      const rotSpeed = 0.35 + this.trickProgress * 0.12;
      this.andrea.setRotation(this.andrea.rotation + rotSpeed * dt * Math.PI);
      if (t >= 1) {
        this.andrea.setRotation(0);
        this.judge(true, this.trickProgress, this.trickSeq.length);
      }
    }
  }
}
