import type { GameModule } from "../../core/GameModule.js";
import { KaiserScene } from "./KaiserScene.js";

export const kaiserModule: GameModule = {
  id: "kaiser",
  navn: "Kaiser på rømmen",
  emoji: "🐕",
  undertittel: "Fang den brune labradoren!",
  historie:
    "Kaiser har stukket av i hagen! Andrea må fange ham før hundeluftingen er over.\n" +
    "Pass deg for bier 🐝 og hindringer 🌳 — men plukk opp 🦴 fart, 🧃 ekstra liv og 🍖 kjøttmagnet!",
  kontroller: "Piltaster eller WASD for å bevege Andrea. Rør Kaiser for å fange ham!",
  SceneClass: KaiserScene,
  sceneKey: "KaiserScene",
};
