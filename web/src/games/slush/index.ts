import type { GameModule } from "../../core/GameModule.js";
import { SlushScene } from "./SlushScene.js";

export const slushModule: GameModule = {
  id: "slush",
  navn: "Slush-Kaos",
  emoji: "🧋",
  undertittel: "Fyll ordrer uten å søle!",
  historie:
    "Sommerkøen i slush-kiosken er hysterisk lang 🫠. Andrea må fylle hver ordre med riktig fargekombinasjon — og UTEN å søle!\n" +
    "Flytt begeret under de aktive maskinene for å fange slushdråpene. Pass på at dråpene ikke treffer gulvet.",
  kontroller: "Mus eller A/D eller ←/→ for å flytte begeret.",
  SceneClass: SlushScene,
  sceneKey: "SlushScene",
};
