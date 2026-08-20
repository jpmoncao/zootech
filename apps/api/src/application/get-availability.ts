import type { HealthResponse } from "@zootech/contracts";

export function getAvailability(): HealthResponse {
  return {
    status: "ok",
    service: "api",
  };
}
