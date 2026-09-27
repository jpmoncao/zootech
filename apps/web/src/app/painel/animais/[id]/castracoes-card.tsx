"use client";

import { FormEvent, useState } from "react";
import { ChevronDown, SliceIcon } from "lucide-react";
import { SectionHeader } from "./ficha-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, agendarCastracaoAnimal, avaliarCastracaoAnimal, cancelarCastracaoAnimal, concluirCastracaoAnimal, reagendarCastracaoAnimal, registrarCastracaoLegadaAnimal, type Animal, type CastracaoAnimal } from "@/lib/api";
import { castracaoAtual, castracaoStatusIcon, castracaoStatusIconTone, castracaoStatusLabel, castracaoStatusTone, formatarDataCastracao } from "@/lib/castracao-status";

type Action = "avaliar" | "legado" | "agendar" | "reagendar" | "concluir" | "cancelar";
const labels: Record<Action, string> = { avaliar: "Registrar não castrado", legado: "Registrar realizada anterior", agendar: "Agendar", reagendar: "Reagendar", concluir: "Concluir", cancelar: "Cancelar agendamento" };
function localDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function CastracoesCard({ animal, onChanged }: { animal: Animal; onChanged: () => Promise<void> }) {
  const records = [...(animal.castracoes ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
  const active = records.find((item) => item.estado === "agendada");
  const realized = records.some((item) => item.estado === "realizada");
  const current = castracaoAtual(records, animal.estadoCastracao);
  const StatusIcon = castracaoStatusIcon[animal.estadoCastracao];
  const [action, setAction] = useState<Action | null>(null);
  const [planned, setPlanned] = useState("");
  const [effective, setEffective] = useState("");
  const [withTime, setWithTime] = useState(false);
  const [observation, setObservation] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  function open(next: Action, record?: CastracaoAnimal) {
    setAction(next); setPlanned(localDateTime(record?.dataHoraPlanejada ?? null)); setEffective("");
    setWithTime(false); setObservation(record?.observacao ?? ""); setReason(""); setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!action || busy) return;
    setBusy(true); setError(null);
    try {
      if (action === "avaliar")
        await avaliarCastracaoAnimal(animal.id, { observacao: observation.trim() || undefined });

      if (action === "legado")
        await registrarCastracaoLegadaAnimal(animal.id, { dataEfetiva: effective ? (withTime ? new Date(effective).toISOString() : effective) : undefined, dataEfetivaTemHora: Boolean(effective && withTime), observacao: observation.trim() || undefined });

      if (action === "agendar" || action === "reagendar") {
        const date = new Date(planned);

        if (!planned || Number.isNaN(date.getTime()) || date <= new Date())
          throw new Error("Informe uma data e hora futuras.");

        const input = { dataHoraPlanejada: date.toISOString(), observacao: observation.trim() || undefined };

        if (action === "agendar")
          await agendarCastracaoAnimal(animal.id, input);
        else if (active)
          await reagendarCastracaoAnimal(animal.id, active.id, input);
      }

      if (action === "concluir" && active) {
        if (!effective)
          throw new Error("Informe a data efetiva do procedimento.");

        await concluirCastracaoAnimal(animal.id, active.id, { dataEfetiva: withTime ? new Date(effective).toISOString() : effective, dataEfetivaTemHora: withTime, observacao: observation.trim() || undefined });
      }

      if (action === "cancelar" && active) {
        if (reason.trim().length < 3)
          throw new Error("Informe um motivo com pelo menos três caracteres.");

        await cancelarCastracaoAnimal(animal.id, active.id, { motivo: reason.trim() });
      }

      await onChanged();
      setAction(null);
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Não foi possível salvar. Tente novamente.");
    }
    finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="@container min-w-0 scroll-mt-4 [background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] gap-4 [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto]" id="castracoes-ficha" aria-label="Castrações">
        <SectionHeader icon={<SliceIcon aria-hidden="true" />} title="Castrações" note="Monitoramento do status de castração do animal." />
      <div className={`grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-(--line)] bg-(--bg) p-3.5 @min-[24rem]:grid-cols-[42px_minmax(0,1fr)_auto] [&_b]:text-base [&_b]:font-bold [&_b]:leading-tight ${castracaoStatusTone[animal.estadoCastracao]}`}>
        <span className={`grid size-10.5 place-items-center rounded-lg ${castracaoStatusIconTone[animal.estadoCastracao]}`}>
          <StatusIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <strong>
            {castracaoStatusLabel[animal.estadoCastracao]}
          </strong>
          {current?.estado === "agendada" && (
            <p className="text-sm">
              Próximo agendamento: <strong>{formatarDataCastracao(current.dataHoraPlanejada)}</strong>
            </p>
          )}
          {current?.estado === "realizada" && (
            <p className="text-sm">
              Realizada em <strong>{formatarDataCastracao(current.dataEfetiva, current.dataEfetivaTemHora)}</strong>
              {current.origem === "legada" ? " · Registro anterior ao sistema" : ""}
            </p>
          )}
        </div>
      </div>

      {current?.observacao && <p className="text-sm text-(--muted)">{current.observacao}</p>}

      {!animal.somenteLeitura && (
        <div className="flex flex-wrap gap-2 border-b border-(--line) pb-4">
          {!active && !realized && (
            <>
              <Button size="sm" onClick={() => open("agendar")}>Agendar</Button>
              <Button size="sm" variant="outline" onClick={() => open("legado")}>Registrar realizada anterior</Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  animal.castracoes &&
                  animal.castracoes.length > 0 &&
                  animal.castracoes[animal.castracoes.length - 1]?.estado === "nao_castrado"
                }
                onClick={() => open("avaliar")}
              >
                Registrar não castrado
              </Button>
            </>
          )}
          {active && (
            <>
              <Button size="sm" variant="outline" onClick={() => open("reagendar", active)}>Reagendar</Button>
              <Button size="sm" onClick={() => open("concluir", active)}>Concluir</Button>
              <div>
                <Button size="sm" variant="destructive" onClick={() => open("cancelar", active)}>Cancelar agendamento</Button>
              </div>
            </>
          )}
        </div>
      )}
      <div>
        {records.length === 0 ? (
          <p className="text-sm text-(--muted)">Nenhum registro de agendamento.</p>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-0 text-sm font-semibold hover:bg-transparent"
              aria-expanded={historicoAberto}
              onClick={() => setHistoricoAberto((aberto) => !aberto)}
            >
              Histórico de agendamentos ({records.length})
              <ChevronDown className={`size-4 transition-transform ${historicoAberto ? "rotate-180" : ""}`} aria-hidden="true" />
            </Button>
            {historicoAberto && (
          <ol className="mt-2 space-y-3">
            {records.map((record) => (
              <li
                key={record.id}
                className={`rounded-lg border border-(--line) px-3 py-1 text-sm ${castracaoStatusTone[record.estado]}`}
              >
                <div className="space-y-0.5 ">
                  <strong className={`text-${castracaoStatusTone[record.estado]}`}>{castracaoStatusLabel[record.estado]}</strong>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {
                      record.dataHoraPlanejada &&
                      <p><strong>Planejada:</strong> {formatarDataCastracao(record.dataHoraPlanejada)}</p>
                    }

                    {
                      record.estado === "realizada" &&
                      <p><strong>Efetiva:</strong> {formatarDataCastracao(record.dataEfetiva, record.dataEfetivaTemHora)}</p>
                    }

                    {
                      record.dataAvaliacao &&
                      <p><strong>Avaliação:</strong> {formatarDataCastracao(record.dataAvaliacao, false)}</p>
                    }

                    {
                      record.observacao &&
                      <p><strong>Observação:</strong> {record.observacao}</p>
                    }

                    {
                      record.motivoCancelamento &&
                      <p><strong>Motivo:</strong> {record.motivoCancelamento}</p>
                    }
                  </div>

                  <div className="w-full h-px bg-(--line) my-2"></div>

                  <p className={`text-xs text-(--muted) pb-1 ${castracaoStatusTone[record.estado]}`}>
                    <strong>Registrado por:</strong> {record.usuario?.nome ?? "Usuário não identificado"} · {formatarDataCastracao(record.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
            )}
          </>
        )}
      </div>
      </section>
      <Dialog open={action !== null} onOpenChange={(value) => { if (!value && !busy) setAction(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action ? labels[action] : "Castração"}</DialogTitle>
            <DialogDescription>
              {animal.nome} · {animal.numeroRegistro}
              {action === "legado" ? ". A data pode ficar vazia quando for desconhecida." : ""}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            {(action === "agendar" || action === "reagendar") && (
              <div className="space-y-1.5">
                <Label htmlFor="castracao-planejada">Data e hora futuras</Label>
                <Input
                  id="castracao-planejada"
                  type="datetime-local"
                  required
                  value={planned}
                  onChange={(event) => setPlanned(event.target.value)}
                />
              </div>
            )}
            {(action === "legado" || action === "concluir") && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="castracao-efetiva">
                    Data efetiva{action === "legado" ? " (opcional)" : ""}
                  </Label>
                  <Input
                    id="castracao-efetiva"
                    type={withTime ? "datetime-local" : "date"}
                    required={action === "concluir"}
                    value={effective}
                    onChange={(event) => setEffective(event.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="castracao-hora"
                    checked={withTime}
                    onCheckedChange={(checked) => {
                      setWithTime(checked === true);
                      setEffective((value) => (checked === true ? "" : value.slice(0, 10)));
                    }}
                  />
                  <Label htmlFor="castracao-hora">Informar horário</Label>
                </div>
              </>
            )}
            {action !== "cancelar" && (
              <div className="space-y-1.5">
                <Label htmlFor="castracao-observacao">Observação (opcional)</Label>
                <Input
                  id="castracao-observacao"
                  maxLength={1000}
                  value={observation}
                  onChange={(event) => setObservation(event.target.value)}
                />
              </div>
            )}
            {action === "cancelar" && (
              <div className="space-y-1.5">
                <Label htmlFor="castracao-motivo">Motivo do cancelamento</Label>
                <Input
                  id="castracao-motivo"
                  required
                  minLength={3}
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setAction(null)}>Voltar</Button>
              <Button type="submit" disabled={busy} variant={action === "cancelar" ? "destructive" : "default"}>
                {busy ? "Salvando…" : "Confirmar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
