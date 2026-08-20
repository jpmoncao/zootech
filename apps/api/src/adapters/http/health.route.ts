import type { FastifyInstance } from "fastify";

import { getAvailability } from "../../application/get-availability.js";

export async function registerHealthRoute(
  app: FastifyInstance,
): Promise<void> {
  app.get("/health", async () => getAvailability());
}
