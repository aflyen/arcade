import type { GameModule } from "../../core/GameModule.js";
import { TrampettScene } from "./TrampettScene.js";

export const trampettModule: GameModule = {
  id: "trampett",
  navn: "Trampett-Triks",
  emoji: "🤸",
  undertittel: "Timing, spinn og stil!",
  historie:
    "Andrea skal vise troppen sin et nytt triks! 🤸‍♀️\n" +
    "Løp mot trampetten og trykk SPACE akkurat når du er i den grønne sonen. I lufta — trykk piltastene i riktig rekkefølge for å klare trikset. Juryen dømmer strengt!",
  kontroller: "SPACE for å hoppe når du er i den grønne sonen. Piltaster (↑ ↓ ← →) i lufta for trikssekvensen.",
  SceneClass: TrampettScene,
  sceneKey: "TrampettScene",
};
