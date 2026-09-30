import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, EstadoBaia } from "@prisma/client";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { estadoCastracaoAnimal } from "../animais/estado-castracao";
import { AcaoBaiaDto } from "./dto/acao-baia.dto";
import { CreateBaiaDto } from "./dto/create-baia.dto";
import { ListBaiasDto } from "./dto/list-baias.dto";
import { UpdateBaiaDto } from "./dto/update-baia.dto";

const normalize = (codigo: string) => codigo.trim().toLocaleUpperCase("pt-BR");
const OCUPANTE_SELECT = {
  id: true,
  nome: true,
  numeroRegistro: true,
  especie: true,
  sexo: true,
  situacao: true,
  emIsolamento: true,
  idadeAproximada: true,
  raca: { select: { nome: true, tipo: true } },
  fotos: { select: { id: true, identificacao: true }, orderBy: [{ identificacao: "desc" }, { ordem: "asc" }, { id: "asc" }] },
  castracoes: { select: { id: true, tipo: true, estado: true, dataHoraPlanejada: true, dataEfetiva: true, dataEfetivaTemHora: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] },
} satisfies Prisma.AnimalSelect;

type BaiaComOcupantes = Prisma.BaiaGetPayload<{ include: { animais: { select: typeof OCUPANTE_SELECT } } }>;

@Injectable()
export class BaiasService {
  constructor(private readonly prisma: PrismaService) {}

  private async exists(id: number) {
    const baia = await this.prisma.baia.findUnique({ where: { id } });
    if (!baia) throw new NotFoundException("Baia não encontrada.");
    return baia;
  }

  private view(baia: BaiaComOcupantes) {
    const ocupacao = baia.animais.length;
    const { animais, ...dados } = baia;
    const ocupantes = animais.map((animal) => ({
      ...animal,
      estadoCastracao: estadoCastracaoAnimal(animal.castracoes),
      alertas: [
        ...(animal.sexo === "nao_informado" ? [{ tipo: "sexo_nao_informado", mensagem: "Sexo não informado." }] : []),
        ...(!animal.raca || animal.raca.tipo === "nao_informada" ? [{ tipo: "raca_nao_informada", mensagem: "Raça não informada." }] : []),
        ...(animal.idadeAproximada ? [{ tipo: "idade_aproximada", mensagem: "Idade aproximada." }] : []),
      ],
      fotos: animal.fotos.map((foto) => ({ ...foto, url: `/animais/${animal.id}/fotos/${foto.id}/arquivo` })),
    }));
    return { ...dados, ocupantes, ocupacao, vagasDisponiveis: Math.max(baia.capacidade - ocupacao, 0) };
  }

  async listar(filtros: ListBaiasDto) {
    const where: Prisma.BaiaWhereInput = {
      ...(filtros.setor ? { setor: filtros.setor } : {}),
      ...(filtros.estado ? { estado: filtros.estado } : {}),
      ...(filtros.busca?.trim() ? { codigoNormalizado: { contains: normalize(filtros.busca) } } : {}),
    };
    const baias = await this.prisma.baia.findMany({
      where,
      include: { animais: { select: OCUPANTE_SELECT, orderBy: [{ nome: "asc" }, { id: "asc" }] } },
      orderBy: [{ setor: "asc" }, { codigoNormalizado: "asc" }],
    });
    return baias.map((baia) => this.view(baia));
  }

  async obter(id: number) {
    const baia = await this.prisma.baia.findUnique({
      where: { id },
      include: { animais: { select: OCUPANTE_SELECT, orderBy: [{ nome: "asc" }, { id: "asc" }] } },
    });
    if (!baia) throw new NotFoundException("Baia não encontrada.");
    return this.view(baia);
  }

