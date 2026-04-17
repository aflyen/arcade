import type { GameModule } from "../../core/GameModule.js";
import { SminkeScene } from "./SminkeScene.js";

export const sminkeModule: GameModule = {
  id: "sminke",
  navn: "Leppestift-Bonanza",
  emoji: "💄",
  undertittel: "Hold deg på leppene!",
  historie:
    "Andrea skal pynte seg — men leppene vil ikke stå stille! 💋\n" +
    "Hold venstre musknapp for å legge på leppestift, men hold deg INNENFOR leppene. Glipper du utenfor blir det fort en rosa rotete greie i ansiktet 🫣. Ikke fyll rot-måleren!",
  kontroller: "Mus for å styre leppestiften. Hold venstre musknapp for å sminke.",
  SceneClass: SminkeScene,
  sceneKey: "SminkeScene",
};
