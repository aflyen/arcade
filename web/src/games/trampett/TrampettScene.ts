import Phaser from "phaser";
import { BaseGameScene } from "../../core/BaseGameScene.js";
import { Theme } from "../../core/Theme.js";
import { MAX_LEVEL } from "../../core/LevelCurve.js";

type Phase = "running" | "jumping" | "judged";

type LevelCfg = {
  requiredHalfTurns: number;
  direction: "forward" | "backward";
  goal: string;
  landTolRad: number;
  sweetZoneW: number;
  jumpDurMs: number;
};

const LEVELS: LevelCfg[] = [
  { requiredHalfTurns: 2, direction: "forward", goal: "Ta en salto", landTolRad: 1.20, sweetZoneW: 170, jumpDurMs: 1700 },
  { requiredHalfTurns: 2, direction: "backward", goal: "Ta en backflip", landTolRad: 1.00, sweetZoneW: 150, jumpDurMs: 1800 },
  { requiredHalfTurns: 4, direction: "forward", goal: "Ta en dobbel salto", landTolRad: 0.80, sweetZoneW: 135, jumpDurMs: 1900 },
  { requiredHalfTurns: 4, direction: "backward", goal: "Ta en dobbel backflip", landTolRad: 0.60, sweetZoneW: 120, jumpDurMs: 2000 },
  { requiredHalfTurns: 6, direction: "forward", goal: "Ta en trippel salto", landTolRad: 0.45, sweetZoneW: 110, jumpDurMs: 2100 },
];

const ROT_ACCEL = 9;
const MAX_OMEGA = 14;
const BRAKE_PER_SEC = 3.2;

