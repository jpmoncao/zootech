import type { Metadata } from "next";
import { Shell } from "../../components/shell";

export const metadata: Metadata = {
  title: "Painel",
};

export default function Page() {
  return <Shell section="painel" title="Painel" />;
}
