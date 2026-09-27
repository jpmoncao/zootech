import type { CastracaoAnimal, StatusCastracaoAnimal } from "@/lib/api";
import { CalendarOffIcon, CalendarCheck2Icon, CheckIcon, CircleDashedIcon, BookXIcon, LucideIcon } from "lucide-react";

const icons = {
  agendada: CalendarCheck2Icon,
  realizada: CheckIcon,
  nao_castrado: CircleDashedIcon,
  cancelada: CalendarOffIcon,
  nao_informado: BookXIcon,
};

export const castracaoStatusIcon: Record<StatusCastracaoAnimal, LucideIcon> = {
  agendada: icons.agendada,
  realizada: icons.realizada,
  nao_castrado: icons.nao_castrado,
  cancelada: icons.cancelada,
  nao_informado: icons.nao_informado,
};

export const castracaoStatusIconTone: Record<StatusCastracaoAnimal, string> = {
  agendada: "bg-[var(--info)] text-[var(--info-50)]",
  realizada: "bg-[var(--ok)] text-[var(--ok-50)]",
  nao_castrado: "bg-[var(--warn)] text-[var(--warn-50)]",
  cancelada: "bg-[var(--crit)] text-[var(--crit-50)]",
  nao_informado: "bg-[var(--muted)] text-[var(--bg)]",
};

export const castracaoStatusLabel: Record<StatusCastracaoAnimal, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  nao_castrado: "Não castrado",
  cancelada: "Cancelada",
  nao_informado: "Não informado",
};

export const castracaoStatusTone: Record<StatusCastracaoAnimal, string> = {
  agendada: "bg-[var(--info-50)] text-[var(--info)]",
  realizada: "bg-[var(--ok-50)] text-[var(--ok)]",
  nao_castrado: "bg-[var(--warn-50)] text-[var(--warn)]",
  cancelada: "bg-[var(--crit-50)] text-[var(--crit)]",
  nao_informado: "bg-[var(--bg)] text-[var(--muted)]",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" });

export function formatarDataCastracao(value: string | null, hasTime = true): string {
  if (!value) return "Data não informada";
  return hasTime ? dateTime.format(new Date(value)) : dateOnly.format(new Date(value));
}

export function castracaoAtual(castracoes: CastracaoAnimal[] | undefined, estado: StatusCastracaoAnimal): CastracaoAnimal | undefined {
  if (!castracoes) return undefined;
  const records = [...castracoes].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
  return records.find((item) => item.estado === estado);
}
