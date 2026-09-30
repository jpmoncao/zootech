import type { Metadata } from "next";
import { Shell } from "../../components/shell";
import { DashboardContent } from "./dashboard-content";

export const metadata: Metadata = {
  title: "Painel",
};

export default function Page() {
  return (
    <Shell section="painel" title="Painel">
      <DashboardContent />
    </Shell>
  );
}
