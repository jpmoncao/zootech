import { Activity } from "lucide-react";

import { getAvailability } from "../application/get-availability";
import { RefreshButton } from "./refresh-button";

export default async function Page() {
  const model = await getAvailability();
  const unavailable = model.availability === "unavailable";

  return (
    <div className="flex max-w-md flex-col gap-6">
      <p
        className={
          unavailable
            ? "flex min-h-11 items-center gap-2 text-base text-foreground"
            : "flex min-h-11 items-center gap-2 text-base text-primary"
        }
        role="status"
        aria-live="polite"
      >
        <Activity aria-hidden="true" className="size-5 shrink-0" />
        {model.availabilityLabel}
      </p>
      <RefreshButton />
    </div>
  );
}
