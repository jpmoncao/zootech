"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { ControlSelect } from "@/components/control-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  criarAgendamento,
  listarAnimais,
  remarcarAgendamento,
  type AgendamentoVacinacao,
  type Animal,
  type AvisoAplicacao,
  type PublicUser,
  type Vacina,
} from "@/lib/api";
import { BlocoAviso, formatarInstante } from "./comum";

/** Instante local no formato aceito por `<input type="datetime-local">`. */
function paraCampoLocal(iso: string | null): string {
  const base = iso ? new Date(iso) : new Date();
  if (Number.isNaN(base.getTime())) return "";
  const ajustado = new Date(base.getTime() - base.getTimezoneOffset() * 60_000);
  return ajustado.toISOString().slice(0, 16);
}

export function DialogoAgendamento({
  open,
  vacinas,
  usuarios,
  usuarioAtual,
  remarcando,
  onOpenChange,
  onSalvo,
}: {
  open: boolean;
  vacinas: Vacina[];
  /** Vazio quando o perfil não pode listar usuários; o campo cai para "eu" ou ninguém. */
  usuarios: Pick<PublicUser, "id" | "nome">[];
  usuarioAtual: Pick<PublicUser, "id" | "nome"> | null;
  /** Quando presente, o diálogo remarca este agendamento em vez de criar outro. */
  remarcando?: AgendamentoVacinacao | null;
  onOpenChange: (open: boolean) => void;
  onSalvo: () => Promise<void> | void;
}) {
  const [buscaAnimal, setBuscaAnimal] = useState("");
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [animalId, setAnimalId] = useState("");
  const [vacinaId, setVacinaId] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<AvisoAplicacao[]>([]);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setAvisos([]);
    setSalvando(false);
    setMotivo("");
    if (remarcando) {
      setAnimalId(String(remarcando.animalId));
      setVacinaId(String(remarcando.vacinaId));
      setDataHora(paraCampoLocal(remarcando.dataHoraPrevista));
      setResponsavelId(remarcando.responsavel ? String(remarcando.responsavel.id) : "");
      setObservacao(remarcando.observacao ?? "");
      return;
    }
    setAnimalId("");
    setVacinaId("");
    setDataHora(paraCampoLocal(null));
    setResponsavelId("");
    setObservacao("");
    setBuscaAnimal("");
  }, [open, remarcando]);

  // Busca de animal só na criação: remarcar não troca animal nem vacina.
  useEffect(() => {
    if (!open || remarcando) return;
    let cancelado = false;
    const timer = setTimeout(() => {
      listarAnimais({ busca: buscaAnimal.trim() || undefined, limite: 20 })
        .then((lista) => {
          if (!cancelado) setAnimais(lista.items);
        })
        .catch(() => {
          if (!cancelado) setAnimais([]);
        });
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [open, remarcando, buscaAnimal]);

  const opcoesResponsavel = useMemo(() => {
    const opcoes = [{ value: "", label: "Sem responsável" }];
    if (usuarioAtual) opcoes.push({ value: String(usuarioAtual.id), label: `${usuarioAtual.nome} (eu)` });
    for (const usuario of usuarios) {
      if (usuarioAtual && usuario.id === usuarioAtual.id) continue;
      opcoes.push({ value: String(usuario.id), label: usuario.nome });
    }
    return opcoes;
  }, [usuarios, usuarioAtual]);

  const podeEnviar = Boolean(dataHora) && (remarcando ? true : Boolean(animalId) && Boolean(vacinaId)) && !salvando;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!podeEnviar) return;
    setSalvando(true);
    setErro(null);
    setAvisos([]);
    try {
      const dataHoraPrevista = new Date(dataHora).toISOString();
      if (remarcando) {
        await remarcarAgendamento(remarcando.id, {
          dataHoraPrevista,
          responsavelId: responsavelId ? Number(responsavelId) : null,
          observacao: observacao.trim() || null,
          motivo: motivo.trim() || undefined,
        });
      } else {
        const resposta = await criarAgendamento({
          animalId: Number(animalId),
          vacinaId: Number(vacinaId),
          dataHoraPrevista,
          responsavelId: responsavelId ? Number(responsavelId) : null,
          observacao: observacao.trim() || null,
        });
        if (resposta.avisos.length > 0) {
          // O agendamento foi criado; os avisos dizem o que vai exigir atenção na baixa.
          setAvisos(resposta.avisos);
          await onSalvo();
          setSalvando(false);
          return;
        }
      }
      await onSalvo();
      onOpenChange(false);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar o agendamento.");
    } finally {
      setSalvando(false);
    }
  }

  const ativas = vacinas.filter((vacina) => vacina.ativa);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{remarcando ? "Remarcar agendamento" : "Novo agendamento"}</DialogTitle>
          <DialogDescription>
            {remarcando
              ? "O agendamento continua em aberto, com a data nova. Animal e vacina não mudam."
              : "A dose prevista é calculada a partir do que já foi aplicado no animal."}
          </DialogDescription>
        </DialogHeader>

        {avisos.length > 0 ? (
          <div className="[display:flex] [flex-direction:column] [gap:8px]">
            <BlocoAviso titulo="Agendamento criado, com ressalvas">
              <ul className="[margin:0] [padding-left:16px]">
                {avisos.map((aviso) => (
                  <li key={aviso.codigo}>{aviso.message}</li>
                ))}
              </ul>
            </BlocoAviso>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Entendi
            </Button>
          </div>
        ) : (
          <form className="[display:flex] [flex-direction:column] [gap:12px]" onSubmit={enviar}>
            {remarcando ? (
              <p className="[font-size:13px] [color:var(--muted)]">
                {remarcando.animal.nome} · {remarcando.vacina.nome} · dose {remarcando.numeroDosePrevista} · atual{" "}
                {formatarInstante(remarcando.dataHoraPrevista)}
              </p>
            ) : (
              <>
                {/* Busca no servidor: a lista de animais não cabe num filtro local. */}
                <div className="[display:flex] [flex-direction:column] [gap:6px]">
                  <Label htmlFor="agendamento-busca">Buscar animal</Label>
                  <Input
                    id="agendamento-busca"
                    value={buscaAnimal}
                    disabled={salvando}
                    placeholder="Nome ou número de registro"
                    onChange={(evento) => setBuscaAnimal(evento.target.value)}
                  />
                </div>
                <div className="[display:flex] [flex-direction:column] [gap:6px]">
                  <Label htmlFor="agendamento-animal">Animal *</Label>
                  <ControlSelect
                    id="agendamento-animal"
                    value={animalId}
                    placeholder={animais.length === 0 ? "Nenhum animal encontrado" : "Selecione o animal"}
                    disabled={salvando || animais.length === 0}
                    onValueChange={setAnimalId}
                    options={animais.map((animal) => ({
                      value: String(animal.id),
                      label: `${animal.nome} · ${animal.numeroRegistro}`,
                    }))}
                  />
                  {animais.length === 20 ? (
                    <p className="[font-size:12px] [color:var(--muted)]">
                      Mostrando os 20 primeiros. Refine a busca se não achar o animal.
                    </p>
                  ) : null}
                </div>
                <div className="[display:flex] [flex-direction:column] [gap:6px]">
                  <Label htmlFor="agendamento-vacina">Vacina *</Label>
                  <ControlSelect
                    id="agendamento-vacina"
                    value={vacinaId}
                    placeholder="Selecione a vacina"
                    disabled={salvando}
                    onValueChange={setVacinaId}
                    options={ativas.map((vacina) => ({ value: String(vacina.id), label: vacina.nome }))}
                  />
                </div>
              </>
            )}

            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              <Label htmlFor="agendamento-data">Data e hora previstas *</Label>
              <Input
                id="agendamento-data"
                type="datetime-local"
                value={dataHora}
                disabled={salvando}
                onChange={(evento) => setDataHora(evento.target.value)}
              />
            </div>

            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              <Label htmlFor="agendamento-responsavel">Responsável</Label>
              <ControlSelect
                id="agendamento-responsavel"
                value={responsavelId}
                placeholder="Sem responsável"
                disabled={salvando}
                onValueChange={setResponsavelId}
                options={opcoesResponsavel}
              />
            </div>

            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              <Label htmlFor="agendamento-observacao">Observação</Label>
              <Input
                id="agendamento-observacao"
                value={observacao}
                disabled={salvando}
                maxLength={1000}
                onChange={(evento) => setObservacao(evento.target.value)}
              />
            </div>

            {remarcando ? (
              <div className="[display:flex] [flex-direction:column] [gap:6px]">
                <Label htmlFor="agendamento-motivo">Motivo da remarcação</Label>
                <Input
                  id="agendamento-motivo"
                  value={motivo}
                  disabled={salvando}
                  maxLength={500}
                  placeholder="Opcional, fica no histórico"
                  onChange={(evento) => setMotivo(evento.target.value)}
                />
              </div>
            ) : null}

            {erro ? <p className="[color:var(--crit)] [font-size:13px] [font-weight:600]">{erro}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={salvando} onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!podeEnviar}>
                {salvando ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                {remarcando ? "Remarcar" : "Agendar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
