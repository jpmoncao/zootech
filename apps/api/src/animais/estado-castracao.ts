import type { CastracaoAnimal } from "@prisma/client";

export function estadoCastracaoAnimal(castracoes: Pick<CastracaoAnimal, "tipo" | "estado">[]): "agendada" | "realizada" | "nao_castrado" | "cancelada" | "nao_informado" {
  if (castracoes.some((item) => item.tipo === "procedimento" && item.estado === "realizada")) return "realizada";
  if (castracoes.some((item) => item.tipo === "procedimento" && item.estado === "agendada")) return "agendada";
  if (castracoes.some((item) => item.tipo === "avaliacao" && item.estado === "nao_castrado")) return "nao_castrado";
  if (castracoes.some((item) => item.estado === "cancelada")) return "cancelada";
  return "nao_informado";
}
