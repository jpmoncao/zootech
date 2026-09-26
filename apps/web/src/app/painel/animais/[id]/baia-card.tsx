"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { ControlSelect } from "@/components/control-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, SectionHeader } from "./ficha-ui";
import { alocarAnimal, ApiError, type Animal, type Baia } from "@/lib/api";

function ocupacaoBaia(baia: Baia) {
  const vagas = vagasBaia(baia);
  return [setorBaia(baia.setor), vagas ? `${vagas} ocupada(s)` : null].filter(Boolean).join(" · ");
}

function vagasBaia(baia: Pick<Baia, "ocupacao" | "capacidade">) {
  if (!Number.isFinite(baia.ocupacao) || !Number.isFinite(baia.capacidade)) return null;
  return `${baia.ocupacao}/${baia.capacidade}`;
}

function setorBaia(setor: Baia["setor"]) {
  const labels: Record<Baia["setor"], string> = {
    canil: "Canil",
    gatil: "Gatil",
    quarentena: "Quarentena",
  };
  return labels[setor];
}

export function BaiaFicha({ animal, baias, disabled, onChanged }: { animal: Animal; baias: Baia[]; disabled: boolean; onChanged: () => Promise<void> }) {
  return (
    <section className="@container min-w-0 scroll-mt-4 [background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] gap-4 [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto]" id="baia-ficha" aria-label="Baia e localização">
      <SectionHeader icon={<MapPin aria-hidden="true" />} title="Baia e localização" note="Alocação opcional" />

      <BaiaCard animal={animal} baias={baias} disabled={disabled} onChanged={onChanged} />
    </section>
  );
}

function BaiaCard({ animal, baias, disabled, onChanged }: { animal: Animal; baias: Baia[]; disabled: boolean; onChanged: () => Promise<void> }) {
  const [baiaId, setBaiaId] = useState(animal.baiaId ? String(animal.baiaId) : "");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setBaiaId(animal.baiaId ? String(animal.baiaId) : "");
    setObservacao("");
  }, [animal]);

  const baiaAtual = animal.baiaId ? String(animal.baiaId) : "none";
  const baiaSelecionada = !baiaId || baiaId === "none" ? "none" : baiaId;
  const alterou = baiaSelecionada !== baiaAtual || observacao.trim().length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || !alterou) return;
    setSaving(true);
    setErro(null);
    try {
      await alocarAnimal(animal.id, {
        baiaId: baiaId && baiaId !== "none" ? Number(baiaId) : null,
        observacao: observacao.trim() || undefined,
      });
      await onChanged();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível atualizar a baia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-1 items-start gap-5">
        <div className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-(--line)] bg-(--bg) p-3.5 @min-[24rem]:grid-cols-[42px_minmax(0,1fr)_auto] [&_b]:text-base [&_b]:font-bold [&_b]:leading-tight">
          <span className="grid size-10.5 place-items-center rounded-lg bg-(--primary-50) text-(--primary)">
            <MapPin aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <strong>
              {animal.baia?.codigo
                ? `Código: ${animal.baia.codigo}`
                : "Sem baia alocada"}
            </strong>
            <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">
              {animal.baia
                ? ocupacaoBaia(animal.baia)
                : "O animal pode permanecer sem baia durante o tratamento."}
            </p>
            {animal.emIsolamento && (
              <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere] bg-(--warn-50) text-(--warn) rounded-lg py-0.5 px-2 w-fit">O animal está em isolamento clínico.</p>
            )}
          </div>
          {animal.baia ? (
            <Button asChild variant="outline" className="col-span-full @min-[24rem]:col-auto @min-[24rem]:col-start-3">
              <Link href={`/painel/baias?baia=${animal.baia.id}`}>Abrir baia</Link>
            </Button>
          ) : null}
        </div>
        <form className="[display:flex] [flex-direction:column] [gap:14px]" onSubmit={submit}>
          {erro ? (
            <Alert variant="destructive">
              <AlertDescription className="text-inherit">{erro}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid grid-cols-1 gap-3 @min-[32rem]:grid-cols-2">
            <Field label="Nova alocação" htmlFor="animal-baia-select">
              <ControlSelect
                id="animal-baia-select"
                value={baiaId || "none"}
                disabled={disabled || saving}
                onValueChange={setBaiaId}
                options={[
                  { value: "none", label: "Sem baia" },
                  ...baias.map((baia) => ({
                    value: String(baia.id),
                    label: [baia.codigo, setorBaia(baia.setor), vagasBaia(baia)].filter(Boolean).join(" · "),
                  })),
                ]}
              />
            </Field>
            <Field label="Observação da movimentação" htmlFor="animal-baia-obs">
              <Input id="animal-baia-obs" value={observacao} maxLength={240} disabled={disabled || saving} onChange={(event) => setObservacao(event.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap justify-end gap-2.5 @max-[24rem]:[&>*]:w-full">
            <Button type="submit" disabled={disabled || saving || !alterou}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MapPin aria-hidden="true" />}
              Atualizar baia
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
