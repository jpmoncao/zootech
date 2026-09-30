"use client";

import { ReactNode } from "react";
import type {
  DesfechoReacaoAdversa,
  GravidadeReacaoAdversa,
  StatusProtocoloVacinal,
} from "@/lib/api";

export const gravidadeLabel: Record<GravidadeReacaoAdversa, string> = {
  leve: "Leve",
  moderada: "Moderada",
  grave: "Grave",
};

export const desfechoLabel: Record<DesfechoReacaoAdversa, string> = {
  em_acompanhamento: "Em acompanhamento",
  resolvida: "Resolvida",
  resolvida_com_sequela: "Resolvida com sequela",
  obito: "Óbito",
};

export const statusProtocoloLabel: Record<StatusProtocoloVacinal, string> = {
  em_andamento: "Em andamento",
  concluido: "Concluído",
  interrompido: "Interrompido",
};

/** Data civil (AAAA-MM-DD) formatada sem passar por fuso: o valor já é a data que vale. */
export function formatarDataCivil(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
}

export function formatarInstante(valor: string | null): string {
  if (!valor) return "—";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Hoje como data civil, no mesmo fuso que a API usa para aferir "hoje". */
export function hojeCivil(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}

/**
 * Idade em semanas para os avisos de idade mínima. Data de nascimento conhecida prevalece;
 * sem ela, usa a estimativa e marca como aproximada. Sem nenhum dos dois, não há como avisar.
 */
export function idadeEmSemanas(animal: {
  dataNascimento: string | null;
  idadeEstimadaQuantidade: number | null;
  idadeEstimadaUnidade: "dias" | "meses" | "anos" | null;
}): { semanas: number; aproximada: boolean } | null {
  if (animal.dataNascimento) {
    const nascimento = Date.parse(`${animal.dataNascimento.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(nascimento)) return null;
    return { semanas: Math.max(Math.floor((Date.now() - nascimento) / (7 * 86_400_000)), 0), aproximada: false };
  }
  if (animal.idadeEstimadaQuantidade !== null && animal.idadeEstimadaUnidade) {
    const dias =
      animal.idadeEstimadaUnidade === "dias"
        ? animal.idadeEstimadaQuantidade
        : animal.idadeEstimadaQuantidade * (animal.idadeEstimadaUnidade === "meses" ? 30.44 : 365.25);
    return { semanas: Math.floor(dias / 7), aproximada: true };
  }
  return null;
}

export type Tom = "ok" | "warn" | "info" | "crit" | "muted";

export function Selo({ tom, children }: { tom: Tom; children: ReactNode }) {
  return (
    <span
      className="[min-height:24px] [border-radius:999px] [padding:4px_10px] [display:inline-flex] [align-items:center] [gap:6px] [width:fit-content] [font:700_12px/1_var(--body)] [white-space:nowrap] data-[tom=ok]:[background:var(--ok-50)] data-[tom=ok]:[color:var(--ok)] data-[tom=warn]:[background:var(--warn-50)] data-[tom=warn]:[color:var(--warn)] data-[tom=info]:[background:var(--info-50)] data-[tom=info]:[color:var(--info)] data-[tom=crit]:[background:var(--crit-50)] data-[tom=crit]:[color:var(--crit)] data-[tom=muted]:[background:var(--bg)] data-[tom=muted]:[color:var(--muted)] data-[tom=muted]:[border:1px_solid_var(--line)]"
      data-tom={tom}
    >
      {children}
    </span>
  );
}

/**
 * Bloco de aviso inline, acima do botão de confirmar. Não é toast nem diálogo empilhado:
 * o objetivo é a pessoa ler antes de decidir. Não depende só de cor — tem título e texto.
 */
export function BlocoAviso({
  tom = "warn",
  titulo,
  children,
}: {
  tom?: "warn" | "info";
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div
      className="[border-radius:8px] [padding:12px] [display:flex] [flex-direction:column] [gap:8px] [font-size:13px] data-[tom=warn]:[background:var(--warn-50)] data-[tom=warn]:[border:1px_solid_#f1d5a6] data-[tom=warn]:[color:#6b3f00] data-[tom=info]:[background:var(--info-50)] data-[tom=info]:[border:1px_solid_#c3d8ec] data-[tom=info]:[color:var(--info)]"
      data-tom={tom}
      role="status"
    >
      <strong className="[font-size:13px]">{titulo}</strong>
      {children}
    </div>
  );
}

export function LinhaDado({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="[display:flex] [justify-content:space-between] [gap:12px] [font-size:13px]">
      <span className="[color:var(--muted)]">{rotulo}</span>
      <span className="[font-weight:600] [text-align:right] [overflow-wrap:anywhere]">{valor}</span>
    </div>
  );
}
