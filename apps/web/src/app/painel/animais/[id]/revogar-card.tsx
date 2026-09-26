"use client";

import { FormEvent, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ControlSelect } from "@/components/control-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, SectionHeader } from "./ficha-ui";
import { ApiError, revogarSituacaoAnimal, type Animal, type SituacaoAnimal } from "@/lib/api";

export function RevogarFicha({ animal, onChanged }: { animal: Animal; onChanged: () => Promise<void> }) {
  return (
    <section id="revogacao-ficha" className="scroll-mt-4 [background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] gap-4 [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto]" aria-label="Revogação de estado terminal">
      <SectionHeader icon={<RotateCcw aria-hidden="true" />} title="Revogar estado terminal" note="Apenas Coordenação, com motivo obrigatório." />
      <RevogarTerminal animal={animal} onChanged={onChanged} />
    </section>
  );
}

function RevogarTerminal({ animal, onChanged }: { animal: Animal; onChanged: () => Promise<void> }) {
  const [situacao, setSituacao] = useState<Extract<SituacaoAnimal, "em_tratamento" | "em_quarentena_observacao" | "saudavel">>("em_tratamento");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (motivo.trim().length < 5) {
      setErro("Informe um motivo com pelo menos 5 caracteres.");
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmar() {
    setConfirmOpen(false);
    setSaving(true);
    setErro(null);
    try {
      await revogarSituacaoAnimal(animal.id, { situacao, motivo: motivo.trim() });
      setMotivo("");
      await onChanged();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível revogar a situação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className="[display:flex] [flex-direction:column] [gap:14px]" onSubmit={submit}>
        {erro ? (
          <Alert variant="destructive">
            <AlertDescription className="text-inherit">{erro}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px] max-[760px]:grid-cols-[1fr]">
          <Field label="Nova situação" htmlFor="animal-revogar-situacao">
            <ControlSelect
              id="animal-revogar-situacao"
              value={situacao}
              disabled={saving}
              onValueChange={(value) => setSituacao(value as typeof situacao)}
              options={[
                { value: "em_tratamento", label: "Em tratamento" },
                { value: "em_quarentena_observacao", label: "Quarentena/observação" },
                { value: "saudavel", label: "Saudável" },
              ]}
            />
          </Field>
          <Field label="Motivo obrigatório" htmlFor="animal-revogar-motivo">
            <Input id="animal-revogar-motivo" value={motivo} maxLength={500} disabled={saving} onChange={(event) => setMotivo(event.target.value)} />
          </Field>
        </div>
        <div className="[display:flex] [justify-content:flex-end] [gap:10px] [flex-wrap:wrap] max-[760px]:[&>*]:[width:100%]">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
            Revogar e auditar
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        title="Revogar estado terminal"
        description="Revogar o estado terminal deste animal? A ação fica registrada no histórico."
        confirmLabel="Revogar"
        onOpenChange={setConfirmOpen}
        onConfirm={() => void confirmar()}
      />
    </>
  );
}
