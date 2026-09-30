"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { ControlSelect } from "@/components/control-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  registrarAplicacaoVacina,
  type ProtocoloVacinal,
  type ReacaoAdversa,
  type Vacina,
} from "@/lib/api";

/** Idade do animal em semanas, para avisar antes do envio. `aproximada` quando só há estimativa. */
export type IdadeAnimal = { semanas: number; aproximada: boolean } | null;
import { BlocoAviso, diasEntre, formatarDataCivil, gravidadeLabel, hojeCivil } from "./comum";
import { PropostaProximaDose, deveProporProximaDose } from "./proposta-proxima-dose";

export function DialogoAplicacao({
  open,
  animalId,
  vacinas,
  protocolos,
  reacoes,
  vacinaInicialId,
  idadeAnimal,
  onOpenChange,
  onAplicado,
}: {
  open: boolean;
  animalId: number;
  vacinas: Vacina[];
  protocolos: ProtocoloVacinal[];
  reacoes: ReacaoAdversa[];
  vacinaInicialId?: number | null;
  idadeAnimal?: IdadeAnimal;
  onOpenChange: (open: boolean) => void;
  onAplicado: () => Promise<void> | void;
}) {
  const [hoje] = useState(hojeCivil);
  const [vacinaId, setVacinaId] = useState("");
  const [dataAplicacao, setDataAplicacao] = useState(hoje);
  const [lote, setLote] = useState("");
  const [validadeLote, setValidadeLote] = useState("");
  const [aplicadoPor, setAplicadoPor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [retroativo, setRetroativo] = useState(false);
  const [confirmaAdiantada, setConfirmaAdiantada] = useState(false);
  const [motivoAdiantada, setMotivoAdiantada] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Depois de gravar, o diálogo troca o formulário pela proposta de agendar a próxima dose.
  const [registrado, setRegistrado] = useState<ProtocoloVacinal | null>(null);

  useEffect(() => {
    if (!open) return;
    setRegistrado(null);
    setVacinaId(vacinaInicialId ? String(vacinaInicialId) : "");
    setDataAplicacao(hoje);
    setLote("");
    setValidadeLote("");
    setAplicadoPor("");
    setObservacao("");
    setRetroativo(false);
    setConfirmaAdiantada(false);
    setMotivoAdiantada("");
    setErro(null);
  }, [open, vacinaInicialId, hoje]);

  const vacinaSelecionada = useMemo(
    () => vacinas.find((vacina) => String(vacina.id) === vacinaId) ?? null,
    [vacinas, vacinaId],
  );
  const protocolo = useMemo(
    () => protocolos.find((item) => String(item.vacinaId) === vacinaId) ?? null,
    [protocolos, vacinaId],
  );

  // Aviso calculado no cliente, antes do envio: a consulta já trouxe `dataMinimaProximaDose`.
  const adiantamento = useMemo(() => {
    if (!protocolo?.dataMinimaProximaDose || !dataAplicacao) return null;
    const dias = diasEntre(dataAplicacao, protocolo.dataMinimaProximaDose);
    if (dias <= 0) return null;
    return {
      dias,
      dataMinima: protocolo.dataMinimaProximaDose,
      dataUltima: protocolo.dataUltimaAplicacao,
      reforco: protocolo.dosesAplicadas >= protocolo.dosesPrevistas,
      intervalo: protocolo.dosesAplicadas >= protocolo.dosesPrevistas ? protocolo.revacinacaoDias : protocolo.intervaloDosesDias,
    };
  }, [protocolo, dataAplicacao]);

  // A confirmação some junto com a condição: ninguém confirma um adiantamento que não existe mais.
  useEffect(() => {
    if (!adiantamento) {
      setConfirmaAdiantada(false);
      setMotivoAdiantada("");
    }
  }, [adiantamento]);

  const reacaoAnterior = useMemo(() => {
    if (!protocolo) return null;
    const idsDoProtocolo = new Set(protocolo.aplicacoes.map((aplicacao) => aplicacao.id));
    return reacoes.find((reacao) => reacao.aplicacaoVacinaId !== null && idsDoProtocolo.has(reacao.aplicacaoVacinaId)) ?? null;
  }, [protocolo, reacoes]);

  const abaixoDaIdadeMinima =
    Boolean(vacinaSelecionada?.idadeMinimaSemanas) &&
    idadeAnimal != null &&
    idadeAnimal.semanas < (vacinaSelecionada?.idadeMinimaSemanas ?? 0);

  const futura = Boolean(dataAplicacao) && dataAplicacao > hoje;
  const faltaMotivo = Boolean(adiantamento) && confirmaAdiantada && !motivoAdiantada.trim();
  const precisaConfirmar = Boolean(adiantamento) && !confirmaAdiantada;
  const podeEnviar =
    Boolean(vacinaSelecionada) && Boolean(dataAplicacao) && Boolean(lote.trim()) && !futura && !precisaConfirmar && !faltaMotivo && !salvando;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!vacinaSelecionada || !podeEnviar) return;
    setSalvando(true);
    setErro(null);
    try {
      const resultado = await registrarAplicacaoVacina(animalId, {
        vacinaId: vacinaSelecionada.id,
        dataAplicacao,
        lote: lote.trim(),
        validadeLote: validadeLote || null,
        aplicadoPor: aplicadoPor.trim() || null,
        observacao: observacao.trim() || null,
        registroRetroativo: retroativo || undefined,
        confirmaAdiantada: adiantamento ? true : undefined,
        motivoAdiantada: adiantamento ? motivoAdiantada.trim() : undefined,
        numeroDoseEsperada: protocolo?.proximoNumeroDose,
      });
      await onAplicado();
      if (deveProporProximaDose(resultado.protocolo)) {
        setRegistrado(resultado.protocolo);
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível registrar a aplicação agora.");
    } finally {
      setSalvando(false);
    }
  }

  const ativas = vacinas.filter((vacina) => vacina.ativa);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{registrado ? "Próxima dose" : "Registrar aplicação de vacina"}</DialogTitle>
          <DialogDescription>
            {registrado
              ? "Deixe o lembrete pronto para o esquema não parar no meio."
              : "A dose é numerada pelo sistema a partir do que já foi aplicado neste animal."}
          </DialogDescription>
        </DialogHeader>
        {registrado ? (
          <PropostaProximaDose animalId={animalId} protocolo={registrado} onConcluir={() => onOpenChange(false)} />
        ) : (
        <form className="[display:flex] [flex-direction:column] [gap:12px]" onSubmit={enviar}>
          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="aplicacao-vacina">Vacina *</Label>
            <ControlSelect
              id="aplicacao-vacina"
              value={vacinaId}
              placeholder="Selecione a vacina"
              disabled={salvando}
              onValueChange={setVacinaId}
              options={ativas.map((vacina) => ({ value: String(vacina.id), label: vacina.nome }))}
            />
            {ativas.length === 0 ? (
              <p className="[font-size:12px] [color:var(--muted)]">Nenhuma vacina ativa no catálogo.</p>
            ) : null}
          </div>

          {protocolo ? (
            <p className="[font-size:12px] [color:var(--muted)]">
              {protocolo.dosesAplicadas} de {protocolo.dosesPrevistas} doses aplicadas. Esta será a dose {protocolo.proximoNumeroDose}.
            </p>
          ) : vacinaSelecionada ? (
            <p className="[font-size:12px] [color:var(--muted)]">
              Primeira dose desta vacina para o animal (esquema de {vacinaSelecionada.totalDoses} dose(s)).
            </p>
          ) : null}

          <div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:12px] max-[560px]:[grid-template-columns:1fr]">
            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              <Label htmlFor="aplicacao-data">Data da aplicação *</Label>
              <Input
                id="aplicacao-data"
                type="date"
                max={hoje}
                value={dataAplicacao}
                disabled={salvando}
                onChange={(evento) => setDataAplicacao(evento.target.value)}
              />
            </div>
            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              <Label htmlFor="aplicacao-lote">Lote *</Label>
              <Input
                id="aplicacao-lote"
                value={lote}
                disabled={salvando}
                maxLength={60}
                onChange={(evento) => setLote(evento.target.value)}
              />
            </div>
            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              <Label htmlFor="aplicacao-validade">Validade do lote</Label>
              <Input
                id="aplicacao-validade"
                type="date"
                value={validadeLote}
                disabled={salvando}
                onChange={(evento) => setValidadeLote(evento.target.value)}
              />
            </div>
            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              <Label htmlFor="aplicacao-aplicador">Aplicado por</Label>
              <Input
                id="aplicacao-aplicador"
                value={aplicadoPor}
                disabled={salvando}
                maxLength={120}
                placeholder="Se não foi você"
                onChange={(evento) => setAplicadoPor(evento.target.value)}
              />
            </div>
          </div>

          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="aplicacao-observacao">Observação</Label>
            <Input
              id="aplicacao-observacao"
              value={observacao}
              disabled={salvando}
              maxLength={1000}
              onChange={(evento) => setObservacao(evento.target.value)}
            />
          </div>

          <label className="[display:flex] [align-items:flex-start] [gap:8px] [font-size:13px]">
            <Checkbox
              checked={retroativo}
              disabled={salvando}
              onCheckedChange={(marcado) => setRetroativo(marcado === true)}
            />
            <span>
              Registro retroativo (dose anterior ao acolhimento ou à última registrada). Exige observação com a origem
              da informação.
            </span>
          </label>

          {futura ? (
            <BlocoAviso titulo="Data no futuro">
              <span>A data da aplicação não pode ser futura.</span>
            </BlocoAviso>
          ) : null}

          {abaixoDaIdadeMinima && vacinaSelecionada && idadeAnimal ? (
            <BlocoAviso titulo="Animal abaixo da idade mínima">
              <span>
                {vacinaSelecionada.nome} é indicada a partir de {vacinaSelecionada.idadeMinimaSemanas} semanas; o
                animal tem {idadeAnimal.aproximada ? "cerca de " : ""}
                {idadeAnimal.semanas} semana(s){idadeAnimal.aproximada ? " (idade estimada)" : ""}. O registro é
                aceito: é aviso, não impedimento.
              </span>
            </BlocoAviso>
          ) : null}

          {reacaoAnterior ? (
            <BlocoAviso titulo="Este animal já reagiu a esta vacina">
              <span>
                Reação {gravidadeLabel[reacaoAnterior.gravidade].toLowerCase()} registrada em{" "}
                {new Date(reacaoAnterior.registradoEm).toLocaleDateString("pt-BR")}: {reacaoAnterior.resumo}. É aviso,
                não impedimento.
              </span>
            </BlocoAviso>
          ) : null}

          {adiantamento ? (
            <BlocoAviso titulo={adiantamento.reforco ? "Reforço adiantado" : "Dose adiantada"}>
              <span>
                Última dose em {formatarDataCivil(adiantamento.dataUltima)}
                {adiantamento.intervalo ? `, intervalo previsto de ${adiantamento.intervalo} dias` : ""}. A dose seria
                regular a partir de {formatarDataCivil(adiantamento.dataMinima)}:{" "}
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
                  <Label htmlFor="aplicacao-motivo-adiantada">Motivo *</Label>
                  <Input
                    id="aplicacao-motivo-adiantada"
                    value={motivoAdiantada}
                    disabled={salvando}
                    maxLength={500}
                    placeholder="Por que aplicar antes do intervalo"
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
        )}
      </DialogContent>
    </Dialog>
  );
}
