"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit3, Loader2, Save } from "lucide-react";
import { Combobox } from "@/components/combobox";
import { ControlSelect } from "@/components/control-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckLine, especieLabel, Field, porteLabel, SectionHeader, sexoLabel, situacaoLabel, unidadeLabel } from "./ficha-ui";
import { opcoesRaca, racaFormValue } from "@/lib/raca-options";
import {
  ApiError,
  atualizarAnimal,
  criarRacaAnimal,
  listarRacasAnimais,
  type Animal,
  type AtualizarAnimalInput,
  type EspecieAnimal,
  type PorteAnimal,
  type RacaAnimal,
  type SexoAnimal,
  type SituacaoAnimal,
  type UnidadeIdadeAnimal,
} from "@/lib/api";

type FormFicha = {
  nome: string;
  numeroRegistro: string;
  especie: EspecieAnimal;
  racaId: string;
  novaRaca: string;
  sexo: SexoAnimal;
  porte: PorteAnimal;
  corPelagem: string;
  situacao: Exclude<SituacaoAnimal, "adotado">;
  emIsolamento: boolean;
  pesoAtualKg: string;
  dataAcolhimento: string;
  dataNascimento: string;
  idadeEstimadaQuantidade: string;
  idadeEstimadaUnidade: UnidadeIdadeAnimal;
  idadeAproximada: boolean;
  nasceuNoCcz: boolean;
  acolhidoPor: string;
};

function formFromAnimal(animal: Animal): FormFicha {
  return {
    nome: animal.nome,
    numeroRegistro: animal.numeroRegistro,
    especie: animal.especie,
    racaId: racaFormValue(animal),
    novaRaca: "",
    sexo: animal.sexo,
    porte: animal.porte,
    corPelagem: animal.corPelagem ?? "",
    situacao: animal.situacao === "adotado" ? "em_tratamento" : animal.situacao,
    emIsolamento: animal.emIsolamento,
    pesoAtualKg: animal.pesoAtualKg ? String(animal.pesoAtualKg) : "",
    dataAcolhimento: toDateInput(animal.dataAcolhimento),
    dataNascimento: toDateInput(animal.dataNascimento),
    idadeEstimadaQuantidade: animal.idadeEstimadaQuantidade != null ? String(animal.idadeEstimadaQuantidade) : "",
    idadeEstimadaUnidade: animal.idadeEstimadaUnidade ?? "meses",
    idadeAproximada: animal.idadeAproximada,
    nasceuNoCcz: animal.nasceuNoCcz,
    acolhidoPor: animal.acolhidoPor ?? "",
  };
}

async function resolverRacaFicha(form: FormFicha, racas: RacaAnimal[]) {
  if (form.racaId === "nova") {
    const nome = form.novaRaca.trim();
    const existente = racas.find((raca) => raca.nome.localeCompare(nome, "pt-BR", { sensitivity: "base" }) === 0);
    if (existente) return existente.id;
    return (await criarRacaAnimal({ especie: form.especie, nome })).id;
  }
  return form.racaId ? Number(form.racaId) : null;
}

