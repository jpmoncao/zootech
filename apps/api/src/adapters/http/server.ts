import Fastify from "fastify";

import { registerHealthRoute } from "./health.route.js";

const DEFAULT_PORT = 3333;

export async function buildServer() {
  const app = Fastify({ logger: true });
  await registerHealthRoute(app);
  return app;
}

export async function startServer(): Promise<void> {
  const app = await buildServer();
  const port = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
  await app.listen({ host: "0.0.0.0", port });
}
