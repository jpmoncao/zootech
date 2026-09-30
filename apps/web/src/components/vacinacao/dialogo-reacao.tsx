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
  registrarReacaoAdversa,
  type AplicacaoVacina,
  type DesfechoReacaoAdversa,
  type GravidadeReacaoAdversa,
  type ReacaoAdversa,
} from "@/lib/api";
import { desfechoLabel, gravidadeLabel } from "./comum";

const GRAVIDADES: GravidadeReacaoAdversa[] = ["leve", "moderada", "grave"];
const DESFECHOS: DesfechoReacaoAdversa[] = ["em_acompanhamento", "resolvida", "resolvida_com_sequela", "obito"];

/**
 * Registra uma reação nova ou atualiza o desfecho de uma existente.
 * O evento é imutável: atualizar é criar outro evento que referencia o original.
 */
export function DialogoReacao({
  open,
  animalId,
  aplicacoes,
  aplicacaoInicialId,
  atualizando,
  onOpenChange,
  onRegistrado,
}: {
  open: boolean;
  animalId: number;
  aplicacoes: AplicacaoVacina[];
  aplicacaoInicialId?: number | null;
  /** Quando presente, o diálogo atualiza o desfecho desta reação em vez de criar uma nova. */
  atualizando?: ReacaoAdversa | null;
  onOpenChange: (open: boolean) => void;
  onRegistrado: () => Promise<void> | void;
}) {
  const [resumo, setResumo] = useState("");
  const [gravidade, setGravidade] = useState<GravidadeReacaoAdversa>("leve");
  const [desfecho, setDesfecho] = useState<DesfechoReacaoAdversa>("em_acompanhamento");
  const [aplicacaoId, setAplicacaoId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setResumo("");
    setErro(null);
    setSalvando(false);
    if (atualizando) {
      setGravidade(atualizando.gravidade);
      setDesfecho(atualizando.desfecho);
      setAplicacaoId(atualizando.aplicacaoVacinaId ? String(atualizando.aplicacaoVacinaId) : "");
      return;
    }
    setGravidade("leve");
    setDesfecho("em_acompanhamento");
    setAplicacaoId(aplicacaoInicialId ? String(aplicacaoInicialId) : "");
  }, [open, atualizando, aplicacaoInicialId]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!resumo.trim() || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await registrarReacaoAdversa(animalId, {
        resumo: resumo.trim(),
        gravidadeReacao: gravidade,
        desfechoReacao: desfecho,
        aplicacaoVacinaId: aplicacaoId ? Number(aplicacaoId) : undefined,
        eventoOrigemId: atualizando?.id,
      });
      await onRegistrado();
      onOpenChange(false);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível registrar agora.");
    } finally {
      setSalvando(false);
    }
  }

  const naoAnuladas = aplicacoes.filter((aplicacao) => !aplicacao.anulada);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{atualizando ? "Atualizar desfecho da reação" : "Registrar reação adversa"}</DialogTitle>
          <DialogDescription>
            {atualizando
              ? "A reação original permanece no histórico. A atualização entra como novo registro da mesma cadeia."
              : "Qualquer perfil autenticado pode registrar. Ligar à aplicação permite rastrear reações por lote."}
          </DialogDescription>
        </DialogHeader>
        <form className="[display:flex] [flex-direction:column] [gap:12px]" onSubmit={enviar}>
          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="reacao-resumo">{atualizando ? "Evolução *" : "O que foi observado *"}</Label>
            <Input
              id="reacao-resumo"
              value={resumo}
              disabled={salvando}
              maxLength={240}
              placeholder={atualizando ? "Ex.: melhorou com suporte" : "Ex.: inchaço no local e prostração"}
              onChange={(evento) => setResumo(evento.target.value)}
            />
          </div>

          <div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:12px] max-[520px]:[grid-template-columns:1fr]">
            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              <Label htmlFor="reacao-gravidade">Gravidade *</Label>
              <ControlSelect
                id="reacao-gravidade"
                value={gravidade}
                disabled={salvando}
                onValueChange={(valor) => setGravidade(valor as GravidadeReacaoAdversa)}
                options={GRAVIDADES.map((item) => ({ value: item, label: gravidadeLabel[item] }))}
              />
            </div>
            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              <Label htmlFor="reacao-desfecho">Desfecho *</Label>
              <ControlSelect
                id="reacao-desfecho"
                value={desfecho}
                disabled={salvando}
                onValueChange={(valor) => setDesfecho(valor as DesfechoReacaoAdversa)}
                options={DESFECHOS.map((item) => ({ value: item, label: desfechoLabel[item] }))}
              />
            </div>
          </div>

          {!atualizando && naoAnuladas.length > 0 ? (
            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              <Label htmlFor="reacao-aplicacao">Aplicação relacionada</Label>
              <ControlSelect
                id="reacao-aplicacao"
                value={aplicacaoId}
                placeholder="Opcional"
                disabled={salvando}
                onValueChange={setAplicacaoId}
                options={naoAnuladas.map((aplicacao) => ({
                  value: String(aplicacao.id),
                  label: `Dose ${aplicacao.numeroDose} · ${aplicacao.dataAplicacao} · lote ${aplicacao.lote}`,
                }))}
              />
            </div>
          ) : null}

          {desfecho === "obito" ? (
            <p className="[font-size:12px] [color:var(--muted)]">
              O desfecho da reação não muda a situação do animal. Registrar óbito na ficha continua sendo ação separada.
            </p>
          ) : null}

          {erro ? <p className="[color:var(--crit)] [font-size:13px] [font-weight:600]">{erro}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={salvando} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!resumo.trim() || salvando}>
              {salvando ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {atualizando ? "Atualizar desfecho" : "Registrar reação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
