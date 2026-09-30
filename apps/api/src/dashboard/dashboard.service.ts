import { Injectable } from "@nestjs/common";
import { EstadoBaia, Prisma, SituacaoAnimal } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const SITUACOES_TERMINAIS: SituacaoAnimal[] = ["adotado", "obito"];
const ESTADOS_BAIA_NAO_ATIVOS: EstadoBaia[] = ["inativa", "interditada", "em_higienizacao"];
const FUSO_DASHBOARD = "America/Sao_Paulo";

type PeriodoMes = { inicio: Date; fim: Date };

function partesLocais(data: Date) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_DASHBOARD,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  return Object.fromEntries(partes.filter((parte) => parte.type !== "literal").map((parte) => [parte.type, Number(parte.value)])) as Record<"year" | "month" | "day" | "hour", number>;
}

function inicioLocalUtc(year: number, month: number, day: number) {
  const tratadoComoUtc = Date.UTC(year, month - 1, day);
  const localParts = partesLocais(new Date(tratadoComoUtc));
  const localComoUtc = Date.UTC(localParts.year, localParts.month - 1, localParts.day, localParts.hour);
  const offset = localComoUtc - tratadoComoUtc;
  return new Date(tratadoComoUtc - offset);
}

function periodoMeses(referencia = new Date()): { atual: PeriodoMes; anterior: PeriodoMes } {
  const local = partesLocais(referencia);
  const inicioAtual = inicioLocalUtc(local.year, local.month, 1);
  const proximoMes = local.month === 12 ? { year: local.year + 1, month: 1 } : { year: local.year, month: local.month + 1 };
  const inicioProximo = inicioLocalUtc(proximoMes.year, proximoMes.month, 1);
  const inicioAnterior = local.month === 1 ? inicioLocalUtc(local.year - 1, 12, 1) : inicioLocalUtc(local.year, local.month - 1, 1);
  return { atual: { inicio: inicioAtual, fim: inicioProximo }, anterior: { inicio: inicioAnterior, fim: inicioAtual } };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async obter() {
    const agora = new Date();
    const { atual, anterior } = periodoMeses(agora);
    const ativos: Prisma.AnimalWhereInput = { situacao: { notIn: SITUACOES_TERMINAIS } };
    const [
      animaisAtivos,
      animaisAlojados,
      disponiveisAdocao,
      emTratamento,
      emQuarentena,
      castracoesAgendadas,
      baiasAtivas,
      animaisAtivosIrregulares,
      animaisTerminaisAlocados,
      adocoesAtual,
      adocoesAnterior,
    ] = await Promise.all([
      this.prisma.animal.count({ where: ativos }),
      this.prisma.animal.count({ where: { ...ativos, baia: { estado: "ativa" } } }),
      this.prisma.animal.count({ where: { situacao: "saudavel", adocoes: { none: { devolucao: null } } } }),
      this.prisma.animal.count({ where: { ...ativos, situacao: "em_tratamento" } }),
      this.prisma.animal.count({ where: { ...ativos, situacao: "em_quarentena_observacao" } }),
      this.prisma.castracaoAnimal.count({ where: { tipo: "procedimento", estado: "agendada" } }),
      this.prisma.baia.findMany({ where: { estado: "ativa" }, select: { id: true, codigo: true, capacidade: true, estado: true, _count: { select: { animais: { where: ativos } } } }, orderBy: [{ codigoNormalizado: "asc" }] }),
      this.prisma.animal.count({ where: { ...ativos, baia: { estado: { in: ESTADOS_BAIA_NAO_ATIVOS } } } }),
      this.prisma.animal.count({ where: { situacao: { in: SITUACOES_TERMINAIS }, baiaId: { not: null } } }),
      this.prisma.adocao.count({ where: { adotadaEm: { gte: atual.inicio, lt: atual.fim } } }),
      this.prisma.adocao.count({ where: { adotadaEm: { gte: anterior.inicio, lt: anterior.fim } } }),
    ]);

    const variacaoAbsoluta = adocoesAtual - adocoesAnterior;
    return {
      atualizadoEm: agora.toISOString(),
      plantel: { animaisAtivos, animaisAlojados, disponiveisAdocao },
      acompanhamentoClinico: { emTratamento, emQuarentena },
      pendencias: {
        castracoesAgendadas,
        vacinas: { estado: "futura_implementacao", mensagem: "Vacinas pendentes — futura implementação." },
      },
      ocupacao: {
        baiasAtivas: baiasAtivas.map((baia) => ({ baiaId: baia.id, codigo: baia.codigo, ocupantes: baia._count.animais, capacidade: baia.capacidade, estado: baia.estado })),
        irregulares: {
          animalAtivoEmBaiaNaoAtiva: animaisAtivosIrregulares,
          animalTerminalAlocado: animaisTerminaisAlocados,
        },
      },
      adocoes: {
        mesAtual: { inicio: atual.inicio.toISOString(), fim: atual.fim.toISOString(), total: adocoesAtual },
        mesAnterior: { inicio: anterior.inicio.toISOString(), fim: anterior.fim.toISOString(), total: adocoesAnterior },
        variacaoAbsoluta,
        variacaoPercentual: adocoesAnterior > 0 ? (variacaoAbsoluta / adocoesAnterior) * 100 : null,
      },
    };
  }
}
