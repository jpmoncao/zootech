import type { ReactNode } from "react";

import type { NavDestination } from "../application/get-nav";
import { NavLinks } from "./nav-links";

export interface ChassisProps {
  identity: "ZooTech";
  destinations: readonly NavDestination[];
  children: ReactNode;
}

export function Chassis({ identity, destinations, children }: ChassisProps) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden md:flex-row">
      <header className="border-b border-border px-4 py-3 md:hidden">
        <p className="text-lg font-semibold tracking-tight">{identity}</p>
      </header>

      <aside className="hidden w-56 shrink-0 flex-col border-r border-border px-4 py-6 md:flex">
        <p className="text-lg font-semibold tracking-tight">{identity}</p>
        <nav aria-label="Principal" className="mt-6">
          <NavLinks destinations={destinations} orientation="vertical" />
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 pb-24 md:pb-6">{children}</main>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background md:hidden"
      >
        <NavLinks destinations={destinations} orientation="horizontal" />
      </nav>
    </div>
  );
}
