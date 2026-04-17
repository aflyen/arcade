import Phaser from "phaser";

export interface GameModule {
  id: string;
  navn: string;
  emoji: string;
  undertittel: string;
  historie: string;
  kontroller: string;
  SceneClass: new () => Phaser.Scene;
  sceneKey: string;
}
