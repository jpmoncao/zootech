"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Loader2, PauseCircle, PlayCircle, Plus, Syringe, TriangleAlert } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ApiError,
  anularAplicacaoVacina,
  interromperProtocoloVacinal,
  listarVacinas,
  obterVacinacaoDoAnimal,
  retomarProtocoloVacinal,
  type AplicacaoVacina,
  type ProtocoloVacinal,
  type ReacaoAdversa,
  type Vacina,
} from "@/lib/api";
import { DialogoAplicacao, type IdadeAnimal } from "./dialogo-aplicacao";
import { DialogoReacao } from "./dialogo-reacao";
import {
  desfechoLabel,
  diasEntre,
  formatarDataCivil,
  formatarInstante,
  gravidadeLabel,
  hojeCivil,
  LinhaDado,
  Selo,
  statusProtocoloLabel,
  type Tom,
} from "./comum";

export function SecaoVacinacao({
  animalId,
  somenteLeitura,
  podeOperar,
  podeAnular,
  podeRegistrarReacao,
  reacoes,
  idadeAnimal,
  onAnimalAlterado,
}: {
  animalId: number;
  somenteLeitura: boolean;
  podeOperar: boolean;
  podeAnular: boolean;
  podeRegistrarReacao: boolean;
  reacoes: ReacaoAdversa[];
  idadeAnimal: IdadeAnimal;
  onAnimalAlterado: () => Promise<void> | void;
}) {
  const [protocolos, setProtocolos] = useState<ProtocoloVacinal[]>([]);
  const [vacinas, setVacinas] = useState<Vacina[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aplicacaoAberta, setAplicacaoAberta] = useState(false);
  const [vacinaInicial, setVacinaInicial] = useState<number | null>(null);
  const [reacaoAberta, setReacaoAberta] = useState(false);
  const [aplicacaoDaReacao, setAplicacaoDaReacao] = useState<number | null>(null);
  const [reacaoEmEdicao, setReacaoEmEdicao] = useState<ReacaoAdversa | null>(null);
  const [anulando, setAnulando] = useState<AplicacaoVacina | null>(null);
  const [interrompendo, setInterrompendo] = useState<ProtocoloVacinal | null>(null);
  const [acaoErro, setAcaoErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [vacinacao, catalogo] = await Promise.all([obterVacinacaoDoAnimal(animalId), listarVacinas()]);
      setProtocolos(vacinacao.protocolos);
      setVacinas(catalogo);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível carregar a vacinação.");
    } finally {
      setCarregando(false);
    }
  }, [animalId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Aplicação, anulação e reação mexem em alertas e timeline: a ficha inteira precisa recarregar.
  const recarregarTudo = useCallback(async () => {
    await Promise.all([carregar(), onAnimalAlterado()]);
  }, [carregar, onAnimalAlterado]);

  async function anularConfirmado(motivo: string) {
    if (!anulando) return;
    setAcaoErro(null);
    try {
      await anularAplicacaoVacina(animalId, anulando.id, motivo);
      await recarregarTudo();
    } catch (error) {
      setAcaoErro(error instanceof ApiError ? error.message : "Não foi possível anular a aplicação.");
    } finally {
      setAnulando(null);
    }
  }

  async function interromperConfirmado(motivo: string) {
    if (!interrompendo) return;
    setAcaoErro(null);
    try {
      await interromperProtocoloVacinal(animalId, interrompendo.id, motivo);
      await recarregarTudo();
    } catch (error) {
      setAcaoErro(error instanceof ApiError ? error.message : "Não foi possível interromper o protocolo.");
    } finally {
      setInterrompendo(null);
    }
  }

  async function retomar(protocolo: ProtocoloVacinal) {
    setAcaoErro(null);
    try {
      await retomarProtocoloVacinal(animalId, protocolo.id);
      await recarregarTudo();
    } catch (error) {
      setAcaoErro(error instanceof ApiError ? error.message : "Não foi possível retomar o protocolo.");
    }
  }

  if (carregando) {
    return (
      <div className="[display:flex] [flex-direction:column] [gap:10px]">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="[display:flex] [flex-direction:column] [gap:10px] [align-items:flex-start]">
        <p className="[color:var(--crit)] [font-size:13px] [font-weight:600]">{erro}</p>
        <Button type="button" variant="outline" onClick={() => void carregar()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  const podeEscrever = podeOperar && !somenteLeitura;

  return (
    <div className="[display:flex] [flex-direction:column] [gap:16px]">
      {acaoErro ? <p className="[color:var(--crit)] [font-size:13px] [font-weight:600]">{acaoErro}</p> : null}

      <div className="[display:flex] [gap:8px] [flex-wrap:wrap]">
        {podeEscrever ? (
          <Button
            type="button"
            onClick={() => {
              setVacinaInicial(null);
              setAplicacaoAberta(true);
            }}
          >
            <Plus aria-hidden="true" />
            Registrar aplicação
          </Button>
        ) : null}
        {podeRegistrarReacao && !somenteLeitura ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setReacaoEmEdicao(null);
              setAplicacaoDaReacao(null);
              setReacaoAberta(true);
            }}
          >
            <TriangleAlert aria-hidden="true" />
            Registrar reação adversa
          </Button>
        ) : null}
      </div>

      {protocolos.length === 0 ? (
        <p className="[border:1px_solid_var(--line)] [border-radius:8px] [background:var(--bg)] [padding:12px] [margin:0] [font-size:13px] [color:var(--muted)]">
          Nenhuma vacina registrada para este animal.
        </p>
      ) : (
        <ul className="[margin:0] [padding:0] [list-style:none] [display:flex] [flex-direction:column] [gap:12px]">
          {protocolos.map((protocolo) => (
            <li
              key={protocolo.id}
              className="[border:1px_solid_var(--line)] [border-radius:8px] [padding:14px] [display:flex] [flex-direction:column] [gap:10px]"
            >
              <CabecalhoProtocolo protocolo={protocolo} />

              <div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:6px_16px] max-[560px]:[grid-template-columns:1fr]">
                <LinhaDado rotulo="Doses" valor={`${protocolo.dosesAplicadas} de ${protocolo.dosesPrevistas}`} />
                <LinhaDado rotulo="Última aplicação" valor={formatarDataCivil(protocolo.dataUltimaAplicacao)} />
                <LinhaDado rotulo="Próxima dose" valor={<ProximaDose protocolo={protocolo} />} />
                {protocolo.agendamentoEmAberto ? (
                  <LinhaDado
                    rotulo="Agendamento em aberto"
                    valor={`Dose ${protocolo.agendamentoEmAberto.numeroDosePrevista} · ${formatarInstante(protocolo.agendamentoEmAberto.dataHoraPrevista)}`}
                  />
                ) : null}
              </div>

              {protocolo.status === "interrompido" && protocolo.motivoInterrupcao ? (
                <p className="[font-size:13px] [color:var(--muted)] [margin:0]">
                  Interrompido por {protocolo.interrompidoPor?.nome ?? "—"}: {protocolo.motivoInterrupcao}
                </p>
              ) : null}

              <ListaDoses
                aplicacoes={protocolo.aplicacoes}
                reacoes={reacoes}
                podeAnular={podeAnular && !somenteLeitura}
                podeRegistrarReacao={podeRegistrarReacao && !somenteLeitura}
                onAnular={setAnulando}
                onReagir={(aplicacaoId) => {
                  setReacaoEmEdicao(null);
                  setAplicacaoDaReacao(aplicacaoId);
                  setReacaoAberta(true);
                }}
              />

              {podeEscrever ? (
                <div className="[display:flex] [gap:8px] [flex-wrap:wrap]">
                  {protocolo.status === "interrompido" ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => void retomar(protocolo)}>
                      <PlayCircle aria-hidden="true" />
                      Retomar protocolo
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setVacinaInicial(protocolo.vacinaId);
                          setAplicacaoAberta(true);
                        }}
                      >
                        <Syringe aria-hidden="true" />
                        Aplicar dose {protocolo.proximoNumeroDose}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setInterrompendo(protocolo)}>
                        <PauseCircle aria-hidden="true" />
                        Interromper
                      </Button>
                    </>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {reacoes.length > 0 ? (
        <ListaReacoes
          reacoes={reacoes}
          podeAtualizar={podeRegistrarReacao && !somenteLeitura}
          onAtualizar={(reacao) => {
            setReacaoEmEdicao(reacao);
            setAplicacaoDaReacao(null);
            setReacaoAberta(true);
          }}
        />
      ) : null}

      <DialogoAplicacao
        open={aplicacaoAberta}
        animalId={animalId}
        vacinas={vacinas}
        protocolos={protocolos}
        reacoes={reacoes}
        vacinaInicialId={vacinaInicial}
        idadeAnimal={idadeAnimal}
        onOpenChange={setAplicacaoAberta}
        onAplicado={recarregarTudo}
      />

      <DialogoReacao
        open={reacaoAberta}
        animalId={animalId}
        aplicacoes={protocolos.flatMap((protocolo) => protocolo.aplicacoes)}
        aplicacaoInicialId={aplicacaoDaReacao}
        atualizando={reacaoEmEdicao}
        onOpenChange={setReacaoAberta}
        onRegistrado={recarregarTudo}
      />

      <DialogoMotivo
        aberto={anulando !== null}
        titulo="Anular aplicação"
        descricao="A aplicação continua visível, marcada como anulada, e deixa de contar nas doses. O motivo é obrigatório."
        confirmar="Anular aplicação"
        onFechar={() => setAnulando(null)}
        onConfirmar={anularConfirmado}
      />

      <DialogoMotivo
        aberto={interrompendo !== null}
        titulo="Interromper protocolo"
        descricao="Enquanto interrompido, o protocolo não aceita novas doses e para de cobrar alertas. O motivo é obrigatório."
        confirmar="Interromper"
        onFechar={() => setInterrompendo(null)}
        onConfirmar={interromperConfirmado}
      />
    </div>
  );
}

function CabecalhoProtocolo({ protocolo }: { protocolo: ProtocoloVacinal }) {
  const tom: Tom =
    protocolo.status === "concluido" ? "ok" : protocolo.status === "interrompido" ? "muted" : "info";
  return (
    <div className="[display:flex] [align-items:center] [justify-content:space-between] [gap:10px] [flex-wrap:wrap]">
      <strong className="[font-size:15px]">{protocolo.vacina.nome}</strong>
      <div className="[display:flex] [gap:6px] [flex-wrap:wrap]">
        {protocolo.vacina.obrigatoria ? <Selo tom="warn">Obrigatória</Selo> : null}
        {!protocolo.vacina.ativa ? <Selo tom="muted">Vacina inativa</Selo> : null}
        <Selo tom={tom}>{statusProtocoloLabel[protocolo.status]}</Selo>
      </div>
    </div>
  );
}

function ProximaDose({ protocolo }: { protocolo: ProtocoloVacinal }) {
  if (protocolo.status === "interrompido") return <span>Protocolo interrompido</span>;
  if (!protocolo.dataProximaDose) return <span>Sem próxima dose prevista</span>;
  const dias = diasEntre(hojeCivil(), protocolo.dataProximaDose);
  const texto = formatarDataCivil(protocolo.dataProximaDose);
  if (dias < 0) {
    return (
      <span className="[color:var(--crit)]">
        {texto} · venceu há {Math.abs(dias) === 1 ? "1 dia" : `${Math.abs(dias)} dias`}
      </span>
    );
  }
  if (protocolo.diasAvisoProximaDose > 0 && dias <= protocolo.diasAvisoProximaDose) {
    return (
      <span className="[color:var(--warn)]">
        {texto} · {dias === 0 ? "vence hoje" : dias === 1 ? "em 1 dia" : `em ${dias} dias`}
      </span>
    );
  }
  return <span>{texto}</span>;
}

function ListaDoses({
  aplicacoes,
  reacoes,
  podeAnular,
  podeRegistrarReacao,
  onAnular,
  onReagir,
}: {
  aplicacoes: AplicacaoVacina[];
  reacoes: ReacaoAdversa[];
  podeAnular: boolean;
  podeRegistrarReacao: boolean;
  onAnular: (aplicacao: AplicacaoVacina) => void;
  onReagir: (aplicacaoId: number) => void;
}) {
  if (aplicacoes.length === 0) {
    return <p className="[font-size:13px] [color:var(--muted)] [margin:0]">Nenhuma dose aplicada ainda.</p>;
  }
  return (
    <ul className="[margin:0] [padding:0] [list-style:none] [display:flex] [flex-direction:column] [gap:8px] [border-top:1px_solid_var(--line)] [padding-top:10px]">
      {aplicacoes.map((aplicacao) => {
        const reacao = reacoes.find((item) => item.aplicacaoVacinaId === aplicacao.id);
        return (
          <li
            key={aplicacao.id}
            className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:10px] [flex-wrap:wrap] [font-size:13px]"
          >
            <div className="[display:flex] [flex-direction:column] [gap:4px] [min-width:0]">
              <span className={aplicacao.anulada ? "[text-decoration:line-through] [color:var(--muted)]" : "[font-weight:600]"}>
                Dose {aplicacao.numeroDose} · {formatarDataCivil(aplicacao.dataAplicacao)} · lote {aplicacao.lote}
              </span>
              <div className="[display:flex] [gap:6px] [flex-wrap:wrap]">
                {aplicacao.anulada ? <Selo tom="crit">Anulada</Selo> : null}
                {aplicacao.aplicadaAdiantada ? <Selo tom="warn">Adiantada</Selo> : null}
                {aplicacao.registroRetroativo ? <Selo tom="muted">Retroativa</Selo> : null}
                {reacao ? <Selo tom="warn">Reação {gravidadeLabel[reacao.gravidade].toLowerCase()}</Selo> : null}
              </div>
              {aplicacao.aplicadaAdiantada && aplicacao.motivoAdiantada ? (
                <span className="[color:var(--muted)]">
                  Adiantada em {aplicacao.diasAntecipacao} dia(s): {aplicacao.motivoAdiantada}
                </span>
              ) : null}
              {aplicacao.anulada && aplicacao.motivoAnulacao ? (
                <span className="[color:var(--muted)]">
                  Anulada por {aplicacao.anuladaPor?.nome ?? "—"}: {aplicacao.motivoAnulacao}
                </span>
              ) : null}
            </div>
            {!aplicacao.anulada ? (
              <div className="[display:flex] [gap:6px] [flex-wrap:wrap]">
                {podeRegistrarReacao && !reacao ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => onReagir(aplicacao.id)}>
                    Registrar reação
                  </Button>
                ) : null}
                {podeAnular ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => onAnular(aplicacao)}>
                    <Ban aria-hidden="true" />
                    Anular
                  </Button>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function ListaReacoes({
  reacoes,
  podeAtualizar,
  onAtualizar,
}: {
  reacoes: ReacaoAdversa[];
  podeAtualizar: boolean;
  onAtualizar: (reacao: ReacaoAdversa) => void;
}) {
  return (
    <div className="[display:flex] [flex-direction:column] [gap:8px]">
      <strong className="[font-size:14px]">Reações adversas</strong>
      <ul className="[margin:0] [padding:0] [list-style:none] [display:flex] [flex-direction:column] [gap:10px]">
        {reacoes.map((reacao) => (
          <li
            key={reacao.id}
            className="[border:1px_solid_var(--line)] [border-radius:8px] [padding:10px_12px] [display:flex] [flex-direction:column] [gap:6px] [font-size:13px]"
          >
            <div className="[display:flex] [align-items:center] [justify-content:space-between] [gap:10px] [flex-wrap:wrap]">
              <span className="[font-weight:600]">{reacao.resumo}</span>
              <div className="[display:flex] [gap:6px] [flex-wrap:wrap]">
                <Selo tom={reacao.gravidade === "grave" ? "crit" : reacao.gravidade === "moderada" ? "warn" : "muted"}>
                  {gravidadeLabel[reacao.gravidade]}
                </Selo>
                <Selo tom={reacao.emAcompanhamento ? "warn" : "ok"}>{desfechoLabel[reacao.desfecho]}</Selo>
              </div>
            </div>
            <span className="[color:var(--muted)]">
              Registrada em {formatarInstante(reacao.registradoEm)} por {reacao.registradoPor?.nome ?? "—"}
            </span>
            {reacao.atualizacoes.length > 0 ? (
              <ul className="[margin:0] [padding-left:14px] [display:flex] [flex-direction:column] [gap:4px] [color:var(--muted)]">
                {reacao.atualizacoes.map((atualizacao) => (
                  <li key={atualizacao.id}>
                    {formatarInstante(atualizacao.registradoEm)} · {desfechoLabel[atualizacao.desfecho]} ·{" "}
                    {atualizacao.resumo}
                  </li>
                ))}
              </ul>
            ) : null}
            {podeAtualizar && reacao.emAcompanhamento ? (
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onAtualizar(reacao)}>
                Atualizar desfecho
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Confirmação com motivo obrigatório, usada por anulação e interrupção. */
function DialogoMotivo({
  aberto,
  titulo,
  descricao,
  confirmar,
  onFechar,
  onConfirmar,
}: {
  aberto: boolean;
  titulo: string;
  descricao: string;
  confirmar: string;
  onFechar: () => void;
  onConfirmar: (motivo: string) => Promise<void> | void;
}) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setMotivo("");
      setEnviando(false);
    }
  }, [aberto]);

  return (
    <ConfirmDialog
      open={aberto}
      title={titulo}
      description={descricao}
      confirmLabel={confirmar}
      onOpenChange={(estado) => {
        if (!estado) onFechar();
      }}
      onConfirm={() => {
        if (!motivo.trim() || enviando) return;
        setEnviando(true);
        void onConfirmar(motivo.trim());
      }}
    >
      <div className="[display:flex] [flex-direction:column] [gap:6px]">
        <label className="[font-size:13px] [font-weight:600]" htmlFor="motivo-acao-vacinacao">
          Motivo *
        </label>
        <input
          id="motivo-acao-vacinacao"
          className="[height:38px] [border:1px_solid_var(--line)] [border-radius:6px] [padding:0_10px] [font:inherit] [background:var(--surface)]"
          value={motivo}
          maxLength={500}
          disabled={enviando}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
        {enviando ? (
          <span className="[display:flex] [align-items:center] [gap:6px] [font-size:12px] [color:var(--muted)]">
            <Loader2 className="animate-spin" aria-hidden="true" /> Enviando…
          </span>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}
