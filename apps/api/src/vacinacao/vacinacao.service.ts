import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  Prisma,
  type Animal,
  type AplicacaoVacina,
  type SituacaoAnimal,
  type Vacina,
} from "@prisma/client";
import { normalizeLookup, normalizeText } from "../animais/animais.service";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { dataCivilUtc, diffDias, formatDataCivil, hojeCivil, mesmaData, parseDataCivil } from "./datas";
import {
  calcularDataMinima,
  calcularProximaDose,
  proximoNumeroDose,
  resolverProximaDose,
  ultimaAplicacao,
} from "./protocolo";
import { CreateAplicacaoVacinaDto } from "./dto/create-aplicacao-vacina.dto";
import { ListAplicacoesDto } from "./dto/list-aplicacoes.dto";
import { MotivoDto } from "./dto/motivo.dto";
import { UpdateAplicacaoVacinaDto } from "./dto/update-aplicacao-vacina.dto";
import { criarEventoAnimal, auditarVacinacao } from "./eventos";
import { recusa } from "./recusa";

const TERMINAIS: SituacaoAnimal[] = ["adotado", "obito"];
const ESPECIE_TEXTO = { cao: "cão", gato: "gato" } as const;
const USUARIO_SELECT = { select: { id: true, nome: true } } as const;

const PROTOCOLO_INCLUDE = {
  vacina: true,
  interrompidoPor: USUARIO_SELECT,
  aplicacoes: {
    orderBy: [{ dataAplicacao: "asc" }, { numeroDose: "asc" }, { id: "asc" }],
    include: {
      registradoPor: USUARIO_SELECT,
      anuladaPor: USUARIO_SELECT,
      agendamentoBaixado: { select: { id: true } },
    },
  },
  agendamentos: {
    where: { status: "agendado" },
    include: { responsavel: USUARIO_SELECT },
  },
} satisfies Prisma.ProtocoloVacinalInclude;

type ProtocoloCompleto = Prisma.ProtocoloVacinalGetPayload<{ include: typeof PROTOCOLO_INCLUDE }>;
export type AvisoAplicacao = { codigo: string; message: string; [dado: string]: unknown };

function idadeEstimadaEmDias(quantidade: number, unidade: "dias" | "meses" | "anos"): number {
  if (unidade === "dias") return quantidade;
  return Math.round(quantidade * (unidade === "meses" ? 30.44 : 365.25));
}

@Injectable()
export class VacinacaoService {
  constructor(private readonly prisma: PrismaService) {}

  async obterDoAnimal(animalId: number) {
    const animal = await this.prisma.animal.findUnique({
      where: { id: animalId },
      select: { id: true, situacao: true },
    });
    if (!animal) throw new NotFoundException("Animal não encontrado.");
    const protocolos = await this.prisma.protocoloVacinal.findMany({
      where: { animalId },
      include: PROTOCOLO_INCLUDE,
      orderBy: [{ vacina: { nome: "asc" } }, { id: "asc" }],
    });
    return {
      animalId,
      situacao: animal.situacao,
      somenteLeitura: TERMINAIS.includes(animal.situacao),
      protocolos: protocolos.map((protocolo) => this.viewProtocolo(protocolo)),
    };
  }

  // Registro de aplicação: abre a transação e delega. A baixa de agendamento reusa
  // `aplicarNaTransacao` dentro da própria transação, para as duas escritas sucederem juntas.
  async registrarAplicacao(animalId: number, dto: CreateAplicacaoVacinaDto, ator: AuthUser) {
    try {
      return await this.prisma.$transaction((tx) => this.aplicarNaTransacao(tx, animalId, dto, ator));
    } catch (error) {
      this.mapConcorrencia(error);
    }
  }

