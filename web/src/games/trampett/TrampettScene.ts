import Phaser from "phaser";
import { BaseGameScene } from "../../core/BaseGameScene.js";
import { Theme } from "../../core/Theme.js";
import { MAX_LEVEL } from "../../core/LevelCurve.js";

type Phase = "running" | "jumping" | "judged";

type LevelCfg = {
  requiredHalfTurns: number;
  landTolRad: number;
  sweetZoneW: number;
  jumpDurMs: number;
};

const LEVELS: LevelCfg[] = [
  { requiredHalfTurns: 1, landTolRad: 1.20, sweetZoneW: 170, jumpDurMs: 1700 },
  { requiredHalfTurns: 2, landTolRad: 1.00, sweetZoneW: 150, jumpDurMs: 1800 },
  { requiredHalfTurns: 2, landTolRad: 0.80, sweetZoneW: 135, jumpDurMs: 1900 },
  { requiredHalfTurns: 3, landTolRad: 0.60, sweetZoneW: 120, jumpDurMs: 2000 },
  { requiredHalfTurns: 4, landTolRad: 0.45, sweetZoneW: 110, jumpDurMs: 2100 },
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
  private successesThisLevel = 0;
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
  private totalAbsRot = 0;
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
    const w = this.cfg().sweetZoneW;
    this.sweetZone.fillStyle(0x7cffbc, 0.25);
    this.sweetZone.fillRect(this.sweetCenter - w / 2, this.scale.height - 200, w, 70);
    this.sweetZone.lineStyle(2, 0x7cffbc, 0.8);
    this.sweetZone.strokeRect(this.sweetCenter - w / 2, this.scale.height - 200, w, 70);
  }

  private startLevel() {
    this.attemptsThisLevel = 0;
    this.successesThisLevel = 0;
    this.runSpeed = 320 + this.level * 12;
    this.redrawSweetZone(true);
    this.updateAttemptText();
  }

  private updateAttemptText() {
    const c = this.cfg();
    const halfName = c.requiredHalfTurns === 1 ? "½ salto" : `${c.requiredHalfTurns / 2} salto`.replace(".5", "½");
    this.attemptText.setText(
      `Forsøk ${this.attemptsThisLevel + 1}/${this.attemptsPerLevel}   Mål: ${halfName}`,
    );
  }

  private startAttempt() {
    this.phase = "running";
    this.andrea.setPosition(100, this.scale.height - 140);
    this.andrea.setRotation(0);
    this.andrea.setText("🏃‍♀️");
    this.omega = 0;
    this.totalAbsRot = 0;
    this.statusText.setText("Løp og trykk SPACE i den grønne sonen!");
    this.trickText.setText("");
    this.hintText.setText("I lufta: ← → for salto · ↓ for å bremse · land på beina!");
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
    this.totalAbsRot = 0;
    this.startRot = this.andrea.rotation;
  }

  private updateTrickLabel() {
    const halves = Math.floor(this.totalAbsRot / Math.PI);
    let label = "";
    if (halves === 0) label = "klar...";
    else if (halves === 1) label = "½ salto";
    else if (halves === 2) label = "Hel salto!";
    else if (halves === 3) label = "1½ salto!";
    else if (halves === 4) label = "Dobbel salto!!";
    else if (halves === 5) label = "2½ salto!!";
    else label = `${(halves / 2).toFixed(halves % 2 === 0 ? 0 : 1).replace(".5", "½")} salto 🤯`;
    this.trickText.setText(label);
  }

  private judgeLanding() {
    this.phase = "judged";
    const c = this.cfg();
    const finalRot = this.andrea.rotation - this.startRot;
    const wrapped = Phaser.Math.Angle.Wrap(finalRot);
    const offset = Math.abs(wrapped);
    const halves = Math.floor(this.totalAbsRot / Math.PI);

    let judgeEmoji = "";
    let points = 0;
    let success = false;
    let crashed = false;

    if (offset > c.landTolRad) {
      judgeEmoji = "💥 Au!";
      points = 5;
      crashed = true;
    } else if (halves < c.requiredHalfTurns) {
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
    this.addScore(points);
    if (success) this.successesThisLevel += 1;
    this.attemptsThisLevel += 1;
    this.updateAttemptText();

    this.time.delayedCall(1500, () => this.afterAttempt());
  }

  private afterAttempt() {
    if (this.attemptsThisLevel >= this.attemptsPerLevel) {
      const passed = this.successesThisLevel >= 2;
      if (!passed) {
        this.gameOver();
        return;
      }
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
      });
      return;
    }
    this.startAttempt();
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
      this.totalAbsRot += Math.abs(dRot);
      this.updateTrickLabel();

      if (t >= 1) {
        this.judgeLanding();
      }
    }
  }
}
