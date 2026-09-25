import type { Animal, RacaAnimal } from "@/lib/api";

export type RacaOption = {
  value: string;
  label: string;
};

export function opcoesRaca(racas: RacaAnimal[]): RacaOption[] {
  const ordered = racas
    .filter((raca) => raca.tipo !== "nao_informada" && raca.tipo !== "outra")
    .sort((a, b) => {
      if (a.tipo === "srd" && b.tipo !== "srd") return -1;
      if (b.tipo === "srd" && a.tipo !== "srd") return 1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });

  return [
    { value: "none", label: "Não informada" },
    ...ordered.map((raca) => ({ value: String(raca.id), label: raca.nome })),
    { value: "nova", label: "Outra" },
  ];
}

export function racaFormValue(animal: Pick<Animal, "racaId" | "raca">): string {
  if (!animal.racaId || animal.raca?.tipo === "nao_informada") return "";
  if (animal.raca?.tipo === "outra") return "nova";
  return String(animal.racaId);
}
