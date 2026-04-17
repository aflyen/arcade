import type { GameModule } from "../../core/GameModule.js";
import { SlushScene } from "./SlushScene.js";

export const slushModule: GameModule = {
  id: "slush",
  navn: "Slush-Kaos",
  emoji: "🧋",
  undertittel: "Fyll ordrer uten å søle!",
  historie:
    "Sommerkøen i slush-kiosken er hysterisk lang 🫠. Andrea må fylle hver ordre med riktig fargekombinasjon — og UTEN å søle!\n" +
    "Trykk mellomrom eller venstre musknapp for å tappe fra maskinen rett over begeret. Pass på at du ikke fyller på mer enn ordren ber om.",
  kontroller: "Mus eller A/D eller ←/→ for å flytte begeret. SPACE eller venstreklikk for å tappe.",
  SceneClass: SlushScene,
  sceneKey: "SlushScene",
};
