import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, Theme } from "./core/Theme.js";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { StoryScene } from "./scenes/StoryScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";
import { NameEntryScene } from "./scenes/NameEntryScene.js";
import { HighscoreScene } from "./scenes/HighscoreScene.js";
import { AllHighscoresScene } from "./scenes/AllHighscoresScene.js";
import { AdminScene } from "./scenes/AdminScene.js";
import { GAME_REGISTRY } from "./core/GameRegistry.js";

const gameScenes = GAME_REGISTRY.map((m) => m.SceneClass);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: Theme.palette.bgCss,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 } },
  },
  scene: [
    BootScene,
    MenuScene,
    StoryScene,
    GameOverScene,
    NameEntryScene,
    HighscoreScene,
    AllHighscoresScene,
    AdminScene,
    ...gameScenes,
  ],
});
