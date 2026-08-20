import type { HealthResponse } from "@zootech/contracts";

export type AvailabilityState = "available" | "unavailable";

export interface AvailabilityViewModel {
  productName: "ZooTech";
  availability: AvailabilityState;
  availabilityLabel: "No ar" | "Indisponível";
}

const PRODUCT_NAME = "ZooTech" as const;

function unavailableModel(): AvailabilityViewModel {
  return {
    productName: PRODUCT_NAME,
    availability: "unavailable",
    availabilityLabel: "Indisponível",
  };
}

function availableModel(): AvailabilityViewModel {
  return {
    productName: PRODUCT_NAME,
    availability: "available",
    availabilityLabel: "No ar",
  };
}

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("status" in value) || !("service" in value)) {
    return false;
  }

  const status = value.status;
  const service = value.service;

  return (
    status === "ok" && typeof service === "string" && service.length > 0
  );
}

export async function getAvailability(): Promise<AvailabilityViewModel> {
  const apiUrl = process.env.API_URL ?? "http://127.0.0.1:3333";

  try {
    const response = await fetch(`${apiUrl}/health`, { cache: "no-store" });
    if (!response.ok) {
      return unavailableModel();
    }

    const body: unknown = await response.json();
    if (!isHealthResponse(body)) {
      return unavailableModel();
    }

    return availableModel();
  } catch {
    return unavailableModel();
  }
}
