import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Animal, type SituacaoAnimal, type StatusAgendamentoVacinacao, type Vacina } from "@prisma/client";
import { normalizeLookup, normalizeText } from "../animais/animais.service";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { BaixarAgendamentoDto } from "./dto/baixar-agendamento.dto";
import { CreateAgendamentoDto } from "./dto/create-agendamento.dto";
import { ListAgendaDto } from "./dto/list-agenda.dto";
import { MotivoDto } from "./dto/motivo.dto";
import { RemarcarAgendamentoDto } from "./dto/remarcar-agendamento.dto";
import { auditarVacinacao, criarEventoAnimal } from "./eventos";
import { recusa } from "./recusa";
import { VacinacaoService } from "./vacinacao.service";

const TERMINAIS: SituacaoAnimal[] = ["adotado", "obito"];
const ESPECIE_TEXTO = { cao: "cão", gato: "gato" } as const;
const USUARIO_SELECT = { select: { id: true, nome: true } } as const;

const AGENDAMENTO_INCLUDE = {
  animal: { select: { id: true, nome: true, numeroRegistro: true, especie: true, situacao: true } },
  vacina: { select: { id: true, nome: true, ativa: true } },
  protocolo: { select: { id: true, dosesPrevistas: true, status: true } },
  responsavel: USUARIO_SELECT,
  criadoPor: USUARIO_SELECT,
  aplicacao: { select: { id: true, numeroDose: true, dataAplicacao: true, anuladaEm: true } },
} satisfies Prisma.AgendamentoVacinacaoInclude;

type AgendamentoCompleto = Prisma.AgendamentoVacinacaoGetPayload<{ include: typeof AGENDAMENTO_INCLUDE }>;

