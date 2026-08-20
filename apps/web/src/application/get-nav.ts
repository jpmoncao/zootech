export type NavDestinationId = "home" | "animals" | "enclosures";

export type NavIconKey = "house" | "paw" | "fence";

export type NavHref = "/" | "/animais" | "/recintos";

export type NavLabel = "Início" | "Animais" | "Recintos";

export interface NavDestination {
  id: NavDestinationId;
  href: NavHref;
  label: NavLabel;
  iconKey: NavIconKey;
}

const DESTINATIONS: readonly NavDestination[] = [
  { id: "home", href: "/", label: "Início", iconKey: "house" },
  { id: "animals", href: "/animais", label: "Animais", iconKey: "paw" },
  { id: "enclosures", href: "/recintos", label: "Recintos", iconKey: "fence" },
];

export function getNav(): readonly NavDestination[] {
  return DESTINATIONS;
}
