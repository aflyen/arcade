import type { FastifyInstance } from "fastify";
import { deleteAllScores, deleteScoresForGame, getTop, insertScore } from "../db.js";
import { gameIdSchema, submitScoreSchema } from "../validation.js";

const ADMIN_PIN = process.env.ADMIN_PIN ?? "2608";

function isAuthorized(req: { headers: Record<string, string | string[] | undefined> }) {
  return req.headers["x-admin-pin"] === ADMIN_PIN;
}

export async function highscoreRoutes(app: FastifyInstance) {
  app.get("/api/highscores/:gameId", async (req, reply) => {
    const parsed = gameIdSchema.safeParse(
      (req.params as { gameId: string }).gameId,
    );
    if (!parsed.success) {
      return reply.code(400).send({ error: "Ukjent gameId" });
    }
    const rows = getTop(parsed.data);
    return rows.map((r, idx) => ({
      rank: idx + 1,
      name: r.name,
      score: r.score,
      createdAt: r.created_at,
    }));
  });

  app.post("/api/highscores", async (req, reply) => {
    const parsed = submitScoreSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Ugyldig input",
        details: parsed.error.flatten(),
      });
    }
    const { gameId, name, score } = parsed.data;
    const result = insertScore(gameId, name, score);
    return { ok: true, rank: result.rank, isTop10: result.isTop10 };
  });

  app.delete("/api/highscores", async (req, reply) => {
    if (!isAuthorized(req)) {
      return reply.code(401).send({ error: "Ugyldig PIN" });
    }
    const deleted = deleteAllScores();
    return { ok: true, deleted };
  });

  app.delete("/api/highscores/:gameId", async (req, reply) => {
    if (!isAuthorized(req)) {
      return reply.code(401).send({ error: "Ugyldig PIN" });
    }
    const parsed = gameIdSchema.safeParse(
      (req.params as { gameId: string }).gameId,
    );
    if (!parsed.success) {
      return reply.code(400).send({ error: "Ukjent gameId" });
    }
    const deleted = deleteScoresForGame(parsed.data);
    return { ok: true, deleted };
  });
}
