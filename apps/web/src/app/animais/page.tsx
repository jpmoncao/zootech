import { Fence, PawPrint } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getEmptyArea } from "../../application/get-empty-area";
import type { EmptyAreaViewModel } from "../../application/get-empty-area";

const ICONS: Record<EmptyAreaViewModel["iconKey"], LucideIcon> = {
  paw: PawPrint,
  fence: Fence,
};

export default function AnimaisPage() {
  const model = getEmptyArea("animals");
  const Icon = ICONS[model.iconKey];

  return (
    <div className="flex flex-col items-start gap-4">
      <Icon aria-hidden="true" className="size-8 text-muted-foreground" />
      <h1 className="text-2xl font-semibold tracking-tight">{model.title}</h1>
    </div>
  );
}
