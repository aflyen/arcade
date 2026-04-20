import type { GameModule } from "../../core/GameModule.js";
import { SykkelScene } from "./SykkelScene.js";

export const sykkelModule: GameModule = {
  id: "sykkel",
  navn: "Sykkel-Stress",
  emoji: "🚴‍♀️",
  undertittel: "Rekk fram til trening!",
  historie:
    "Andrea må sykle over Vinges-brua for å rekke treninga! 🌉🚴‍♀️\n" +
    "På veien er det andre syklister 🚴, gamle damer 👵, hunder på tur 🐕, " +
    "og benker 🪑 og blomsterkasser 🌷 langs brua. Sving unna alt sammen — " +
    "og snapp opp epler 🍎 og vannflasker 💧 for poeng. Et lyn ⚡ gir fart! " +
    "Du har tre liv — kom deg over brua før de tar slutt!",
  kontroller:
    "← → eller A/D for å styre. Treff hindre = mister liv. Sank pickups, unngå hindre, og rekk fram over brua.",
  SceneClass: SykkelScene,
  sceneKey: "SykkelScene",
};