  // Reusada por AgendaService.baixar dentro da transação da baixa. Não chamar fora de uma transação.
  async aplicarNaTransacao(
    tx: Prisma.TransactionClient,
    animalId: number,
    dto: CreateAplicacaoVacinaDto,
    ator: AuthUser,
    opcoes: { permitirVacinaInativa?: boolean } = {},
  ) {
    const dataAplicacao = this.dataObrigatoria(dto.dataAplicacao, "Data da aplicação");
    const lote = normalizeText(dto.lote);
    if (!lote) throw new BadRequestException("Lote é obrigatório.");
    const validadeLote = this.dataOpcional(dto.validadeLote, "Validade do lote");
    const proximaInformada =
      dto.dataProximaDose === undefined ? undefined : this.dataOpcional(dto.dataProximaDose, "Próxima dose");
    const observacao = this.textoOpcional(dto.observacao);
    const motivoAdiantada = this.textoOpcional(dto.motivoAdiantada);
    const retroativo = dto.registroRetroativo === true;


    const animal = await tx.animal.findUnique({ where: { id: animalId } });
    if (!animal) throw new NotFoundException("Animal não encontrado.");
    this.assertEditable(animal);

    const vacina = await tx.vacina.findUnique({ where: { id: dto.vacinaId } });
    if (!vacina) throw new NotFoundException("Vacina não encontrada.");
    if (!vacina.especies.includes(animal.especie)) {
      throw recusa(
        "especie_incompativel",
        `A vacina ${vacina.nome} é indicada para ${this.especiesTexto(vacina.especies)}; este animal é ${ESPECIE_TEXTO[animal.especie]}.`,
        { especiesVacina: vacina.especies, especieAnimal: animal.especie },
      );
    }
    // A baixa de um agendamento passa `permitirVacinaInativa`: o animal já estava nesse plano
    // quando a vacina foi inativada, e o lembrete em aberto continua válido.
    if (!vacina.ativa && !opcoes.permitirVacinaInativa) {
      throw recusa("vacina_inativa", `A vacina ${vacina.nome} está inativa e não aceita novas aplicações.`);
    }
    if (dataAplicacao > hojeCivil()) {
      throw recusa("data_futura", "A data da aplicação não pode ser futura.");
    }

    const protocolo = await this.obterOuCriarProtocolo(tx, animal.id, vacina);
    if (protocolo.status === "interrompido") {
      throw recusa(
        "protocolo_interrompido",
        `O protocolo de ${vacina.nome} está interrompido. Retome o protocolo antes de aplicar.`,
        { motivoInterrupcao: protocolo.motivoInterrupcao },
      );
    }

    const ativas = await tx.aplicacaoVacina.findMany({
      where: { protocoloId: protocolo.id, anuladaEm: null },
      orderBy: [{ dataAplicacao: "asc" }, { numeroDose: "asc" }],
    });
    const concluido = ativas.length >= protocolo.dosesPrevistas;
    if (concluido && protocolo.revacinacaoDias === null) {
      throw recusa(
        "esquema_concluido",
        `O esquema de ${vacina.nome} já foi concluído e a vacina não tem revacinação definida.`,
      );
    }

    const numeroDose = proximoNumeroDose(ativas);
    if (dto.numeroDoseEsperada !== undefined && dto.numeroDoseEsperada !== numeroDose) {
      const jaRegistrada = ativas.some((aplicacao) => aplicacao.numeroDose === dto.numeroDoseEsperada);
      throw recusa(
        jaRegistrada ? "dose_ja_registrada" : "dose_divergente",
        jaRegistrada
          ? `A dose ${dto.numeroDoseEsperada} desta vacina já foi registrada para este animal.`
          : `A dose a registrar agora é a ${numeroDose}, não a ${dto.numeroDoseEsperada}. Atualize a ficha.`,
        { numeroDoseAtual: numeroDose },
      );
    }

    if (ativas.some((aplicacao) => mesmaData(aplicacao.dataAplicacao, dataAplicacao))) {
      throw recusa(
        "duplicidade_mesmo_dia",
        `${vacina.nome} já foi aplicada neste animal em ${formatDataCivil(dataAplicacao)}.`,
      );
    }

    const ultima = ultimaAplicacao(ativas);
    const acolhimento = animal.dataAcolhimento ? dataCivilUtc(animal.dataAcolhimento) : null;
    const motivosRetroativo: string[] = [];
    if (acolhimento && dataAplicacao < acolhimento) motivosRetroativo.push("anterior_ao_acolhimento");
    if (ultima && dataAplicacao < ultima.dataAplicacao) motivosRetroativo.push("anterior_a_ultima_aplicacao");
    if (motivosRetroativo.length > 0 && !retroativo) {
      throw recusa(
        "retroativo_sem_indicador",
        "A data é anterior ao acolhimento ou à última dose registrada. Marque o registro como retroativo e explique a origem na observação.",
        { motivos: motivosRetroativo },
      );
    }
    if (retroativo && !observacao) {
      throw recusa("retroativo_sem_observacao", "Registro retroativo exige observação com a origem da informação.");
    }

    // Dose adiantada não é erro: é decisão clínica. Exige confirmação e motivo, e fica gravada na aplicação.
    let aplicadaAdiantada = false;
    let diasAntecipacao: number | null = null;
    const minima = calcularDataMinima(protocolo, ativas);
    if (!retroativo && minima && dataAplicacao < minima) {
      diasAntecipacao = diffDias(minima, dataAplicacao);
      if (dto.confirmaAdiantada !== true || !motivoAdiantada) {
        throw recusa(
          "aplicacao_adiantada",
          `Faltam ${diasAntecipacao} dia(s) para o intervalo mínimo desta vacina. Confirme a aplicação adiantada e informe o motivo.`,
          {
            dataMinimaProximaDose: formatDataCivil(minima),
            diasAntecipacao,
            dataUltimaAplicacao: formatDataCivil(ultima?.dataAplicacao),
            intervaloDias: concluido ? protocolo.revacinacaoDias : protocolo.intervaloDosesDias,
            reforco: concluido,
          },
        );
      }
      aplicadaAdiantada = true;
    }

    const calculada = calcularProximaDose(protocolo, ativas.length + 1, dataAplicacao);
    const dataProximaDose = proximaInformada === undefined ? calculada : proximaInformada;

    const aplicacao = await tx.aplicacaoVacina.create({
      data: {
        animalId: animal.id,
        vacinaId: vacina.id,
        protocoloId: protocolo.id,
        numeroDose,
        dataAplicacao,
        lote,
        loteNormalizado: normalizeLookup(lote),
        validadeLote,
        viaAplicacao: this.textoOpcional(dto.viaAplicacao),
        observacao,
        registradoPorId: ator.id,
        aplicadoPor: this.textoOpcional(dto.aplicadoPor),
        registroRetroativo: retroativo,
        aplicadaAdiantada,
        motivoAdiantada: aplicadaAdiantada ? motivoAdiantada : null,
        diasAntecipacao,
        dataProximaDose,
        dataProximaDoseCalculada: calculada,
      },
    });
    await this.sincronizarStatus(tx, protocolo.id);

    const reforco = numeroDose > protocolo.dosesPrevistas;
    const dados = {
      aplicacaoId: aplicacao.id,
      protocoloId: protocolo.id,
      vacinaId: vacina.id,
      vacina: vacina.nome,
      numeroDose,
      dosesPrevistas: protocolo.dosesPrevistas,
      reforco,
      dataAplicacao: formatDataCivil(dataAplicacao),
      lote,
      aplicadoPor: aplicacao.aplicadoPor,
      registroRetroativo: retroativo,
      aplicadaAdiantada,
      motivoAdiantada: aplicacao.motivoAdiantada,
      diasAntecipacao,
      dataProximaDose: formatDataCivil(dataProximaDose),
      dataProximaDoseCalculada: formatDataCivil(calculada),
      dataProximaDoseEditada: !mesmaData(dataProximaDose, calculada),
    };
    await criarEventoAnimal(
      tx,
      animal.id,
      "aplicacao_vacina",
      `${vacina.nome} aplicada (${reforco ? `reforço, dose ${numeroDose}` : `dose ${numeroDose} de ${protocolo.dosesPrevistas}`})${aplicadaAdiantada ? ", adiantada" : ""}.`,
      ator.id,
      dados,
    );
    await auditarVacinacao(tx, ator.id, "aplicacao_vacina", aplicacao.id, animal.id, "aplicacao_vacina_registrada", dados);

    return {
      aplicacao: await this.carregarAplicacao(tx, aplicacao.id),
      protocolo: await this.carregarProtocolo(tx, protocolo.id),
      avisos: this.avisosNaoBloqueantes(animal, vacina, dataAplicacao),
    };
  }

