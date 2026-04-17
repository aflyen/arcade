import { z } from "zod";

export const GAME_IDS = ["kaiser", "slush", "trampett", "sminke"] as const;
export type GameId = (typeof GAME_IDS)[number];

export const gameIdSchema = z.enum(GAME_IDS);

export const submitScoreSchema = z.object({
  gameId: gameIdSchema,
  name: z
    .string()
    .trim()
    .min(1, "Navn må ha minst 1 tegn")
    .max(12, "Navn kan ha maks 12 tegn")
    .regex(/^[\p{L}\p{N} _.\-!?]+$/u, "Ugyldige tegn i navn"),
  score: z.number().int().min(0).max(10_000_000),
});

export type SubmitScore = z.infer<typeof submitScoreSchema>;
