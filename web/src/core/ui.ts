import Phaser from "phaser";
import { Theme, colorHex } from "./Theme.js";

export function makePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color = Theme.colors.panel,
  alpha = 0.92,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x, y, w, h, 18);
  g.lineStyle(2, Theme.colors.panelLight, 1);
  g.strokeRoundedRect(x, y, w, h, 18);
  return g;
}

export function makeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 24,
  color = Theme.colors.text,
  weight: "500" | "700" | "900" = "700",
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: Theme.font,
      fontSize: `${size}px`,
      color: colorHex(color),
      fontStyle: weight,
    })
    .setOrigin(0.5, 0.5);
}

export type Button = {
  rect: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  setFocused: (f: boolean) => void;
  click: () => void;
};

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  color = Theme.colors.pink,
): Button {
  const rect = scene.add
    .rectangle(x, y, w, h, color)
    .setStrokeStyle(3, Theme.colors.textSoft)
    .setInteractive({ useHandCursor: true });
  const text = scene.add
    .text(x, y, label, {
      fontFamily: Theme.font,
      fontSize: "22px",
      color: "#2a1b34",
      fontStyle: "900",
    })
    .setOrigin(0.5);

  const setFocused = (f: boolean) => {
    rect.setFillStyle(f ? Theme.colors.accent : color);
    rect.setStrokeStyle(f ? 5 : 3, f ? Theme.colors.accent3 : Theme.colors.textSoft);
    const s = f ? 1.04 : 1;
    rect.setScale(s);
    text.setScale(s);
  };

  rect.on("pointerover", () => setFocused(true));
  rect.on("pointerout", () => setFocused(false));
  rect.on("pointerup", () => onClick());

  return { rect, text, setFocused, click: onClick };
}

export function autoReturnToMenu(scene: Phaser.Scene, seconds = 30): () => void {
  let remaining = seconds * 1000;
  const label = scene.add
    .text(scene.scale.width - 20, scene.scale.height - 20, "", {
      fontFamily: Theme.font,
      fontSize: "14px",
      color: "#9a7db0",
    })
    .setOrigin(1, 1)
    .setDepth(3000);

  const redraw = () => {
    const s = Math.ceil(remaining / 1000);
    label.setText(s <= 10 ? `Tilbake til menyen om ${s}s…` : "");
  };

  const reset = () => {
    remaining = seconds * 1000;
    redraw();
  };

  const timer = scene.time.addEvent({
    delay: 100,
    loop: true,
    callback: () => {
      remaining -= 100;
      redraw();
      if (remaining <= 0) {
        timer.remove();
        scene.scene.start("MenuScene");
      }
    },
  });

  scene.input.on("pointerdown", reset);
  scene.input.keyboard?.on("keydown", reset);

  redraw();
  return reset;
}

export function addSakuraBackground(scene: Phaser.Scene, count = 20) {
  const { width, height } = scene.scale;
  const particles: Phaser.GameObjects.Text[] = [];
  for (let i = 0; i < count; i++) {
    const t = scene.add
      .text(
        Math.random() * width,
        Math.random() * height,
        "🌸",
        { fontSize: `${16 + Math.random() * 28}px` },
      )
      .setAlpha(0.5 + Math.random() * 0.35)
      .setOrigin(0.5);
    const speed = 15 + Math.random() * 25;
    const drift = 0.5 + Math.random() * 1.2;
    scene.tweens.add({
      targets: t,
      y: height + 40,
      x: `+=${drift * 120}`,
      angle: 360,
      duration: (height / speed) * 1000,
      repeat: -1,
      onRepeat: () => {
        t.x = Math.random() * width;
        t.y = -40;
      },
    });
    particles.push(t);
  }
  return particles;
}
