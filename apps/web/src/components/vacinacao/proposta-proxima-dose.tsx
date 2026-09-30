"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, criarAgendamento, type ProtocoloVacinal } from "@/lib/api";
import { BlocoAviso, formatarDataCivil } from "./comum";

const HORA_PADRAO = "09:00";

/**
 * Depois de registrar uma dose, propõe agendar a próxima já preenchida com a data calculada.
 * Vem marcada por padrão, mas a pessoa pode desmarcar: nunca há criação silenciosa sem esta etapa.
 * O aviso de que a dose foi gravada fica visível, para não parecer que o envio falhou.
 */
export function PropostaProximaDose({
  animalId,
  protocolo,
  onConcluir,
}: {
  animalId: number;
  protocolo: ProtocoloVacinal;
  onConcluir: () => void;
}) {
  const [agendar, setAgendar] = useState(true);
  const [dia, setDia] = useState(protocolo.dataProximaDose ?? "");
  const [hora, setHora] = useState(HORA_PADRAO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    if (!agendar) {
      onConcluir();
      return;
    }
    if (!dia || !hora) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarAgendamento({
        animalId,
        vacinaId: protocolo.vacinaId,
        dataHoraPrevista: new Date(`${dia}T${hora}:00`).toISOString(),
      });
      onConcluir();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível agendar a próxima dose.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="[display:flex] [flex-direction:column] [gap:12px]">
      <BlocoAviso tom="info" titulo="Aplicação registrada">
        <span>
          {protocolo.vacina.nome}: {protocolo.dosesAplicadas} de {protocolo.dosesPrevistas} doses.
          {protocolo.dataProximaDose ? ` Próxima dose prevista em ${formatarDataCivil(protocolo.dataProximaDose)}.` : ""}
        </span>
      </BlocoAviso>

      <label className="[display:flex] [align-items:flex-start] [gap:8px] [font-size:14px] [font-weight:600]">
        <Checkbox checked={agendar} disabled={salvando} onCheckedChange={(marcado) => setAgendar(marcado === true)} />
        <span>Agendar a próxima dose</span>
      </label>

      {agendar ? (
        <div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:12px] max-[520px]:[grid-template-columns:1fr]">
          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="proxima-dia">Dia</Label>
            <Input id="proxima-dia" type="date" value={dia} disabled={salvando} onChange={(evento) => setDia(evento.target.value)} />
          </div>
          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="proxima-hora">Hora</Label>
            <Input id="proxima-hora" type="time" value={hora} disabled={salvando} onChange={(evento) => setHora(evento.target.value)} />
          </div>
        </div>
      ) : (
        <p className="[font-size:12px] [color:var(--muted)] [margin:0]">
          Sem agendamento, a próxima dose continua aparecendo como alerta na ficha quando estiver perto de vencer.
        </p>
      )}

      {erro ? <p className="[color:var(--crit)] [font-size:13px] [font-weight:600] [margin:0]">{erro}</p> : null}

      <DialogFooter>
        <Button type="button" disabled={salvando || (agendar && (!dia || !hora))} onClick={() => void confirmar()}>
          {salvando ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {agendar ? "Agendar e concluir" : "Concluir sem agendar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

/** A proposta só faz sentido quando há próxima dose e ainda não existe agendamento em aberto. */
export function deveProporProximaDose(protocolo: ProtocoloVacinal): boolean {
  return (
    protocolo.status !== "interrompido" &&
    protocolo.dataProximaDose !== null &&
    protocolo.agendamentoEmAberto === null
  );
}