  async historico(id: number) {
    await this.exists(id);
    const eventos = await this.prisma.auditoriaEvento.findMany({
      where: { OR: [
        { AND: [
          { dados: { path: ["entidade"], equals: "baia" } },
          { dados: { path: ["entidadeId"], equals: String(id) } },
        ] },
        { tipo: "animal_baia_alterada", dados: { path: ["baiaOrigemId"], equals: id } },
        { tipo: "animal_baia_alterada", dados: { path: ["baiaDestinoId"], equals: id } },
        { tipo: "animal_adocao_concluida", dados: { path: ["baiaAnteriorId"], equals: id } },
        { tipo: "animal_devolucao_registrada", dados: { path: ["baiaDestinoId"], equals: id } },
      ] },
      include: { usuario: { select: { id: true, nome: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    const dadosMovimento = eventos
      .filter((evento) => evento.tipo.startsWith("animal_"))
      .map((evento) => ({ evento, dados: evento.dados as Record<string, unknown> }));
    const animalIds = dadosMovimento.map(({ dados }) => Number(dados.entidadeId)).filter(Number.isInteger);
    const baiaIds = dadosMovimento.flatMap(({ dados }) => [dados.baiaOrigemId, dados.baiaDestinoId, dados.baiaAnteriorId])
      .filter((valor): valor is number => typeof valor === "number");
    const [animais, baias] = await Promise.all([
      this.prisma.animal.findMany({ where: { id: { in: animalIds } }, select: { id: true, nome: true, numeroRegistro: true, especie: true } }),
      this.prisma.baia.findMany({ where: { id: { in: baiaIds } }, select: { id: true, codigo: true } }),
    ]);
    const animaisPorId = new Map(animais.map((animal) => [animal.id, animal]));
    const baiasPorId = new Map(baias.map((baia) => [baia.id, baia]));

    return eventos.map((evento) => {
      if (!evento.tipo.startsWith("animal_") || !evento.dados || typeof evento.dados !== "object" || Array.isArray(evento.dados)) return evento;
      const dados = evento.dados as Record<string, unknown>;
      const origemId = evento.tipo === "animal_adocao_concluida" ? dados.baiaAnteriorId : dados.baiaOrigemId;
      const destinoId = evento.tipo === "animal_adocao_concluida" ? null : dados.baiaDestinoId;
      const direcao = destinoId === id ? "entrada" : "saida";
      const outraBaiaId = direcao === "entrada" ? origemId : destinoId;
      const animalId = Number(dados.entidadeId);
      return {
        ...evento,
        movimentacao: {
          direcao,
          animalId,
          animal: animaisPorId.get(animalId) ?? null,
          baiaRelacionada: typeof outraBaiaId === "number" ? baiasPorId.get(outraBaiaId) ?? null : null,
          observacao: typeof dados.observacao === "string" ? dados.observacao : typeof dados.motivo === "string" ? dados.motivo : null,
        },
      };
    });
  }

  async criar(dto: CreateBaiaDto, ator: AuthUser) {
    this.validarCapacidade(dto.tipo, dto.capacidade);
    const codigo = dto.codigo.trim();
    if (!codigo) throw new BadRequestException("Código é obrigatório.");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const baia = await tx.baia.create({ data: {
          codigo, codigoNormalizado: normalize(codigo), setor: dto.setor, tipo: dto.tipo,
          capacidade: dto.capacidade, areaM2: dto.areaM2, possuiSolario: dto.possuiSolario ?? false,
          exclusivaIsolamento: dto.exclusivaIsolamento ?? false,
        }, include: { animais: { select: OCUPANTE_SELECT } } });
        await this.audit(tx, ator, baia.id, "baia_criada", { depois: this.snapshot(baia) });
        return this.view(baia);
      });
    } catch (error) { this.mapUnique(error); }
  }

  async atualizar(id: number, dto: UpdateBaiaDto, ator: AuthUser) {
    if (dto.tipo && dto.capacidade !== undefined) this.validarCapacidade(dto.tipo, dto.capacidade);
    return this.prisma.$transaction(async (tx) => {
      const atual = await tx.baia.findUnique({ where: { id } });
      if (!atual) throw new NotFoundException("Baia não encontrada.");
      const ocupacao = await tx.animal.count({ where: { baiaId: id } });
      const tipo = dto.tipo ?? atual.tipo;
      const capacidade = dto.capacidade ?? atual.capacidade;
      this.validarCapacidade(tipo, capacidade);
      if (capacidade < ocupacao) throw new ConflictException("Capacidade não pode ser menor que a ocupação atual.");
      if (dto.exclusivaIsolamento === true) {
        const incompatíveis = await tx.animal.count({ where: { baiaId: id, emIsolamento: false } });
        if (incompatíveis > 0) {
          throw new ConflictException("Baia ocupada por animal sem isolamento não pode virar exclusiva de isolamento.");
        }
      }
      const codigo = dto.codigo?.trim() ?? atual.codigo;
      if (!codigo) throw new BadRequestException("Código é obrigatório.");
      const atualizada = await tx.baia.update({ where: { id }, data: {
        ...(dto.codigo !== undefined ? { codigo, codigoNormalizado: normalize(codigo) } : {}),
        ...(dto.setor !== undefined ? { setor: dto.setor } : {}), ...(dto.tipo !== undefined ? { tipo } : {}),
        ...(dto.capacidade !== undefined ? { capacidade } : {}), ...(dto.areaM2 !== undefined ? { areaM2: dto.areaM2 } : {}),
        ...(dto.possuiSolario !== undefined ? { possuiSolario: dto.possuiSolario } : {}),
        ...(dto.exclusivaIsolamento !== undefined ? { exclusivaIsolamento: dto.exclusivaIsolamento } : {}),
      }, include: { animais: { select: OCUPANTE_SELECT, orderBy: [{ nome: "asc" }, { id: "asc" }] } } });
      await this.audit(tx, ator, id, "baia_editada", { antes: this.snapshot(atual), depois: this.snapshot(atualizada) });
      return this.view(atualizada);
    }).catch((error) => this.mapUnique(error));
  }

  async acao(id: number, acao: string, dto: AcaoBaiaDto, ator: AuthUser) {
    const transitions: Record<string, { from: EstadoBaia[]; to: EstadoBaia }> = {
      interditar: { from: ["ativa"], to: "interditada" }, liberar: { from: ["interditada"], to: "ativa" },
      inativar: { from: ["ativa", "interditada"], to: "inativa" }, reativar: { from: ["inativa"], to: "ativa" },
      iniciar_higienizacao: { from: ["ativa"], to: "em_higienizacao" },
    };
    if (acao === "concluir_higienizacao") return this.concluirHigienizacao(id, dto, ator);
    const transition = transitions[acao];
    if (!transition) throw new BadRequestException("Ação de baia inválida.");
    return this.prisma.$transaction(async (tx) => {
      const atual = await tx.baia.findUnique({ where: { id } });
      if (!atual) throw new NotFoundException("Baia não encontrada.");
      if (!transition.from.includes(atual.estado)) throw new ConflictException(`Não é possível executar ${acao} no estado ${atual.estado}.`);
      if (["interditar", "inativar", "iniciar_higienizacao"].includes(acao)) {
        await this.assertVazia(tx, id, `Não é possível executar ${acao} em baia ocupada.`);
      }
      const result = await tx.baia.updateMany({ where: { id, estado: atual.estado }, data: { estado: transition.to } });
      if (result.count !== 1) throw new ConflictException("A baia foi alterada por outra operação. Atualize e tente novamente.");
      const nova = { ...atual, estado: transition.to };
      await this.audit(tx, ator, id, `baia_${acao}`, { estadoAnterior: atual.estado, estadoNovo: transition.to, observacao: dto.observacao ?? null });
      return this.view({ ...nova, animais: [] });
    });
  }

  private async concluirHigienizacao(id: number, dto: AcaoBaiaDto, ator: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const atual = await tx.baia.findUnique({ where: { id } });
      if (!atual) throw new NotFoundException("Baia não encontrada.");
      if (atual.estado !== "em_higienizacao") throw new ConflictException("A baia não está em higienização.");
      const agora = new Date();
      const result = await tx.baia.updateMany({ where: { id, estado: "em_higienizacao" }, data: { estado: "ativa", ultimaHigienizacaoEm: agora } });
      if (result.count !== 1) throw new ConflictException("A baia foi alterada por outra operação. Atualize e tente novamente.");
      const nova = { ...atual, estado: "ativa" as const, ultimaHigienizacaoEm: agora };
      await this.audit(tx, ator, id, "baia_higienizacao_concluida", { estadoAnterior: atual.estado, estadoNovo: "ativa", ultimaHigienizacaoEm: agora.toISOString(), observacao: dto.observacao ?? null });
      return this.view({ ...nova, animais: [] });
    });
  }

  private async assertVazia(tx: Prisma.TransactionClient, id: number, message: string) {
    const ocupacao = await tx.animal.count({ where: { baiaId: id } });
    if (ocupacao > 0) throw new ConflictException(message);
  }

  private validarCapacidade(tipo: string, capacidade: number) {
    if (!Number.isInteger(capacidade) || capacidade < 1) throw new BadRequestException("Capacidade deve ser um inteiro maior ou igual a 1.");
    if (tipo === "individual" && capacidade !== 1) throw new BadRequestException("Baia individual deve ter capacidade exatamente 1.");
  }

  private snapshot(baia: Record<string, unknown>) {
    return Object.fromEntries(["codigo", "setor", "tipo", "capacidade", "areaM2", "possuiSolario", "exclusivaIsolamento", "estado"].map((key) => [key, baia[key]]));
  }

  private async audit(tx: Prisma.TransactionClient, ator: AuthUser, id: number, tipo: string, dados: object) {
    await tx.auditoriaEvento.create({ data: { tipo, usuarioId: ator.id, dados: { entidade: "baia", entidadeId: String(id), acao: tipo, ...dados } } });
  }

  private mapUnique(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("Já existe uma baia com este código.");
    throw error;
  }
}
