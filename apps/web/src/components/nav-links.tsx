"use client";

import { Button, cn } from "@zootech/ui";
import { Fence, House, PawPrint } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import type { NavDestination, NavIconKey } from "../application/get-nav";

const ICONS: Record<NavIconKey, LucideIcon> = {
  house: House,
  paw: PawPrint,
  fence: Fence,
};

export function NavLinks({
  destinations,
  orientation,
}: {
  destinations: readonly NavDestination[];
  orientation: "horizontal" | "vertical";
}) {
  const pathname = usePathname();

  return (
    <ul
      className={
        orientation === "horizontal"
          ? "grid grid-cols-3"
          : "flex flex-col gap-1"
      }
    >
      {destinations.map((destination) => {
        const current = pathname === destination.href;
        const Icon = ICONS[destination.iconKey];

        return (
          <li key={destination.id}>
            <Button
              asChild
              variant="ghost"
              className={cn(
                "w-full min-h-11",
                orientation === "horizontal" &&
                  "h-14 min-h-14 flex-col gap-1 rounded-none px-1 text-xs",
                orientation === "vertical" && "justify-start gap-2 px-3",
                current && "bg-accent font-semibold text-accent-foreground",
                current &&
                  orientation === "horizontal" &&
                  "border-t-2 border-primary",
                current &&
                  orientation === "vertical" &&
                  "border-l-2 border-primary",
              )}
            >
              <Link
                href={destination.href}
                aria-current={current ? "page" : undefined}
              >
                <Icon aria-hidden="true" />
                {destination.label}
              </Link>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
