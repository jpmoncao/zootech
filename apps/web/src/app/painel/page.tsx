import type { Metadata } from "next";
import { PostoTurno, Shell } from "../../components/shell";

export const metadata: Metadata = {
  title: "Painel",
};

export default function Page() {
  return (
    <Shell section="painel" title="Painel">
      <PostoTurno />
    </Shell>
  );
}