export class TrampettScene extends BaseGameScene {
  private andrea!: Phaser.GameObjects.Text;
  private trampett!: Phaser.GameObjects.Graphics;
  private sweetZone!: Phaser.GameObjects.Graphics;
  private phase: Phase = "running";
  private runSpeed = 340;
  private attemptsPerLevel = 3;
  private attemptsThisLevel = 0;
  private statusText!: Phaser.GameObjects.Text;
  private trickText!: Phaser.GameObjects.Text;
  private judgeText!: Phaser.GameObjects.Text;
  private attemptText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private sweetCenter = 620;
  private jumpStartX = 0;
  private jumpTime = 0;
  private jumpDur = 0;
  private jumpMaxH = 0;
  private omega = 0;
  private forwardRot = 0;
  private backwardRot = 0;
  private startRot = 0;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("TrampettScene");
  }

  private cfg(): LevelCfg {
    return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, this.level - 1))];
  }

  create() {
    this.showLives = false;
    const { width, height } = this.scale;
    this.add.graphics().fillStyle(0x2a1b34, 1).fillRect(0, 0, width, height);
    const floor = this.add.graphics();
    floor.fillStyle(0x8b5a3c, 1);
    floor.fillRect(0, height - 120, width, 120);
    const mat = this.add.graphics();
    mat.fillStyle(0x4169e1, 1);
    mat.fillRoundedRect(800, height - 160, 420, 40, 8);

    this.trampett = this.add.graphics();
    this.redrawTrampett();
    this.sweetZone = this.add.graphics();

    this.add
      .text(width / 2, 60, "🤸 Trampett-Triks 🤸", {
        fontFamily: Theme.font,
        fontSize: "32px",
        color: "#ffb7dd",
        fontStyle: "900",
      })
      .setOrigin(0.5);

    this.andrea = this.add
      .text(100, height - 140, "🏃‍♀️", { fontSize: "56px" })
      .setOrigin(0.5)
      .setScale(-1, 1);

    this.statusText = this.add
      .text(width / 2, 200, "", {
        fontFamily: Theme.font,
        fontSize: "24px",
        color: "#a0e7e5",
        fontStyle: "700",
      })
      .setOrigin(0.5);

    this.trickText = this.add
      .text(width / 2, 250, "", {
        fontFamily: Theme.font,
        fontSize: "44px",
        color: "#fff",
        fontStyle: "900",
      })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(width / 2, 310, "", {
        fontFamily: Theme.font,
        fontSize: "20px",
        color: "#ffd9ec",
        fontStyle: "700",
      })
      .setOrigin(0.5);

    this.judgeText = this.add
      .text(width / 2, 380, "", {
        fontFamily: Theme.font,
        fontSize: "60px",
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
    this.leftKey = this.input.keyboard!.addKey("LEFT");
    this.rightKey = this.input.keyboard!.addKey("RIGHT");
    this.downKey = this.input.keyboard!.addKey("DOWN");
    this.input.keyboard!.on("keydown-SPACE", () => this.onSpace());

    this.startLevel();
    this.showGoalSplash(() => this.startAttempt());
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
    const w = this.cfg().sweetZoneW;
    this.sweetZone.fillStyle(0x7cffbc, 0.25);
    this.sweetZone.fillRect(this.sweetCenter - w / 2, this.scale.height - 200, w, 70);
    this.sweetZone.lineStyle(2, 0x7cffbc, 0.8);
    this.sweetZone.strokeRect(this.sweetCenter - w / 2, this.scale.height - 200, w, 70);
  }

  private startLevel() {
    this.attemptsThisLevel = 0;
    this.runSpeed = 320 + this.level * 12;
    this.redrawSweetZone(true);
    this.updateAttemptText();
  }

  private updateAttemptText() {
    this.attemptText.setText(`Forsøk ${this.attemptsThisLevel + 1}/${this.attemptsPerLevel}`);
  }

  private showGoalSplash(onDone: () => void) {
    this.splashActive = true;
    const w = this.scale.width;
    const h = this.scale.height;
    const c = this.add.container(w / 2, h / 2).setDepth(1500).setScrollFactor(0);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.55);
    bg.fillRect(-w, -h, w * 2, h * 2);
    const panel = this.add.graphics();
    panel.fillStyle(Theme.colors.panel, 0.95);
    panel.fillRoundedRect(-330, -120, 660, 240, 22);
    panel.lineStyle(3, Theme.colors.accent, 1);
    panel.strokeRoundedRect(-330, -120, 660, 240, 22);
    const title = this.add
      .text(0, -48, `Nivå ${this.level}/${MAX_LEVEL}`, {
        fontFamily: Theme.font,
        fontSize: "42px",
        color: "#ffb7dd",
        fontStyle: "900",
      })
      .setOrigin(0.5);
    const goal = this.add
      .text(0, 22, this.cfg().goal, {
        fontFamily: Theme.font,
        fontSize: "30px",
        color: "#ffffff",
        fontStyle: "900",
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(0, 72, "→ salto   ← backflip   ↓ brems", {
        fontFamily: Theme.font,
        fontSize: "20px",
        color: "#ffd9ec",
        fontStyle: "700",
      })
      .setOrigin(0.5);
    c.add([bg, panel, title, goal, hint]);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 160, ease: "Cubic.easeOut" });
    this.time.delayedCall(1800, () => {
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

  private startAttempt() {
    this.phase = "running";
    this.andrea.setPosition(100, this.scale.height - 140);
    this.andrea.setRotation(0);
    this.andrea.setText("🏃‍♀️");
    this.omega = 0;
    this.forwardRot = 0;
    this.backwardRot = 0;
    this.statusText.setText("Løp og trykk SPACE i den grønne sonen!");
    this.trickText.setText("");
    this.hintText.setText("I lufta: → salto · ← backflip · ↓ brems · land på beina!");
    this.judgeText.setText("");
    this.redrawSweetZone(true);
    this.updateAttemptText();
  }

  private onSpace() {
    if (this.phase !== "running") return;
    const dist = Math.abs(this.andrea.x - this.sweetCenter);
    const half = this.cfg().sweetZoneW / 2;
    if (dist <= half) {
      this.launch(1.0);
    } else if (dist <= half + 60) {
      this.launch(0.7);
    } else {
      this.stumble();
    }
  }

  private stumble() {
    this.phase = "judged";
    this.statusText.setText("Bommet på trampetten!");
    this.redrawSweetZone(false);
    this.tweens.add({
      targets: this.andrea,
      angle: 90,
      y: this.scale.height - 130,
      x: this.andrea.x + 80,
      duration: 600,
      onComplete: () => {
        this.judgeText.setText("😵");
        this.attemptsThisLevel += 1;
        this.updateAttemptText();
        this.time.delayedCall(1100, () => this.afterAttempt());
      },
    });
  }

  private launch(power: number) {
    this.phase = "jumping";
    this.redrawSweetZone(false);
    this.statusText.setText("🛫 I lufta!");
    this.jumpStartX = this.andrea.x;
    this.jumpTime = 0;
    this.jumpDur = this.cfg().jumpDurMs * power;
    this.jumpMaxH = 320 * power;
    this.omega = 0;
    this.forwardRot = 0;
    this.backwardRot = 0;
    this.startRot = this.andrea.rotation;
  }

  private trickName(halves: number, direction: "forward" | "backward") {
    const kind = direction === "forward" ? "salto" : "backflip";
    if (halves <= 0) return "klar...";
    if (halves === 1) return `½-${kind}`;
    if (halves === 2) return direction === "forward" ? "Hel salto!" : "Hel backflip!";
    if (halves === 4) return direction === "forward" ? "Dobbel salto!!" : "Dobbel backflip!!";
    if (halves === 6) return direction === "forward" ? "Trippel salto!!" : "Trippel backflip!!";
    const amount = (halves / 2).toFixed(halves % 2 === 0 ? 0 : 1).replace(".5", "½");
    return `${amount} ${kind}${halves >= 5 ? " 🤯" : ""}`;
  }

  private updateTrickLabel() {
    const direction = this.forwardRot >= this.backwardRot ? "forward" : "backward";
    const rot = direction === "forward" ? this.forwardRot : this.backwardRot;
    this.trickText.setText(this.trickName(Math.floor(rot / Math.PI), direction));
  }

  private judgeLanding() {
    this.phase = "judged";
    const c = this.cfg();
    const finalRot = this.andrea.rotation - this.startRot;
    const wrapped = Phaser.Math.Angle.Wrap(finalRot);
    const offset = Math.abs(wrapped);
    const requiredRot = c.requiredHalfTurns * Math.PI;
    const targetRot = c.direction === "forward" ? this.forwardRot : this.backwardRot;
    const wrongRot = c.direction === "forward" ? this.backwardRot : this.forwardRot;
    const halves = Math.floor(targetRot / Math.PI);
    const wrongHalves = Math.floor(wrongRot / Math.PI);

    let judgeEmoji = "";
    let points = 0;
    let success = false;
    let crashed = false;

    if (offset > c.landTolRad) {
      judgeEmoji = "💥 Au!";
      points = 5;
      crashed = true;
    } else if (wrongHalves > halves) {
      judgeEmoji = "Feil vei!";
      points = 0;
    } else if (targetRot < requiredRot) {
      judgeEmoji = "👌 Trygg landing";
      points = 30 + halves * 20;
    } else {
      const perfect = offset <= c.landTolRad * 0.4;
      if (perfect) {
        judgeEmoji = "🏅✨ Perfekt!";
        points = 100 * this.level + halves * 50;
      } else {
        judgeEmoji = "👍 Bra triks!";
        points = 60 * this.level + halves * 30;
      }
      success = true;
    }

    if (crashed) {
      this.andrea.setRotation(Math.PI / 2);
      this.andrea.setText("🤕");
    } else {
      this.andrea.setRotation(0);
      this.andrea.setText("🤸");
    }

    this.judgeText.setText(judgeEmoji);
    if (points > 0) this.addScore(points);
    this.attemptsThisLevel += 1;
    this.updateAttemptText();

    this.time.delayedCall(1500, () => {
      if (success) {
        this.completeLevel();
      } else {
        this.afterAttempt();
      }
    });
  }

  private afterAttempt() {
    if (this.attemptsThisLevel >= this.attemptsPerLevel) {
      this.gameOver();
      return;
    }
    this.startAttempt();
  }

  private completeLevel() {
    if (this.level >= MAX_LEVEL) {
      this.addScore(500);
      this.win();
      return;
    }
    const completed = this.level;
    this.showLevelSplash(completed, () => {
      this.setLevel(completed + 1);
      this.startLevel();
      this.startAttempt();
    }, `Neste: ${LEVELS[completed]?.goal ?? "nytt nivå"}`);
  }

  update(_time: number, delta: number) {
    if (this.paused || this.isOver || this.splashActive) return;
    const dt = delta / 1000;

    if (this.phase === "running") {
      this.andrea.x += this.runSpeed * dt;
      if (this.andrea.x > this.sweetCenter + this.cfg().sweetZoneW / 2 + 60) {
        this.stumble();
      }
    } else if (this.phase === "jumping") {
      this.jumpTime += delta;
      const t = Math.min(1, this.jumpTime / this.jumpDur);
      const x = Phaser.Math.Linear(this.jumpStartX, 1050, t);
      const h = Math.sin(t * Math.PI) * this.jumpMaxH;
      this.andrea.setPosition(x, this.scale.height - 140 - h);

      if (this.leftKey.isDown) this.omega -= ROT_ACCEL * dt;
      if (this.rightKey.isDown) this.omega += ROT_ACCEL * dt;
      if (this.downKey.isDown) this.omega *= Math.exp(-BRAKE_PER_SEC * dt);
      if (this.omega > MAX_OMEGA) this.omega = MAX_OMEGA;
      if (this.omega < -MAX_OMEGA) this.omega = -MAX_OMEGA;

      const dRot = this.omega * dt;
      this.andrea.setRotation(this.andrea.rotation + dRot);
      if (dRot > 0) this.forwardRot += dRot;
      if (dRot < 0) this.backwardRot += Math.abs(dRot);
      this.updateTrickLabel();

      if (t >= 1) {
        this.judgeLanding();
      }
    }
  }
}
