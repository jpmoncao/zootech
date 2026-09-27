"use client";

import { FormEvent, useState } from "react";
import { Loader2, Plus, Stethoscope } from "lucide-react";
import { ControlSelect } from "@/components/control-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { eventoLabel } from "@/lib/evento-animal";
import { byline, Field, ListaRecolhida, painelFicha, SectionHeader } from "./ficha-ui";
import { ApiError, registrarEventoAnimal, type Animal } from "@/lib/api";

export function ExamesFicha({ animal, disabled, onChanged }: { animal: Animal; disabled: boolean; onChanged: () => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const exames = (animal.eventos ?? []).filter((evento) => evento.tipo === "exame" || evento.tipo === "diagnostico");
  const exameRecente = exames[0];
  return (
    <>
      <section id="exames-ficha" className={painelFicha} aria-label="Exames e diagnósticos">
        <SectionHeader icon={<Stethoscope aria-hidden="true" />} title="Exames e diagnósticos" note={exameRecente ? eventoLabel[exameRecente.tipo] : "Sem exames ou diagnósticos."} />
        {exameRecente ? (
          <div className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3.5">
            <b className="text-sm">{eventoLabel[exameRecente.tipo]}</b>
            <p className="m-0 text-sm wrap-break-word">{exameRecente.resumo}</p>
            <p className="mt-1 text-[13px] text-[var(--muted)]">{byline(exameRecente.usuario?.nome, exameRecente.createdAt)}</p>
          </div>
        ) : null}
        {!disabled ? (
          <div>
            <Button type="button" onClick={() => setAberto(true)}>
              <Plus aria-hidden="true" />
              Registrar evento
            </Button>
          </div>
        ) : null}
        <ListaRecolhida
          titulo="Exames e diagnósticos"
          itens={exames.map((item) => ({
            id: item.id,
            title: eventoLabel[item.tipo],
            detail: item.resumo,
            meta: byline(item.usuario?.nome, item.createdAt),
          }))}
        />
      </section>
      <EventoForm animal={animal} disabled={disabled} open={aberto} onOpenChange={setAberto} onChanged={onChanged} />
    </>
  );
}

function EventoForm({ animal, disabled, open, onOpenChange, onChanged }: { animal: Animal; disabled: boolean; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => Promise<void> }) {
  const [tipo, setTipo] = useState<"exame" | "diagnostico">("exame");
  const [resumo, setResumo] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    if (resumo.trim().length < 3) {
      setErro("Informe o resumo do evento.");
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      await registrarEventoAnimal(animal.id, { tipo, resumo: resumo.trim() });
      setResumo("");
      onOpenChange(false);
      await onChanged();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível registrar o evento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exame ou diagnóstico</DialogTitle>
          <DialogDescription>Registre o tipo e um resumo do evento.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          {erro ? <p className="m-0 text-[13px] font-bold text-[var(--crit)]">{erro}</p> : null}
          <Field label="Tipo" htmlFor="animal-evento-tipo">
            <ControlSelect
              id="animal-evento-tipo"
              value={tipo}
              disabled={disabled || saving}
              onValueChange={(value) => setTipo(value as "exame" | "diagnostico")}
              options={[
                { value: "exame", label: "Exame" },
                { value: "diagnostico", label: "Diagnóstico" },
              ]}
            />
          </Field>
          <Field label="Resumo" htmlFor="animal-evento-resumo">
            <Input id="animal-evento-resumo" value={resumo} maxLength={160} disabled={disabled || saving} onChange={(event) => setResumo(event.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={disabled || saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
              Registrar evento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
