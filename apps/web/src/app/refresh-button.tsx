"use client";

import { Button } from "@zootech/ui";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function RefreshButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      onClick={() => {
        router.refresh();
      }}
      aria-label="Atualizar"
    >
      <RefreshCw aria-hidden="true" />
      Atualizar
    </Button>
  );
}
