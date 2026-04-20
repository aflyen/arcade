import type { GameModule } from "./GameModule.js";
import { kaiserModule } from "../games/kaiser/index.js";
import { slushModule } from "../games/slush/index.js";
import { trampettModule } from "../games/trampett/index.js";
import { sykkelModule } from "../games/sykkel/index.js";

export const GAME_REGISTRY: readonly GameModule[] = [
  kaiserModule,
  slushModule,
  trampettModule,
  sykkelModule,
];