  async editarAplicacao(animalId: number, aplicacaoId: number, dto: UpdateAplicacaoVacinaDto, ator: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const animal = await tx.animal.findUnique({ where: { id: animalId } });
      if (!animal) throw new NotFoundException("Animal não encontrado.");
      this.assertEditable(animal);
      const atual = await tx.aplicacaoVacina.findFirst({ where: { id: aplicacaoId, animalId } });
      if (!atual) throw new NotFoundException("Aplicação não encontrada.");
      if (atual.anuladaEm) throw recusa("aplicacao_anulada", "Aplicação anulada não pode ser editada.");

      const data: Prisma.AplicacaoVacinaUpdateInput = {};
      const mudancas: Record<string, { antes: unknown; depois: unknown }> = {};
      const registrar = (campo: string, antes: unknown, depois: unknown) => {
        mudancas[campo] = { antes, depois };
      };

      if (dto.lote !== undefined) {
        const lote = normalizeText(dto.lote);
        if (!lote) throw new BadRequestException("Lote é obrigatório.");
        if (lote !== atual.lote) {
          data.lote = lote;
          data.loteNormalizado = normalizeLookup(lote);
          registrar("lote", atual.lote, lote);
        }
      }
      if (dto.validadeLote !== undefined) {
        const validade = this.dataOpcional(dto.validadeLote, "Validade do lote");
        if (!mesmaData(validade, atual.validadeLote)) {
          data.validadeLote = validade;
          registrar("validadeLote", formatDataCivil(atual.validadeLote), formatDataCivil(validade));
        }
      }
      for (const campo of ["viaAplicacao", "observacao", "aplicadoPor"] as const) {
        if (dto[campo] === undefined) continue;
        const valor = this.textoOpcional(dto[campo]);
        if (campo === "observacao" && !valor && atual.registroRetroativo) {
          throw recusa("retroativo_sem_observacao", "Registro retroativo exige observação com a origem da informação.");
        }
        if (valor !== atual[campo]) {
          data[campo] = valor;
          registrar(campo, atual[campo], valor);
        }
      }
      if (dto.dataProximaDose !== undefined) {
        const proxima = this.dataOpcional(dto.dataProximaDose, "Próxima dose");
        if (!mesmaData(proxima, atual.dataProximaDose)) {
          data.dataProximaDose = proxima;
          registrar("dataProximaDose", formatDataCivil(atual.dataProximaDose), formatDataCivil(proxima));
          mudancas.dataProximaDose.depois = {
            valor: formatDataCivil(proxima),
            calculada: formatDataCivil(atual.dataProximaDoseCalculada),
          };
        }
      }

      if (Object.keys(mudancas).length === 0) {
        return {
          aplicacao: await this.carregarAplicacao(tx, atual.id),
          protocolo: await this.carregarProtocolo(tx, atual.protocoloId),
        };
      }

      await tx.aplicacaoVacina.update({ where: { id: atual.id }, data });
      const dados = { aplicacaoId: atual.id, protocoloId: atual.protocoloId, vacinaId: atual.vacinaId, mudancas };
      await criarEventoAnimal(
        tx,
        animalId,
        "edicao_aplicacao_vacina",
        `Aplicação da dose ${atual.numeroDose} editada (${Object.keys(mudancas).join(", ")}).`,
        ator.id,
        dados,
      );
      await auditarVacinacao(tx, ator.id, "aplicacao_vacina", atual.id, animalId, "aplicacao_vacina_editada", dados);
      return {
        aplicacao: await this.carregarAplicacao(tx, atual.id),
        protocolo: await this.carregarProtocolo(tx, atual.protocoloId),
      };
    });
  }

  async anularAplicacao(animalId: number, aplicacaoId: number, dto: MotivoDto, ator: AuthUser) {
    const motivo = this.motivoObrigatorio(dto.motivo);
    return this.prisma.$transaction(async (tx) => {
      const animal = await tx.animal.findUnique({ where: { id: animalId } });
      if (!animal) throw new NotFoundException("Animal não encontrado.");
      this.assertEditable(animal);
      const atual = await tx.aplicacaoVacina.findFirst({
        where: { id: aplicacaoId, animalId },
        include: { vacina: true, agendamentoBaixado: true },
      });
      if (!atual) throw new NotFoundException("Aplicação não encontrada.");
      if (atual.anuladaEm) throw recusa("aplicacao_ja_anulada", "Esta aplicação já foi anulada.");

      await tx.aplicacaoVacina.update({
        where: { id: atual.id },
        data: { anuladaEm: new Date(), anuladaPorId: ator.id, motivoAnulacao: motivo },
      });
      await this.sincronizarStatus(tx, atual.protocoloId);

      // Anular a dose que baixou um agendamento devolve o lembrete, em vez de apagá-lo junto.
      let agendamentoReaberto = false;
      const baixado = atual.agendamentoBaixado;
      if (baixado) {
        const emAberto = await tx.agendamentoVacinacao.findFirst({
          where: { animalId, vacinaId: atual.vacinaId, status: "agendado" },
          select: { id: true },
        });
        if (!emAberto) {
          await tx.agendamentoVacinacao.update({
            where: { id: baixado.id },
            data: { status: "agendado", aplicacaoId: null },
          });
          agendamentoReaberto = true;
          await criarEventoAnimal(
            tx,
            animalId,
            "reabertura_agendamento_vacina",
            `Agendamento de ${atual.vacina.nome} reaberto: a aplicação que o baixou foi anulada.`,
            ator.id,
            {
              agendamentoId: baixado.id,
              aplicacaoAnuladaId: atual.id,
              dataHoraPrevista: baixado.dataHoraPrevista.toISOString(),
            },
          );
        }
      }

      const dados = {
        aplicacaoId: atual.id,
        protocoloId: atual.protocoloId,
        vacinaId: atual.vacinaId,
        vacina: atual.vacina.nome,
        numeroDose: atual.numeroDose,
        dataAplicacao: formatDataCivil(atual.dataAplicacao),
        motivo,
        agendamentoId: baixado?.id ?? null,
        agendamentoReaberto,
      };
      await criarEventoAnimal(
        tx,
        animalId,
        "anulacao_aplicacao_vacina",
        `Aplicação de ${atual.vacina.nome} (dose ${atual.numeroDose}) anulada.`,
        ator.id,
        dados,
      );
      await auditarVacinacao(tx, ator.id, "aplicacao_vacina", atual.id, animalId, "aplicacao_vacina_anulada", dados);
      return {
        aplicacao: await this.carregarAplicacao(tx, atual.id),
        protocolo: await this.carregarProtocolo(tx, atual.protocoloId),
        agendamentoReaberto,
      };
    });
  }

  async interromperProtocolo(animalId: number, protocoloId: number, dto: MotivoDto, ator: AuthUser) {
    const motivo = this.motivoObrigatorio(dto.motivo);
    return this.prisma.$transaction(async (tx) => {
      const animal = await tx.animal.findUnique({ where: { id: animalId } });
      if (!animal) throw new NotFoundException("Animal não encontrado.");
      this.assertEditable(animal);
      const protocolo = await tx.protocoloVacinal.findFirst({ where: { id: protocoloId, animalId }, include: { vacina: true } });
      if (!protocolo) throw new NotFoundException("Protocolo não encontrado.");
      if (protocolo.status !== "em_andamento") {
        throw recusa(
          "protocolo_nao_interrompivel",
          protocolo.status === "interrompido" ? "O protocolo já está interrompido." : "O protocolo já foi concluído.",
        );
      }
      await tx.protocoloVacinal.update({
        where: { id: protocolo.id },
        data: { status: "interrompido", motivoInterrupcao: motivo, interrompidoPorId: ator.id, interrompidoEm: new Date() },
      });
      const dados = { protocoloId: protocolo.id, vacinaId: protocolo.vacinaId, vacina: protocolo.vacina.nome, motivo };
      await criarEventoAnimal(tx, animalId, "interrupcao_protocolo_vacinal", `Protocolo de ${protocolo.vacina.nome} interrompido.`, ator.id, dados);
      await auditarVacinacao(tx, ator.id, "protocolo_vacinal", protocolo.id, animalId, "protocolo_vacinal_interrompido", dados);
      return this.carregarProtocolo(tx, protocolo.id);
    });
  }

  async retomarProtocolo(animalId: number, protocoloId: number, ator: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const animal = await tx.animal.findUnique({ where: { id: animalId } });
      if (!animal) throw new NotFoundException("Animal não encontrado.");
      this.assertEditable(animal);
      const protocolo = await tx.protocoloVacinal.findFirst({ where: { id: protocoloId, animalId }, include: { vacina: true } });
      if (!protocolo) throw new NotFoundException("Protocolo não encontrado.");
      if (protocolo.status !== "interrompido") {
        throw recusa("protocolo_nao_interrompido", "O protocolo não está interrompido.");
      }
      const ativas = await tx.aplicacaoVacina.count({ where: { protocoloId: protocolo.id, anuladaEm: null } });
      await tx.protocoloVacinal.update({
        where: { id: protocolo.id },
        data: {
          status: ativas >= protocolo.dosesPrevistas ? "concluido" : "em_andamento",
          motivoInterrupcao: null,
          interrompidoPorId: null,
          interrompidoEm: null,
        },
      });
      const dados = {
        protocoloId: protocolo.id,
        vacinaId: protocolo.vacinaId,
        vacina: protocolo.vacina.nome,
        motivoInterrupcaoAnterior: protocolo.motivoInterrupcao,
      };
      await criarEventoAnimal(tx, animalId, "retomada_protocolo_vacinal", `Protocolo de ${protocolo.vacina.nome} retomado.`, ator.id, dados);
      await auditarVacinacao(tx, ator.id, "protocolo_vacinal", protocolo.id, animalId, "protocolo_vacinal_retomado", dados);
      return this.carregarProtocolo(tx, protocolo.id);
    });
  }

  async listarPorLote(filtros: ListAplicacoesDto) {
    const loteNormalizado = normalizeLookup(filtros.lote);
    if (!loteNormalizado) throw new BadRequestException("Informe o lote.");
    const pagina = filtros.pagina ?? 1;
    const limite = filtros.limite ?? 20;
    const where: Prisma.AplicacaoVacinaWhereInput = { loteNormalizado };
    if (filtros.vacinaId) where.vacinaId = filtros.vacinaId;

    const [total, aplicacoes] = await this.prisma.$transaction([
      this.prisma.aplicacaoVacina.count({ where }),
      this.prisma.aplicacaoVacina.findMany({
        where,
        include: {
          animal: { select: { id: true, nome: true, numeroRegistro: true } },
          vacina: { select: { id: true, nome: true } },
          registradoPor: USUARIO_SELECT,
          anuladaPor: USUARIO_SELECT,
          agendamentoBaixado: { select: { id: true } },
        },
        orderBy: [{ dataAplicacao: "desc" }, { id: "desc" }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
    ]);

    const reacoes = await this.reacoesPorAplicacao(aplicacoes.map((aplicacao) => aplicacao.id));

    return {
      total,
      pagina,
      limite,
      items: aplicacoes.map((aplicacao) => ({
        ...this.viewAplicacao(aplicacao),
        animal: aplicacao.animal,
        vacina: aplicacao.vacina,
        // Rastrear um lote até as reações é o motivo de registrar lote: cada aplicação diz se reagiu.
        reacoesAdversas: reacoes.get(aplicacao.id) ?? [],
      })),
    };
  }

  // Reação adversa é evento imutável; a evolução do desfecho é outro evento apontando para a raiz.
  // Aqui o desfecho corrente de cada cadeia é o do evento mais recente (empate: maior id).
  private async reacoesPorAplicacao(aplicacaoIds: number[]) {
    const resultado = new Map<number, { id: number; gravidade: string; desfecho: string; emAcompanhamento: boolean }[]>();
    if (aplicacaoIds.length === 0) return resultado;

    const eventos = await this.prisma.eventoAnimal.findMany({
      where: { tipo: "reacao_adversa", aplicacaoVacinaId: { in: aplicacaoIds } },
      select: { id: true, aplicacaoVacinaId: true, eventoOrigemId: true, gravidadeReacao: true, desfechoReacao: true, createdAt: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    const cadeias = new Map<number, typeof eventos>();
    for (const evento of eventos) {
      const raiz = evento.eventoOrigemId ?? evento.id;
      cadeias.set(raiz, [...(cadeias.get(raiz) ?? []), evento]);
    }
    for (const [raiz, cadeia] of cadeias) {
      const corrente = cadeia[cadeia.length - 1];
      const aplicacaoId = cadeia[0].aplicacaoVacinaId;
      if (aplicacaoId === null || !corrente.gravidadeReacao || !corrente.desfechoReacao) continue;
      resultado.set(aplicacaoId, [
        ...(resultado.get(aplicacaoId) ?? []),
        {
          id: raiz,
          gravidade: corrente.gravidadeReacao,
          desfecho: corrente.desfechoReacao,
          emAcompanhamento: corrente.desfechoReacao === "em_acompanhamento",
        },
      ]);
    }
    return resultado;
  }

  // Cria o protocolo sem abortar a transação quando outra requisição o criou primeiro:
  // ON CONFLICT DO NOTHING deixa a segunda reaproveitar o existente.
  async obterOuCriarProtocolo(tx: Prisma.TransactionClient, animalId: number, vacina: Vacina) {
    await tx.$executeRaw`
      INSERT INTO "protocolos_vacinais" ("animalId", "vacinaId", "dosesPrevistas", "intervaloDosesDias", "revacinacaoDias", "updatedAt")
      VALUES (${animalId}, ${vacina.id}, ${vacina.totalDoses}, ${vacina.intervaloDosesDias}, ${vacina.revacinacaoDias}, ${new Date()})
      ON CONFLICT ("animalId", "vacinaId") DO NOTHING`;
    return tx.protocoloVacinal.findUniqueOrThrow({
      where: { animalId_vacinaId: { animalId, vacinaId: vacina.id } },
    });
  }

  // `interrompido` não é derivável das aplicações, então é preservado; o resto segue da contagem.
  private async sincronizarStatus(tx: Prisma.TransactionClient, protocoloId: number) {
    const protocolo = await tx.protocoloVacinal.findUniqueOrThrow({ where: { id: protocoloId } });
    if (protocolo.status === "interrompido") return protocolo;
    const ativas = await tx.aplicacaoVacina.count({ where: { protocoloId, anuladaEm: null } });
    const status = ativas >= protocolo.dosesPrevistas ? "concluido" : "em_andamento";
    return status === protocolo.status
      ? protocolo
      : tx.protocoloVacinal.update({ where: { id: protocoloId }, data: { status } });
  }

  private async carregarProtocolo(tx: Prisma.TransactionClient, protocoloId: number) {
    const protocolo = await tx.protocoloVacinal.findUniqueOrThrow({
      where: { id: protocoloId },
      include: PROTOCOLO_INCLUDE,
    });
    return this.viewProtocolo(protocolo);
  }

  private async carregarAplicacao(tx: Prisma.TransactionClient, aplicacaoId: number) {
    const aplicacao = await tx.aplicacaoVacina.findUniqueOrThrow({
      where: { id: aplicacaoId },
      include: {
        registradoPor: USUARIO_SELECT,
        anuladaPor: USUARIO_SELECT,
        agendamentoBaixado: { select: { id: true } },
      },
    });
    return this.viewAplicacao(aplicacao);
  }

  private viewProtocolo(protocolo: ProtocoloCompleto) {
    const ativas = protocolo.aplicacoes.filter((aplicacao) => !aplicacao.anuladaEm);
    const ultima = ultimaAplicacao(ativas);
    const minima = calcularDataMinima(protocolo, ativas);
    const proxima = resolverProximaDose(protocolo, ativas);
    const aberto = protocolo.agendamentos[0] ?? null;

    return {
      id: protocolo.id,
      animalId: protocolo.animalId,
      vacinaId: protocolo.vacinaId,
      vacina: {
        id: protocolo.vacina.id,
        nome: protocolo.vacina.nome,
        especies: protocolo.vacina.especies,
        ativa: protocolo.vacina.ativa,
        obrigatoria: protocolo.vacina.obrigatoria,
        idadeMinimaSemanas: protocolo.vacina.idadeMinimaSemanas,
      },
      status: protocolo.status,
      dosesPrevistas: protocolo.dosesPrevistas,
      dosesAplicadas: ativas.length,
      dosesFaltantes: Math.max(protocolo.dosesPrevistas - ativas.length, 0),
      proximoNumeroDose: proximoNumeroDose(ativas),
      intervaloDosesDias: protocolo.intervaloDosesDias,
      revacinacaoDias: protocolo.revacinacaoDias,
      // Lido do catálogo atual, não do protocolo: é preferência de operação, não parte do esquema clínico.
      diasAvisoProximaDose: protocolo.vacina.diasAvisoProximaDose,
      dataUltimaAplicacao: formatDataCivil(ultima?.dataAplicacao),
      dataMinimaProximaDose: formatDataCivil(minima),
      dataProximaDose: formatDataCivil(proxima),
      motivoInterrupcao: protocolo.motivoInterrupcao,
      interrompidoEm: protocolo.interrompidoEm,
      interrompidoPor: protocolo.interrompidoPor,
      aplicacoes: protocolo.aplicacoes.map((aplicacao) => this.viewAplicacao(aplicacao)),
      agendamentoEmAberto: aberto
        ? {
            id: aberto.id,
            numeroDosePrevista: aberto.numeroDosePrevista,
            dataHoraPrevista: aberto.dataHoraPrevista,
            responsavel: aberto.responsavel,
          }
        : null,
    };
  }

  private viewAplicacao(
    aplicacao: AplicacaoVacina & {
      registradoPor?: { id: number; nome: string } | null;
      anuladaPor?: { id: number; nome: string } | null;
      agendamentoBaixado?: { id: number } | null;
    },
  ) {
    return {
      id: aplicacao.id,
      animalId: aplicacao.animalId,
      vacinaId: aplicacao.vacinaId,
      protocoloId: aplicacao.protocoloId,
      numeroDose: aplicacao.numeroDose,
      dataAplicacao: formatDataCivil(aplicacao.dataAplicacao),
      lote: aplicacao.lote,
      validadeLote: formatDataCivil(aplicacao.validadeLote),
      viaAplicacao: aplicacao.viaAplicacao,
      observacao: aplicacao.observacao,
      aplicadoPor: aplicacao.aplicadoPor,
      registradoPor: aplicacao.registradoPor ?? null,
      registroRetroativo: aplicacao.registroRetroativo,
      aplicadaAdiantada: aplicacao.aplicadaAdiantada,
      motivoAdiantada: aplicacao.motivoAdiantada,
      diasAntecipacao: aplicacao.diasAntecipacao,
      dataProximaDose: formatDataCivil(aplicacao.dataProximaDose),
      dataProximaDoseCalculada: formatDataCivil(aplicacao.dataProximaDoseCalculada),
      prontuarioId: aplicacao.prontuarioId,
      anulada: aplicacao.anuladaEm !== null,
      anuladaEm: aplicacao.anuladaEm,
      anuladaPor: aplicacao.anuladaPor ?? null,
      motivoAnulacao: aplicacao.motivoAnulacao,
      agendamentoId: aplicacao.agendamentoBaixado?.id ?? null,
      createdAt: aplicacao.createdAt,
    };
  }

  // Avisos voltam como dados: a aplicação segue, a pessoa decide. Reação adversa anterior entra na task de reação adversa.
  private avisosNaoBloqueantes(animal: Animal, vacina: Vacina, dataAplicacao: Date): AvisoAplicacao[] {
    const avisos: AvisoAplicacao[] = [];
    const minima = vacina.idadeMinimaSemanas;
    if (minima === null) return avisos;

    let semanas: number | null = null;
    let aproximada = false;
    if (animal.dataNascimento) {
      semanas = Math.floor(diffDias(dataAplicacao, dataCivilUtc(animal.dataNascimento)) / 7);
    } else if (animal.idadeEstimadaQuantidade !== null && animal.idadeEstimadaUnidade) {
      semanas = Math.floor(idadeEstimadaEmDias(animal.idadeEstimadaQuantidade, animal.idadeEstimadaUnidade) / 7);
      aproximada = true;
    }
    if (semanas !== null && semanas < minima) {
      avisos.push({
        codigo: "idade_minima",
        message: `A vacina ${vacina.nome} é indicada a partir de ${minima} semanas; o animal tem ${aproximada ? "cerca de " : ""}${semanas}.`,
        idadeSemanas: semanas,
        idadeMinimaSemanas: minima,
        idadeAproximada: aproximada,
      });
    }
    return avisos;
  }

  private assertEditable(animal: Pick<Animal, "situacao">) {
    if (TERMINAIS.includes(animal.situacao)) {
      throw recusa("animal_terminal", "Animal em situação terminal fica somente para consulta.");
    }
  }

  private especiesTexto(especies: readonly ("cao" | "gato")[]): string {
    return especies.map((especie) => ESPECIE_TEXTO[especie]).join(" e ");
  }

  private dataObrigatoria(valor: string, rotulo: string): Date {
    const data = parseDataCivil(valor);
    if (!data) throw new BadRequestException(`${rotulo} inválida. Use o formato AAAA-MM-DD.`);
    return data;
  }

  private dataOpcional(valor: string | null | undefined, rotulo: string): Date | null {
    if (valor === undefined || valor === null) return null;
    return this.dataObrigatoria(valor, rotulo);
  }

  private textoOpcional(valor: string | null | undefined): string | null {
    if (valor === undefined || valor === null) return null;
    return normalizeText(valor) || null;
  }

  private motivoObrigatorio(valor: string): string {
    const motivo = normalizeText(valor);
    if (!motivo) throw new BadRequestException("Motivo é obrigatório.");
    return motivo;
  }

  // Duas pessoas na mesma dose: o índice único parcial deixa uma passar e a outra cai aqui.
  private mapConcorrencia(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw recusa(
        "conflito_concorrencia",
        "Outra pessoa registrou esta dose ao mesmo tempo. Atualize a ficha e confira antes de aplicar.",
      );
    }
    throw error;
  }
}
