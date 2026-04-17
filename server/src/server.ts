import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyRateLimit from "@fastify/rate-limit";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { highscoreRoutes } from "./routes/highscores.js";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

const here = dirname(fileURLToPath(import.meta.url));
const WEB_DIST = process.env.WEB_DIST ?? resolve(here, "../../web/dist");

const app = Fastify({ logger: true });

await app.register(fastifyRateLimit, {
  max: 60,
  timeWindow: "1 minute",
  allowList: ["127.0.0.1", "::1"],
});

await app.register(highscoreRoutes);

app.get("/api/health", async () => ({ ok: true }));

if (existsSync(WEB_DIST)) {
  await app.register(fastifyStatic, {
    root: WEB_DIST,
    prefix: "/",
  });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.sendFile("index.html");
  });
} else {
  app.log.warn(`WEB_DIST not found at ${WEB_DIST} — running API only`);
}

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
