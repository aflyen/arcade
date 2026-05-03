import type { GameModule } from "../../core/GameModule.js";
import { TrampettScene } from "./TrampettScene.js";

export const trampettModule: GameModule = {
  id: "trampett",
  navn: "Trampett-Triks",
  emoji: "🤸",
  undertittel: "Timing, spinn og stil!",
  historie:
    "Andrea skal vise troppen sin et nytt triks! 🤸‍♀️\n" +
    "Løp mot trampetten og trykk SPACE akkurat når du er i den grønne sonen. I lufta bruker du → for salto, ← for backflip og ↓ for å bremse før landing. Juryen dømmer strengt!",
  kontroller: "SPACE for å hoppe når du er i den grønne sonen. I lufta: → for salto, ← for backflip, ↓ for å bremse.",
  SceneClass: TrampettScene,
  sceneKey: "TrampettScene",
};
