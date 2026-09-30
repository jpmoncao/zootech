import { Prisma, type TipoEventoAnimal } from "@prisma/client";

export type EntidadeVacinacao = "vacina" | "protocolo_vacinal" | "aplicacao_vacina" | "agendamento_vacinacao";

// Evento da timeline do animal. Sempre na mesma transação da operação de domínio:
// se o histórico não grava, a operação não é confirmada.
export function criarEventoAnimal(
  tx: Prisma.TransactionClient,
  animalId: number,
  tipo: TipoEventoAnimal,
  resumo: string,
  usuarioId: number,
  dados: Record<string, unknown>,
) {
  return tx.eventoAnimal.create({
    data: { animalId, tipo, resumo, usuarioId, dados: dados as Prisma.InputJsonValue },
  });
}

// Auditoria no padrão já usado por baias e animais: `dados.entidade` mais `dados.entidadeId`.
export async function auditarVacinacao(
  tx: Prisma.TransactionClient,
  usuarioId: number,
  entidade: EntidadeVacinacao,
  entidadeId: number,
  animalId: number | null,
  acao: string,
  dados: Record<string, unknown>,
) {
  await tx.auditoriaEvento.create({
    data: {
      tipo: acao,
      usuarioId,
      dados: { entidade, entidadeId: String(entidadeId), animalId, acao, ...dados } as Prisma.InputJsonValue,
    },
  });
}
