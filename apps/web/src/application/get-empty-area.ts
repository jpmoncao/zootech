import type { NavIconKey } from "./get-nav";

export type EmptyAreaId = "animals" | "enclosures";

export interface EmptyAreaViewModel {
  title: "Animais" | "Recintos";
  iconKey: Extract<NavIconKey, "paw" | "fence">;
}

export function getEmptyArea(id: EmptyAreaId): EmptyAreaViewModel {
  if (id === "animals") {
    return { title: "Animais", iconKey: "paw" };
  }

  return { title: "Recintos", iconKey: "fence" };
}
