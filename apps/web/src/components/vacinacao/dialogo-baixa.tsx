"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  baixarAgendamento,
  obterVacinacaoDoAnimal,
  type AgendamentoVacinacao,
  type ProtocoloVacinal,
} from "@/lib/api";
import { BlocoAviso, diasEntre, formatarDataCivil, hojeCivil } from "./comum";
import { PropostaProximaDose, deveProporProximaDose } from "./proposta-proxima-dose";

/**
 * Dar baixa cria a aplicação e fecha o agendamento na mesma transação.
 * O aviso de dose adiantada aparece aqui também, antes da confirmação.
 */
export function DialogoBaixa({
  open,
  agendamento,
  onOpenChange,
  onBaixado,
}: {
  open: boolean;
  agendamento: AgendamentoVacinacao | null;
  onOpenChange: (open: boolean) => void;
  onBaixado: () => Promise<void> | void;
}) {
  const [hoje] = useState(hojeCivil);
  const [dataAplicacao, setDataAplicacao] = useState(hoje);
  const [lote, setLote] = useState("");
  const [validadeLote, setValidadeLote] = useState("");
  const [aplicadoPor, setAplicadoPor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [confirmaAdiantada, setConfirmaAdiantada] = useState(false);
  const [motivoAdiantada, setMotivoAdiantada] = useState("");
  const [protocolo, setProtocolo] = useState<ProtocoloVacinal | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [registrado, setRegistrado] = useState<ProtocoloVacinal | null>(null);

  useEffect(() => {
    if (!open || !agendamento) return;
    setRegistrado(null);
    setDataAplicacao(hoje);
    setLote("");
    setValidadeLote("");
    setAplicadoPor("");
    setObservacao(agendamento.observacao ?? "");
    setConfirmaAdiantada(false);
    setMotivoAdiantada("");
    setErro(null);
    setProtocolo(null);
    // O protocolo traz `dataMinimaProximaDose`, que é o que permite avisar antes do envio.
    let cancelado = false;
    obterVacinacaoDoAnimal(agendamento.animalId)
      .then((vacinacao) => {
        if (cancelado) return;
        setProtocolo(vacinacao.protocolos.find((item) => item.id === agendamento.protocoloId) ?? null);
      })
      .catch(() => {
        if (!cancelado) setProtocolo(null);
      });
    return () => {
      cancelado = true;
    };
  }, [open, agendamento, hoje]);

  const adiantamento = useMemo(() => {
    if (!protocolo?.dataMinimaProximaDose || !dataAplicacao) return null;
    const dias = diasEntre(dataAplicacao, protocolo.dataMinimaProximaDose);
    if (dias <= 0) return null;
    return { dias, dataMinima: protocolo.dataMinimaProximaDose, dataUltima: protocolo.dataUltimaAplicacao };
  }, [protocolo, dataAplicacao]);

  // A confirmação some junto com a condição, como no registro direto.
  useEffect(() => {
    if (!adiantamento) {
      setConfirmaAdiantada(false);
      setMotivoAdiantada("");
    }
  }, [adiantamento]);

  const futura = Boolean(dataAplicacao) && dataAplicacao > hoje;
  const faltaMotivo = Boolean(adiantamento) && confirmaAdiantada && !motivoAdiantada.trim();
  const precisaConfirmar = Boolean(adiantamento) && !confirmaAdiantada;
  const podeEnviar = Boolean(lote.trim()) && Boolean(dataAplicacao) && !futura && !precisaConfirmar && !faltaMotivo && !salvando;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!agendamento || !podeEnviar) return;
    setSalvando(true);
    setErro(null);
    try {
      const resultado = await baixarAgendamento(agendamento.id, {
        dataAplicacao,
        lote: lote.trim(),
        validadeLote: validadeLote || null,
        aplicadoPor: aplicadoPor.trim() || null,
        observacao: observacao.trim() || null,
        confirmaAdiantada: adiantamento ? true : undefined,
        motivoAdiantada: adiantamento ? motivoAdiantada.trim() : undefined,
      });
      await onBaixado();
      if (deveProporProximaDose(resultado.protocolo)) {
        setRegistrado(resultado.protocolo);
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível dar baixa agora.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{registrado ? "Próxima dose" : "Dar baixa no agendamento"}</DialogTitle>
          <DialogDescription>
            {registrado
              ? "Deixe o lembrete pronto para o esquema não parar no meio."
              : "A aplicação é registrada e o agendamento é fechado na mesma operação."}
          </DialogDescription>
        </DialogHeader>
        {registrado && agendamento ? (
          <PropostaProximaDose animalId={agendamento.animalId} protocolo={registrado} onConcluir={() => onOpenChange(false)} />
        ) : agendamento ? (
          <form className="[display:flex] [flex-direction:column] [gap:12px]" onSubmit={enviar}>
            <p className="[font-size:13px] [color:var(--muted)]">
              {agendamento.animal.nome} · {agendamento.animal.numeroRegistro} · {agendamento.vacina.nome} · dose{" "}
              {agendamento.numeroDosePrevista} de {agendamento.dosesPrevistas}
            </p>

            <div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:12px] max-[520px]:[grid-template-columns:1fr]">
              <div className="[display:flex] [flex-direction:column] [gap:6px]">
                <Label htmlFor="baixa-data">Data da aplicação *</Label>
                <Input
                  id="baixa-data"
                  type="date"
                  max={hoje}
                  value={dataAplicacao}
                  disabled={salvando}
                  onChange={(evento) => setDataAplicacao(evento.target.value)}
                />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px]">
                <Label htmlFor="baixa-lote">Lote *</Label>
                <Input
                  id="baixa-lote"
                  value={lote}
                  disabled={salvando}
                  maxLength={60}
                  onChange={(evento) => setLote(evento.target.value)}
                />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px]">
                <Label htmlFor="baixa-validade">Validade do lote</Label>
                <Input
                  id="baixa-validade"
                  type="date"
                  value={validadeLote}
                  disabled={salvando}
                  onChange={(evento) => setValidadeLote(evento.target.value)}
                />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px]">
                <Label htmlFor="baixa-aplicador">Aplicado por</Label>
                <Input
                  id="baixa-aplicador"
                  value={aplicadoPor}
                  disabled={salvando}
                  maxLength={120}
                  placeholder="Se não foi você"
                  onChange={(evento) => setAplicadoPor(evento.target.value)}
                />
              </div>
            </div>

            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              <Label htmlFor="baixa-observacao">Observação</Label>
              <Input
                id="baixa-observacao"
                value={observacao}
                disabled={salvando}
                maxLength={1000}
                onChange={(evento) => setObservacao(evento.target.value)}
              />
            </div>

            {futura ? (
              <BlocoAviso titulo="Data no futuro">
                <span>A data da aplicação não pode ser futura.</span>
              </BlocoAviso>
            ) : null}

            {adiantamento ? (
              <BlocoAviso titulo="Dose adiantada">
                <span>
                  Última dose em {formatarDataCivil(adiantamento.dataUltima)}. A dose seria regular a partir de{" "}
                  {formatarDataCivil(adiantamento.dataMinima)}:{" "}
                  {adiantamento.dias === 1 ? "falta 1 dia" : `faltam ${adiantamento.dias} dias`}.
                </span>
                <label className="[display:flex] [align-items:flex-start] [gap:8px] [font-weight:600]">
                  <Checkbox
                    checked={confirmaAdiantada}
                    disabled={salvando}
                    onCheckedChange={(marcado) => setConfirmaAdiantada(marcado === true)}
                  />
                  <span>Confirmo que quero aplicar adiantado</span>
                </label>
                {confirmaAdiantada ? (
                  <div className="[display:flex] [flex-direction:column] [gap:6px]">
                    <Label htmlFor="baixa-motivo-adiantada">Motivo *</Label>
                    <Input
                      id="baixa-motivo-adiantada"
                      value={motivoAdiantada}
                      disabled={salvando}
                      maxLength={500}
                      onChange={(evento) => setMotivoAdiantada(evento.target.value)}
                    />
                  </div>
                ) : null}
              </BlocoAviso>
            ) : null}

            {erro ? <p className="[color:var(--crit)] [font-size:13px] [font-weight:600]">{erro}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={salvando} onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!podeEnviar}>
                {salvando ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                Registrar aplicação
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