function payloadFicha(form: FormFicha, racaId: number | null): AtualizarAnimalInput {
  return {
    nome: form.nome.trim(),
    numeroRegistro: form.numeroRegistro.trim(),
    especie: form.especie,
    racaId,
    sexo: form.sexo,
    porte: form.porte,
    corPelagem: form.corPelagem.trim() || null,
    situacao: form.situacao,
    emIsolamento: form.emIsolamento,
    pesoAtualKg: form.pesoAtualKg ? Number(form.pesoAtualKg) : null,
    dataAcolhimento: dateOrNull(form.dataAcolhimento),
    dataNascimento: dateOrNull(form.dataNascimento),
    idadeEstimadaQuantidade: form.idadeEstimadaQuantidade ? Number.parseInt(form.idadeEstimadaQuantidade, 10) : null,
    idadeEstimadaUnidade: form.idadeEstimadaQuantidade ? form.idadeEstimadaUnidade : null,
    idadeAproximada: form.idadeAproximada,
    nasceuNoCcz: form.nasceuNoCcz,
    acolhidoPor: form.acolhidoPor.trim() || null,
  };
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function dateOrNull(value: string) {
  return value ? `${value}T12:00:00.000Z` : null;
}

export function DadosFicha({ animal, disabled, onChanged, onDirtyChange }: { animal: Animal; disabled: boolean; onChanged: () => Promise<void>; onDirtyChange: (dirty: boolean) => void }) {
  return (
    <section className="@container scroll-mt-4 [background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] gap-4 [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto]" id="dados-ficha" aria-label="Dados da ficha">
      <SectionHeader icon={<Edit3 aria-hidden="true" />} title="Dados da ficha" note={disabled ? "Somente consulta." : ""} />
      <AnimalEditForm animal={animal} disabled={disabled} onChanged={onChanged} onDirtyChange={onDirtyChange} />
    </section>
  );
}

function AnimalEditForm({
  animal,
  disabled,
  onChanged,
  onDirtyChange,
}: {
  animal: Animal;
  disabled: boolean;
  onChanged: () => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [form, setForm] = useState<FormFicha>(() => formFromAnimal(animal));
  const [racas, setRacas] = useState<RacaAnimal[]>([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const baseline = useMemo(() => formFromAnimal(animal), [animal]);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  useEffect(() => {
    setForm(formFromAnimal(animal));
  }, [animal]);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    let cancelled = false;
    listarRacasAnimais(form.especie)
      .then((items) => {
        if (!cancelled) setRacas(items);
      })
      .catch(() => {
        if (!cancelled) setRacas([]);
      });
    return () => {
      cancelled = true;
    };
  }, [form.especie]);

  function update<K extends keyof FormFicha>(key: K, value: FormFicha[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErro(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    if (!form.nome.trim()) {
      setErro("Informe o nome do animal.");
      return;
    }
    if (!form.numeroRegistro.trim()) {
      setErro("Informe o número de registro.");
      return;
    }
    if (form.pesoAtualKg && Number(form.pesoAtualKg) <= 0) {
      setErro("O peso deve ser maior que zero.");
      return;
    }
    if (form.racaId === "nova" && !form.novaRaca.trim()) {
      setErro("Informe o nome da nova raça.");
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      await atualizarAnimal(animal.id, payloadFicha(form, await resolverRacaFicha(form, racas)));
      await onChanged();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível atualizar a ficha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="animal-edit-form" className="[display:flex] [flex-direction:column] [gap:14px]" onSubmit={submit}>
      {dirty && !disabled ? (
        <div className="[position:sticky] [top:0] [z-index:5] [border:1px_solid_#f0d7a4] [border-radius:8px] [background:var(--warn-50)] [color:var(--warn)] [padding:10px_12px] [display:flex] [flex-wrap:wrap] items-center [justify-content:flex-end] [gap:8px] [&_span]:[margin-right:auto] [&_span]:[font-weight:700]" role="status">
          <span>Alterações não salvas</span>
          <Button type="button" variant="outline" disabled={saving} onClick={() => setForm(formFromAnimal(animal))}>
            Descartar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
            Salvar alterações
          </Button>
        </div>
      ) : null}
      {erro ? (
        <Alert variant="destructive">
          <AlertDescription className="text-inherit">{erro}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px] max-[760px]:grid-cols-[1fr]">
        <Field label="Nome" htmlFor="animal-edit-nome" required>
          <Input id="animal-edit-nome" value={form.nome} maxLength={120} disabled={disabled || saving} onChange={(event) => update("nome", event.target.value)} />
        </Field>
        <Field label="Número de registro" htmlFor="animal-edit-registro" required>
          <Input id="animal-edit-registro" className="[font-family:var(--mono)] [font-size:14px]" value={form.numeroRegistro} maxLength={60} disabled={disabled || saving} onChange={(event) => update("numeroRegistro", event.target.value)} />
        </Field>
        <Field label="Espécie" htmlFor="animal-edit-especie">
          <ControlSelect
            id="animal-edit-especie"
            value={form.especie}
            disabled={disabled || saving}
            onValueChange={(value) => {
              update("especie", value as EspecieAnimal);
              update("racaId", "");
              update("novaRaca", "");
            }}
            options={Object.entries(especieLabel).map(([value, label]) => ({ value, label }))}
          />
        </Field>
        <Field label="Raça" htmlFor="animal-edit-raca">
          <Combobox
            id="animal-edit-raca"
            value={form.racaId || "none"}
            disabled={disabled || saving}
            searchPlaceholder="Filtrar raça"
            placeholder="Não informada"
            onChange={(value) => update("racaId", value === "none" ? "" : value)}
            options={opcoesRaca(racas)}
          />
        </Field>
        {form.racaId === "nova" ? (
          <Field label="Nome da raça" htmlFor="animal-edit-nova-raca">
            <Input id="animal-edit-nova-raca" value={form.novaRaca} maxLength={80} disabled={disabled || saving} onChange={(event) => update("novaRaca", event.target.value)} />
          </Field>
        ) : null}
        <Field label="Sexo" htmlFor="animal-edit-sexo">
          <ControlSelect id="animal-edit-sexo" value={form.sexo} disabled={disabled || saving} onValueChange={(value) => update("sexo", value as SexoAnimal)} options={Object.entries(sexoLabel).map(([value, label]) => ({ value, label }))} />
        </Field>
        <Field label="Porte" htmlFor="animal-edit-porte">
          <ControlSelect id="animal-edit-porte" value={form.porte} disabled={disabled || saving} onValueChange={(value) => update("porte", value as PorteAnimal)} options={Object.entries(porteLabel).map(([value, label]) => ({ value, label }))} />
        </Field>
        <Field label="Situação" htmlFor="animal-edit-situacao">
          <ControlSelect
            id="animal-edit-situacao"
            value={form.situacao}
            disabled={disabled || saving}
            onValueChange={(value) => update("situacao", value as FormFicha["situacao"])}
            options={(["em_tratamento", "em_quarentena_observacao", "em_observacao_antirrabica", "saudavel", "obito"] as const).map((situacao) => ({ value: situacao, label: situacaoLabel[situacao] }))}
          />
        </Field>
        <Field label="Peso atual em kg" htmlFor="animal-edit-peso">
          <Input id="animal-edit-peso" type="number" min="0.001" step="0.001" inputMode="decimal" value={form.pesoAtualKg} disabled={disabled || saving} onChange={(event) => update("pesoAtualKg", event.target.value)} />
        </Field>
        <Field label="Cor/pelagem" htmlFor="animal-edit-pelagem">
          <Input id="animal-edit-pelagem" value={form.corPelagem} maxLength={80} disabled={disabled || saving} onChange={(event) => update("corPelagem", event.target.value)} />
        </Field>
        <Field label="Data de acolhimento" htmlFor="animal-edit-acolhimento">
          <Input id="animal-edit-acolhimento" type="date" value={form.dataAcolhimento} disabled={disabled || saving} onChange={(event) => update("dataAcolhimento", event.target.value)} />
        </Field>
        <Field label="Data de nascimento" htmlFor="animal-edit-nascimento">
          <Input id="animal-edit-nascimento" type="date" value={form.dataNascimento} disabled={disabled || saving} onChange={(event) => update("dataNascimento", event.target.value)} />
        </Field>
        <Field label="Idade estimada" htmlFor="animal-edit-idade-qtd">
          <div className="grid [grid-template-columns:minmax(0,_1fr)_minmax(130px,_0.7fr)] [gap:8px] max-[760px]:grid-cols-[1fr]">
            <Input id="animal-edit-idade-qtd" type="number" min="0" step="1" inputMode="numeric" value={form.idadeEstimadaQuantidade} disabled={disabled || saving} onChange={(event) => update("idadeEstimadaQuantidade", event.target.value)} />
            <ControlSelect value={form.idadeEstimadaUnidade} disabled={disabled || saving} onValueChange={(value) => update("idadeEstimadaUnidade", value as UnidadeIdadeAnimal)} options={Object.entries(unidadeLabel).map(([value, label]) => ({ value, label }))} />
          </div>
        </Field>
        <Field label="Acolhido por" htmlFor="animal-edit-acolhido">
          <Input id="animal-edit-acolhido" value={form.acolhidoPor} maxLength={120} disabled={disabled || saving} onChange={(event) => update("acolhidoPor", event.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-2 @min-[42rem]:grid-cols-3">
        <CheckLine id="animal-edit-isolamento" label="Em isolamento clínico" checked={form.emIsolamento} disabled={disabled || saving} onChange={(value) => update("emIsolamento", value)} />
        <CheckLine id="animal-edit-idade-aprox" label="Idade aproximada" checked={form.idadeAproximada} disabled={disabled || saving} onChange={(value) => update("idadeAproximada", value)} />
        <CheckLine id="animal-edit-nasceu" label="Nasceu no CCZ" checked={form.nasceuNoCcz} disabled={disabled || saving} onChange={(value) => update("nasceuNoCcz", value)} />
      </div>
      <div className="[display:flex] [justify-content:flex-end] [gap:10px] [flex-wrap:wrap] max-[760px]:[&>*]:[width:100%]">
        <Button type="submit" disabled={disabled || saving || !dirty}>
          {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
          Salvar ficha
        </Button>
      </div>
    </form>
  );
}
