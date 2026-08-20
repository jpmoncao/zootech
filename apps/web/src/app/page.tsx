import { Activity } from "lucide-react";

import { getAvailability } from "../application/get-availability";
import { RefreshButton } from "./refresh-button";

export default async function Page() {
  const model = await getAvailability();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">{model.productName}</h1>
      <p
        className="flex min-h-11 items-center gap-2 text-base"
        role="status"
        aria-live="polite"
      >
        <Activity aria-hidden="true" className="size-5 shrink-0" />
        {model.availabilityLabel}
      </p>
      <RefreshButton />
    </main>
  );
}
