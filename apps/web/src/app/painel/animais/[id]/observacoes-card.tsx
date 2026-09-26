"use client";

import { FormEvent, useState } from "react";
import { Loader2, MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { byline, Field, ListaRecolhida, painelFicha, SectionHeader } from "./ficha-ui";
import { adicionarObservacaoAnimal, ApiError, type Animal } from "@/lib/api";

export function ObservacoesFicha({ animal, disabled, onChanged }: { animal: Animal; disabled: boolean; onChanged: () => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const observacoes = animal.observacoes ?? [];
  const observacaoRecente = observacoes[0];
  return (
    <>
      <section id="observacoes-ficha" className={painelFicha} aria-label="Observações">
        <SectionHeader icon={<MessageCircle aria-hidden="true" />} title="Observações" note={observacaoRecente ? "Última anotação em destaque." : "Sem observações."} />
        {observacaoRecente ? (
          <div className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3.5">
            <p className="m-0 text-sm wrap-break-word">{observacaoRecente.texto}</p>
            <p className="mt-1 text-[13px] text-[var(--muted)]">{byline(observacaoRecente.usuario?.nome, observacaoRecente.createdAt)}</p>
          </div>
        ) : null}
        {!disabled ? (
          <div>
            <Button type="button" onClick={() => setAberto(true)}>
              <Plus aria-hidden="true" />
              Registrar observação
            </Button>
          </div>
        ) : null}
        <ListaRecolhida
          titulo="Observações"
          itens={observacoes.map((item, index) => ({
            id: item.id,
            title: `Observação Nº ${(index + 1).toString().padStart(3, "0")}`,
            detail: item.texto,
            meta: byline(item.usuario?.nome, item.createdAt),
          }))}
        />
      </section>
      <ObservacaoForm animal={animal} disabled={disabled} open={aberto} onOpenChange={setAberto} onChanged={onChanged} />
    </>
  );
}

function ObservacaoForm({ animal, disabled, open, onOpenChange, onChanged }: { animal: Animal; disabled: boolean; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => Promise<void> }) {
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    if (texto.trim().length < 3) {
      setErro("Descreva a observação.");
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      await adicionarObservacaoAnimal(animal.id, { texto: texto.trim() });
      setTexto("");
      onOpenChange(false);
      await onChanged();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível registrar a observação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova observação</DialogTitle>
          <DialogDescription>Registre uma nota de acompanhamento.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          {erro ? <p className="m-0 text-[13px] font-bold text-[var(--crit)]">{erro}</p> : null}
          <Field label="Texto" htmlFor="animal-obs-texto">
            <textarea id="animal-obs-texto" className="min-h-[116px] w-full resize-y rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] focus-visible:border-[var(--primary)] focus-visible:shadow-[var(--focus)] focus-visible:outline-none" rows={5} value={texto} disabled={disabled || saving} onChange={(event) => setTexto(event.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={disabled || saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
              Registrar observação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
