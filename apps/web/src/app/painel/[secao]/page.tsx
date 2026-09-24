import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Shell } from "../../../components/shell";
import { findSection } from "../../../lib/nav";

type PageProps = {
  params: Promise<{ secao: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { secao } = await params;
  const section = findSection(secao);
  return { title: section?.label ?? "ZooTech" };
}

export default async function Page({ params }: PageProps) {
  const { secao } = await params;
  const section = findSection(secao);
  if (!section || section.id === "painel") notFound();
  return <Shell section={section.id} title={section.label} />;
}
