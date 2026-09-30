"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ControlSelect } from "@/components/control-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  encerrarObservacaoAntirrabica,
  type EncerrarObservacaoAntirrabicaInput,
  type ObservacaoAntirrabica,
} from "@/lib/api";
import { BlocoAviso } from "./comum";

type SituacaoFinal = EncerrarObservacaoAntirrabicaInput["situacao"];

const SITUACOES: { value: SituacaoFinal; label: string }[] = [
  { value: "saudavel", label: "Saudável" },
  { value: "em_tratamento", label: "Em tratamento" },
  { value: "em_quarentena_observacao", label: "Quarentena/observação" },
  { value: "obito", label: "Óbito" },
];

/**
 * Encerrar exige conclusão escrita e desfecho: um período que fecha sem conclusão
 * não serve como registro sanitário, que é a razão de o CCZ controlar o prazo.
 */
export function DialogoEncerrarObservacao({
  open,
  animalId,
  periodo,
  onOpenChange,
  onEncerrado,
}: {
  open: boolean;
  animalId: number;
  periodo: ObservacaoAntirrabica | null;
  onOpenChange: (open: boolean) => void;
  onEncerrado: () => Promise<void> | void;
}) {
  const [observacaoFinal, setObservacaoFinal] = useState("");
  const [situacao, setSituacao] = useState<SituacaoFinal>("saudavel");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setObservacaoFinal("");
    setSituacao("saudavel");
    setErro(null);
    setSalvando(false);
  }, [open]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!observacaoFinal.trim() || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await encerrarObservacaoAntirrabica(animalId, { observacaoFinal: observacaoFinal.trim(), situacao });
      await onEncerrado();
      onOpenChange(false);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível encerrar agora.");
    } finally {
      setSalvando(false);
    }
  }

  const antecipado = periodo ? !periodo.vencida : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Encerrar observação antirrábica</DialogTitle>
          <DialogDescription>
            A conclusão do período e a nova situação do animal são obrigatórias e ficam no histórico.
          </DialogDescription>
        </DialogHeader>
        <form className="[display:flex] [flex-direction:column] [gap:12px]" onSubmit={enviar}>
          {periodo ? (
            <p className="[font-size:13px] [color:var(--muted)]">
              Período iniciado em {new Date(periodo.inicioEm).toLocaleDateString("pt-BR")} ·{" "}
              {periodo.diasDecorridos} de {periodo.periodoDias} dias decorridos.
            </p>
          ) : null}

          {antecipado ? (
            <BlocoAviso titulo="Encerramento antecipado">
              <span>
                O período de {periodo?.periodoDias} dias ainda não terminou. O encerramento é permitido e fica marcado
                como antecipado no histórico.
              </span>
            </BlocoAviso>
          ) : null}

          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="encerrar-observacao">Observação final *</Label>
            <Input
              id="encerrar-observacao"
              value={observacaoFinal}
              disabled={salvando}
              maxLength={2000}
              placeholder="Ex.: sem sinais neurológicos durante todo o período"
              onChange={(evento) => setObservacaoFinal(evento.target.value)}
            />
          </div>

          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="encerrar-situacao">Nova situação do animal *</Label>
            <ControlSelect
              id="encerrar-situacao"
              value={situacao}
              disabled={salvando}
              onValueChange={(valor) => setSituacao(valor as SituacaoFinal)}
              options={SITUACOES}
            />
            {situacao === "obito" ? (
              <p className="[font-size:12px] [color:var(--muted)]">
                Óbito deixa a ficha somente para consulta. Só a Coordenação pode revogar depois.
              </p>
            ) : null}
          </div>

          {erro ? <p className="[color:var(--crit)] [font-size:13px] [font-weight:600]">{erro}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={salvando} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!observacaoFinal.trim() || salvando}>
              {salvando ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Encerrar observação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