@Injectable()
export class AgendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vacinacao: VacinacaoService,
  ) {}

  async listar(filtros: ListAgendaDto) {
    const pagina = filtros.pagina ?? 1;
    const limite = filtros.limite ?? 20;
    const agora = new Date();

    const where: Prisma.AgendamentoVacinacaoWhereInput = {};
    if (filtros.status) where.status = filtros.status;
    if (filtros.vacinaId) where.vacinaId = filtros.vacinaId;
    if (filtros.responsavelId) where.responsavelId = filtros.responsavelId;
    if (filtros.especie) where.animal = { especie: filtros.especie };

    const periodo: Prisma.DateTimeFilter = {};
    if (filtros.de) periodo.gte = this.instante(filtros.de, "de");
    if (filtros.ate) periodo.lte = this.instante(filtros.ate, "ate");
    if (periodo.gte && periodo.lte && periodo.gte > periodo.lte) {
      throw new BadRequestException("O início do período não pode ser posterior ao fim.");
    }
    if (periodo.gte || periodo.lte) where.dataHoraPrevista = periodo;

    // `atrasado` é derivado: agendado cuja data e hora já passaram.
    if (filtros.atrasados) {
      where.status = "agendado";
      where.dataHoraPrevista = { ...(where.dataHoraPrevista as Prisma.DateTimeFilter | undefined), lt: agora };
    }

    // A agenda operacional esconde animais em situação terminal, como a listagem de animais.
    if (!filtros.incluirTerminais) {
      where.animal = { ...(where.animal as Prisma.AnimalWhereInput | undefined), situacao: { notIn: TERMINAIS } };
    }

    const busca = filtros.busca?.trim();
    if (busca) {
      where.animal = {
        ...(where.animal as Prisma.AnimalWhereInput | undefined),
        OR: [
          { nome: { contains: busca, mode: "insensitive" } },
          { numeroRegistroNormalizado: { contains: normalizeLookup(busca) } },
        ],
      };
    }

    const [total, atrasados, agendamentos] = await this.prisma.$transaction([
      this.prisma.agendamentoVacinacao.count({ where }),
      this.prisma.agendamentoVacinacao.count({
        where: { ...where, status: "agendado", dataHoraPrevista: { ...(where.dataHoraPrevista as object), lt: agora } },
      }),
      this.prisma.agendamentoVacinacao.findMany({
        where,
        include: AGENDAMENTO_INCLUDE,
        // Atrasados primeiro (mais antigo no topo); o resto em ordem cronológica.
        orderBy: [{ dataHoraPrevista: "asc" }, { id: "asc" }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
    ]);

    return {
      total,
      atrasados,
      pagina,
      limite,
      items: agendamentos.map((agendamento) => this.view(agendamento, agora)),
    };
  }

  async obter(id: number) {
    const agendamento = await this.prisma.agendamentoVacinacao.findUnique({ where: { id }, include: AGENDAMENTO_INCLUDE });
    if (!agendamento) throw new NotFoundException("Agendamento não encontrado.");
    return this.view(agendamento, new Date());
  }

  async criar(dto: CreateAgendamentoDto, ator: AuthUser) {
    const dataHoraPrevista = this.instante(dto.dataHoraPrevista, "dataHoraPrevista");
    const observacao = this.textoOpcional(dto.observacao);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const animal = await tx.animal.findUnique({ where: { id: dto.animalId } });
        if (!animal) throw new NotFoundException("Animal não encontrado.");
        this.assertOperacional(animal);

        const vacina = await tx.vacina.findUnique({ where: { id: dto.vacinaId } });
        if (!vacina) throw new NotFoundException("Vacina não encontrada.");
        this.assertEspecie(vacina, animal);
        // Vacina inativa não entra em plano novo. Agendamento já aberto continua e pode ser baixado.
        if (!vacina.ativa) {
          throw recusa("vacina_inativa", `A vacina ${vacina.nome} está inativa e não aceita novos agendamentos.`);
        }
        await this.assertResponsavel(tx, dto.responsavelId);

        const protocolo = await this.vacinacao.obterOuCriarProtocolo(tx, animal.id, vacina);
        if (protocolo.status === "interrompido") {
          throw recusa(
            "protocolo_interrompido",
            `O protocolo de ${vacina.nome} está interrompido. Retome o protocolo antes de agendar.`,
          );
        }

        const aberto = await tx.agendamentoVacinacao.findFirst({
          where: { animalId: animal.id, vacinaId: vacina.id, status: "agendado" },
          select: { id: true, dataHoraPrevista: true },
        });
        if (aberto) {
          throw recusa(
            "agendamento_em_aberto",
            `Já existe um agendamento em aberto de ${vacina.nome} para este animal. Remarque o existente em vez de criar outro.`,
            { agendamentoId: aberto.id, dataHoraPrevista: aberto.dataHoraPrevista.toISOString() },
          );
        }

        const { numeroDose, avisos } = await this.doseEAvisos(tx, protocolo.id, protocolo.dosesPrevistas, vacina, dataHoraPrevista);

        const criado = await tx.agendamentoVacinacao.create({
          data: {
            animalId: animal.id,
            vacinaId: vacina.id,
            protocoloId: protocolo.id,
            numeroDosePrevista: numeroDose,
            dataHoraPrevista,
            responsavelId: dto.responsavelId ?? null,
            observacao,
            criadoPorId: ator.id,
          },
        });

        const dados = {
          agendamentoId: criado.id,
          protocoloId: protocolo.id,
          vacinaId: vacina.id,
          vacina: vacina.nome,
          numeroDosePrevista: numeroDose,
          dataHoraPrevista: dataHoraPrevista.toISOString(),
          responsavelId: dto.responsavelId ?? null,
        };
        await criarEventoAnimal(
          tx,
          animal.id,
          "criacao_agendamento_vacina",
          `Vacinação de ${vacina.nome} (dose ${numeroDose}) agendada.`,
          ator.id,
          dados,
        );
        await auditarVacinacao(tx, ator.id, "agendamento_vacinacao", criado.id, animal.id, "agendamento_vacinacao_criado", dados);

        return { agendamento: await this.carregar(tx, criado.id), avisos };
      });
    } catch (error) {
      this.mapConcorrencia(error);
    }
  }

  async remarcar(id: number, dto: RemarcarAgendamentoDto, ator: AuthUser) {
    const dataHoraPrevista = this.instante(dto.dataHoraPrevista, "dataHoraPrevista");
    const motivo = this.textoOpcional(dto.motivo);

    return this.prisma.$transaction(async (tx) => {
      const atual = await this.paraOperar(tx, id, "remarcado");
      await this.assertResponsavel(tx, dto.responsavelId);

      const data: Prisma.AgendamentoVacinacaoUpdateInput = { dataHoraPrevista };
      if (dto.responsavelId !== undefined) {
        data.responsavel = dto.responsavelId === null ? { disconnect: true } : { connect: { id: dto.responsavelId } };
      }
      if (dto.observacao !== undefined) data.observacao = this.textoOpcional(dto.observacao);

      // Remarcar mantém o estado `agendado`: o compromisso é o mesmo, só mudou a data.
      await tx.agendamentoVacinacao.update({ where: { id }, data });

      const dados = {
        agendamentoId: id,
        vacinaId: atual.vacinaId,
        vacina: atual.vacina.nome,
        dataHoraAnterior: atual.dataHoraPrevista.toISOString(),
        dataHoraPrevista: dataHoraPrevista.toISOString(),
        motivo,
      };
      await criarEventoAnimal(
        tx,
        atual.animalId,
        "remarcacao_agendamento_vacina",
        `Vacinação de ${atual.vacina.nome} remarcada.`,
        ator.id,
        dados,
      );
      await auditarVacinacao(tx, ator.id, "agendamento_vacinacao", id, atual.animalId, "agendamento_vacinacao_remarcado", dados);
      return this.carregar(tx, id);
    });
  }

  async cancelar(id: number, dto: MotivoDto, ator: AuthUser) {
    const motivo = normalizeText(dto.motivo);
    if (!motivo) throw new BadRequestException("Motivo é obrigatório.");

    return this.prisma.$transaction(async (tx) => {
      const atual = await this.paraOperar(tx, id, "cancelado");
      await tx.agendamentoVacinacao.update({ where: { id }, data: { status: "cancelado", motivoCancelamento: motivo } });

      const dados = {
        agendamentoId: id,
        vacinaId: atual.vacinaId,
        vacina: atual.vacina.nome,
        dataHoraPrevista: atual.dataHoraPrevista.toISOString(),
        motivo,
      };
      await criarEventoAnimal(
        tx,
        atual.animalId,
        "cancelamento_agendamento_vacina",
        `Agendamento de ${atual.vacina.nome} cancelado.`,
        ator.id,
        dados,
      );
      await auditarVacinacao(tx, ator.id, "agendamento_vacinacao", id, atual.animalId, "agendamento_vacinacao_cancelado", dados);
      return this.carregar(tx, id);
    });
  }

  async marcarFalta(id: number, ator: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const atual = await this.paraOperar(tx, id, "marcado como falta");
      await tx.agendamentoVacinacao.update({ where: { id }, data: { status: "faltou" } });

      const dados = {
        agendamentoId: id,
        vacinaId: atual.vacinaId,
        vacina: atual.vacina.nome,
        dataHoraPrevista: atual.dataHoraPrevista.toISOString(),
      };
      await criarEventoAnimal(
        tx,
        atual.animalId,
        "falta_agendamento_vacina",
        `Falta registrada no agendamento de ${atual.vacina.nome}.`,
        ator.id,
        dados,
      );
      await auditarVacinacao(tx, ator.id, "agendamento_vacinacao", id, atual.animalId, "agendamento_vacinacao_falta", dados);
      return this.carregar(tx, id);
    });
  }

  // Baixa: a aplicação e o fechamento do agendamento sucedem juntos ou nenhum dos dois.
  async baixar(id: number, dto: BaixarAgendamentoDto, ator: AuthUser) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const atual = await this.paraOperar(tx, id, "baixado");

        // Vacina inativa não impede a baixa: o animal já estava nesse plano.
        const resultado = await this.vacinacao.aplicarNaTransacao(
          tx,
          atual.animalId,
          {
            vacinaId: atual.vacinaId,
            dataAplicacao: dto.dataAplicacao,
            lote: dto.lote,
            validadeLote: dto.validadeLote,
            viaAplicacao: dto.viaAplicacao,
            observacao: dto.observacao ?? atual.observacao,
            aplicadoPor: dto.aplicadoPor,
            registroRetroativo: dto.registroRetroativo,
            confirmaAdiantada: dto.confirmaAdiantada,
            motivoAdiantada: dto.motivoAdiantada,
            dataProximaDose: dto.dataProximaDose,
          },
          ator,
          { permitirVacinaInativa: true },
        );

        await tx.agendamentoVacinacao.update({
          where: { id },
          data: { status: "aplicado", aplicacaoId: resultado.aplicacao.id },
        });

        const dados = {
          agendamentoId: id,
          aplicacaoId: resultado.aplicacao.id,
          vacinaId: atual.vacinaId,
          vacina: atual.vacina.nome,
          numeroDosePrevista: atual.numeroDosePrevista,
          numeroDose: resultado.aplicacao.numeroDose,
          dataHoraPrevista: atual.dataHoraPrevista.toISOString(),
          dataAplicacao: resultado.aplicacao.dataAplicacao,
        };
        await auditarVacinacao(tx, ator.id, "agendamento_vacinacao", id, atual.animalId, "agendamento_vacinacao_baixado", dados);

        return {
          agendamento: await this.carregar(tx, id),
          aplicacao: resultado.aplicacao,
          protocolo: resultado.protocolo,
          avisos: resultado.avisos,
        };
      });
    } catch (error) {
      this.mapConcorrencia(error);
    }
  }

  // Só `agendado` é operável. `aplicado`, `faltou` e `cancelado` são finais: a ação é criar outro agendamento.
  private async paraOperar(tx: Prisma.TransactionClient, id: number, acao: string) {
    const agendamento = await tx.agendamentoVacinacao.findUnique({
      where: { id },
      include: { vacina: true, animal: true },
    });
    if (!agendamento) throw new NotFoundException("Agendamento não encontrado.");
    if (agendamento.status !== "agendado") {
      throw recusa(
        "agendamento_finalizado",
        `Este agendamento está ${this.rotuloStatus(agendamento.status)} e não pode ser ${acao}. Crie um novo agendamento.`,
        { status: agendamento.status },
      );
    }
    this.assertOperacional(agendamento.animal);
    return agendamento;
  }

  // Na criação, intervalo e dose duplicada são aviso: a data real da aplicação é que decide, na baixa.
  private async doseEAvisos(
    tx: Prisma.TransactionClient,
    protocoloId: number,
    dosesPrevistas: number,
    vacina: Vacina,
    dataHoraPrevista: Date,
  ) {
    const ativas = await tx.aplicacaoVacina.findMany({
      where: { protocoloId, anuladaEm: null },
      select: { numeroDose: true, dataAplicacao: true },
    });
    const usados = new Set(ativas.map((aplicacao) => aplicacao.numeroDose));
    let numeroDose = 1;
    while (usados.has(numeroDose)) numeroDose += 1;

    const avisos: { codigo: string; message: string; [dado: string]: unknown }[] = [];
    const concluido = ativas.length >= dosesPrevistas;
    if (concluido && vacina.revacinacaoDias === null) {
      avisos.push({
        codigo: "esquema_concluido",
        message: `O esquema de ${vacina.nome} já está completo e a vacina não tem revacinação definida. A baixa será recusada.`,
      });
    }

    const intervalo = concluido ? vacina.revacinacaoDias : vacina.intervaloDosesDias;
    if (intervalo !== null && ativas.length > 0) {
      const ultima = ativas.reduce((maior, atual) => (atual.dataAplicacao > maior.dataAplicacao ? atual : maior));
      const minima = new Date(ultima.dataAplicacao.getTime() + intervalo * 86_400_000);
      if (dataHoraPrevista < minima) {
        avisos.push({
          codigo: "data_antes_do_intervalo",
          message: `A data prevista é anterior ao intervalo mínimo de ${vacina.nome}. Na baixa será preciso confirmar a aplicação adiantada com motivo.`,
          dataMinimaProximaDose: minima.toISOString().slice(0, 10),
        });
      }
    }
    return { numeroDose, avisos };
  }

  private view(agendamento: AgendamentoCompleto, agora: Date) {
    return {
      id: agendamento.id,
      animalId: agendamento.animalId,
      animal: agendamento.animal,
      vacinaId: agendamento.vacinaId,
      vacina: agendamento.vacina,
      protocoloId: agendamento.protocoloId,
      dosesPrevistas: agendamento.protocolo.dosesPrevistas,
      numeroDosePrevista: agendamento.numeroDosePrevista,
      dataHoraPrevista: agendamento.dataHoraPrevista,
      responsavel: agendamento.responsavel,
      criadoPor: agendamento.criadoPor,
      observacao: agendamento.observacao,
      status: agendamento.status,
      atrasado: agendamento.status === "agendado" && agendamento.dataHoraPrevista < agora,
      motivoCancelamento: agendamento.motivoCancelamento,
      aplicacao: agendamento.aplicacao,
      createdAt: agendamento.createdAt,
      updatedAt: agendamento.updatedAt,
    };
  }

  private async carregar(tx: Prisma.TransactionClient, id: number) {
    const agendamento = await tx.agendamentoVacinacao.findUniqueOrThrow({ where: { id }, include: AGENDAMENTO_INCLUDE });
    return this.view(agendamento, new Date());
  }

  private assertOperacional(animal: Pick<Animal, "situacao">) {
    if (TERMINAIS.includes(animal.situacao)) {
      throw recusa("animal_terminal", "Animal em situação terminal fica somente para consulta.");
    }
  }

  private assertEspecie(vacina: Vacina, animal: Pick<Animal, "especie">) {
    if (!vacina.especies.includes(animal.especie)) {
      throw recusa(
        "especie_incompativel",
        `A vacina ${vacina.nome} é indicada para ${vacina.especies.map((e) => ESPECIE_TEXTO[e]).join(" e ")}; este animal é ${ESPECIE_TEXTO[animal.especie]}.`,
        { especiesVacina: vacina.especies, especieAnimal: animal.especie },
      );
    }
  }

  private async assertResponsavel(tx: Prisma.TransactionClient, responsavelId: number | null | undefined) {
    if (responsavelId === undefined || responsavelId === null) return;
    const usuario = await tx.usuario.findFirst({ where: { id: responsavelId, ativo: true }, select: { id: true } });
    if (!usuario) throw new BadRequestException("Responsável não encontrado ou inativo.");
  }

  private rotuloStatus(status: StatusAgendamentoVacinacao) {
    return { agendado: "em aberto", aplicado: "aplicado", faltou: "marcado como falta", cancelado: "cancelado" }[status];
  }

  private instante(valor: string, campo: string): Date {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) throw new BadRequestException(`${campo} inválida.`);
    return data;
  }

  private textoOpcional(valor: string | null | undefined): string | null {
    if (valor === undefined || valor === null) return null;
    return normalizeText(valor) || null;
  }

  // Corrida por criar/baixar o mesmo par: o índice único parcial deixa uma passar e a outra cai aqui.
  private mapConcorrencia(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw recusa(
        "conflito_concorrencia",
        "Outra pessoa alterou este agendamento ao mesmo tempo. Atualize a agenda e confira antes de repetir.",
      );
    }
    throw error;
  }
}
