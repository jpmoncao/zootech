"use client";

import { FormEvent, useState } from "react";
import { Loader2, Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { byline, Field, ListaRecolhida, painelFicha, SectionHeader } from "./ficha-ui";
import { adicionarPesagemAnimal, ApiError, type Animal } from "@/lib/api";

export function PesoFicha({ animal, disabled, onChanged }: { animal: Animal; disabled: boolean; onChanged: () => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const pesagens = animal.pesagens ?? [];
  const pesoMaisRecente = pesagens[0];
  return (
    <>
      <section id="peso-ficha" className={painelFicha} aria-label="Peso">
        <SectionHeader icon={<Scale aria-hidden="true" />} title="Peso" note={pesoMaisRecente ? "Última pesagem em destaque." : "Sem pesagens registradas."} />
        {pesoMaisRecente ? (
          <div className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3.5 [&_svg]:size-7 [&_svg]:text-[var(--primary)] [&_small]:text-xs [&_small]:text-[var(--muted)] [&_b]:block [&_b]:text-[22px]">
            <Scale aria-hidden="true" />
            <div>
              <small>Última pesagem</small>
              <b>{pesoMaisRecente.valorKg} kg</b>
              <p className="text-[13px] text-[var(--muted)] wrap-break-word">{byline(pesoMaisRecente.usuario?.nome, pesoMaisRecente.createdAt)}</p>
            </div>
          </div>
        ) : null}
        {!disabled ? (
          <div>
            <Button type="button" onClick={() => setAberto(true)}>
              <Plus aria-hidden="true" />
              Registrar peso
            </Button>
          </div>
        ) : null}
        <ListaRecolhida
          titulo="Pesagens"
          itens={pesagens.map((item) => ({
            id: item.id,
            title: `${item.valorKg} kg`,
            detail: item.observacao ?? "Sem observação",
            meta: byline(item.usuario?.nome, item.createdAt),
          }))}
        />
      </section>
      <PesagemForm animal={animal} disabled={disabled} open={aberto} onOpenChange={setAberto} onChanged={onChanged} />
    </>
  );
}

function PesagemForm({ animal, disabled, open, onOpenChange, onChanged }: { animal: Animal; disabled: boolean; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => Promise<void> }) {
  const [valorKg, setValorKg] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    if (!valorKg || Number(valorKg) <= 0) {
      setErro("Informe um peso maior que zero.");
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      await adicionarPesagemAnimal(animal.id, { valorKg: Number(valorKg), observacao: observacao.trim() || undefined });
      setValorKg("");
      setObservacao("");
      onOpenChange(false);
      await onChanged();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível registrar a pesagem.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova pesagem</DialogTitle>
          <DialogDescription>Informe o peso atual do animal.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          {erro ? <p className="m-0 text-[13px] font-bold text-[var(--crit)]">{erro}</p> : null}
          <Field label="Peso em kg" htmlFor="animal-peso-valor">
            <Input id="animal-peso-valor" type="number" min="0.001" step="0.001" inputMode="decimal" value={valorKg} disabled={disabled || saving} onChange={(event) => setValorKg(event.target.value)} />
          </Field>
          <Field label="Observação" htmlFor="animal-peso-obs">
            <Input id="animal-peso-obs" value={observacao} maxLength={240} disabled={disabled || saving} onChange={(event) => setObservacao(event.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={disabled || saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
              Registrar peso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
