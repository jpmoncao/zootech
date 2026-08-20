import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getNav } from "../application/get-nav";
import { Chassis } from "../components/chassis";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZooTech",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const destinations = getNav();

  return (
    <html lang="pt-BR">
      <body>
        <Chassis identity="ZooTech" destinations={destinations}>
          {children}
        </Chassis>
      </body>
    </html>
  );
}
