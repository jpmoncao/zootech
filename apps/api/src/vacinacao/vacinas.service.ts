import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Vacina } from "@prisma/client";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { normalizeLookup, normalizeText } from "../animais/animais.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateVacinaDto } from "./dto/create-vacina.dto";
import { ListVacinasDto } from "./dto/list-vacinas.dto";
import { UpdateVacinaDto } from "./dto/update-vacina.dto";

const CAMPOS_ESQUEMA = ["totalDoses", "intervaloDosesDias", "revacinacaoDias"] as const;

@Injectable()
export class VacinasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(filtros: ListVacinasDto) {
    const where: Prisma.VacinaWhereInput = {};
    if (filtros.ativa !== undefined) where.ativa = filtros.ativa;
    if (filtros.especie) where.especies = { has: filtros.especie };
    if (filtros.busca?.trim()) where.nomeNormalizado = { contains: normalizeLookup(filtros.busca) };
    return this.prisma.vacina.findMany({ where, orderBy: [{ nome: "asc" }, { id: "asc" }] });
  }

  async obter(id: number) {
    const vacina = await this.prisma.vacina.findUnique({ where: { id } });
    if (!vacina) throw new NotFoundException("Vacina não encontrada.");
    const protocolosEmAndamento = await this.prisma.protocoloVacinal.count({
      where: { vacinaId: id, status: "em_andamento" },
    });
    return { ...vacina, protocolosEmAndamento };
  }

  async criar(dto: CreateVacinaDto, ator: AuthUser) {
    const nome = this.nomeValido(dto.nome);
    this.validarEsquema(dto.totalDoses, dto.intervaloDosesDias ?? null);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const vacina = await tx.vacina.create({
          data: {
            nome,
            nomeNormalizado: normalizeLookup(nome),
            especies: [...dto.especies].sort(),
            totalDoses: dto.totalDoses,
            intervaloDosesDias: dto.intervaloDosesDias ?? null,
            revacinacaoDias: dto.revacinacaoDias ?? null,
            diasAvisoProximaDose: dto.diasAvisoProximaDose ?? 7,
            idadeMinimaSemanas: dto.idadeMinimaSemanas ?? null,
            fabricante: this.textoOpcional(dto.fabricante),
            viaAplicacaoSugerida: this.textoOpcional(dto.viaAplicacaoSugerida),
            obrigatoria: dto.obrigatoria ?? false,
            observacoes: this.textoOpcional(dto.observacoes),
          },
        });
        await this.auditar(tx, ator.id, vacina.id, "vacina_criada", { nome: vacina.nome });
        return vacina;
      });
    } catch (error) {
      this.mapUnique(error);
    }
  }

  async atualizar(id: number, dto: UpdateVacinaDto, ator: AuthUser) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const atual = await tx.vacina.findUnique({ where: { id } });
        if (!atual) throw new NotFoundException("Vacina não encontrada.");

        const data: Prisma.VacinaUpdateInput = {};
        if (dto.nome !== undefined) {
          const nome = this.nomeValido(dto.nome);
          data.nome = nome;
          data.nomeNormalizado = normalizeLookup(nome);
        }
        if (dto.especies !== undefined) data.especies = [...dto.especies].sort();
        if (dto.totalDoses !== undefined) data.totalDoses = dto.totalDoses;
        if (dto.intervaloDosesDias !== undefined) data.intervaloDosesDias = dto.intervaloDosesDias;
        if (dto.revacinacaoDias !== undefined) data.revacinacaoDias = dto.revacinacaoDias;
        if (dto.diasAvisoProximaDose !== undefined) data.diasAvisoProximaDose = dto.diasAvisoProximaDose;
        if (dto.idadeMinimaSemanas !== undefined) data.idadeMinimaSemanas = dto.idadeMinimaSemanas;
        if (dto.fabricante !== undefined) data.fabricante = this.textoOpcional(dto.fabricante);
        if (dto.viaAplicacaoSugerida !== undefined) data.viaAplicacaoSugerida = this.textoOpcional(dto.viaAplicacaoSugerida);
        if (dto.obrigatoria !== undefined) data.obrigatoria = dto.obrigatoria;
        if (dto.observacoes !== undefined) data.observacoes = this.textoOpcional(dto.observacoes);

        const totalDoses = dto.totalDoses ?? atual.totalDoses;
        const intervalo = dto.intervaloDosesDias === undefined ? atual.intervaloDosesDias : dto.intervaloDosesDias;
        this.validarEsquema(totalDoses, intervalo);

        const depois = await tx.vacina.update({ where: { id }, data });
        const mudancas = this.diff(atual, depois);

        // Protocolos já iniciados guardam o esquema da criação; a tela precisa saber quantos seguem com o anterior.
        const esquemaMudou = CAMPOS_ESQUEMA.some((campo) => campo in mudancas);
        const protocolosComEsquemaAnterior = esquemaMudou
          ? await tx.protocoloVacinal.count({ where: { vacinaId: id, status: "em_andamento" } })
          : 0;

        if (Object.keys(mudancas).length > 0) {
          await this.auditar(tx, ator.id, id, "vacina_editada", { mudancas, protocolosComEsquemaAnterior });
        }
        return { ...depois, protocolosComEsquemaAnterior };
      });
    } catch (error) {
      this.mapUnique(error);
    }
  }

  async inativar(id: number, ator: AuthUser) {
    return this.alterarEstado(id, false, "vacina_inativada", "Vacina já está inativa.", ator);
  }

  async reativar(id: number, ator: AuthUser) {
    return this.alterarEstado(id, true, "vacina_reativada", "Vacina já está ativa.", ator);
  }

  private async alterarEstado(id: number, ativa: boolean, tipo: string, jaNoEstado: string, ator: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const atual = await tx.vacina.findUnique({ where: { id } });
      if (!atual) throw new NotFoundException("Vacina não encontrada.");
      if (atual.ativa === ativa) throw new ConflictException(jaNoEstado);
      const vacina = await tx.vacina.update({ where: { id }, data: { ativa } });
      await this.auditar(tx, ator.id, id, tipo, { nome: vacina.nome });
      return vacina;
    });
  }

  private nomeValido(valor: string): string {
    const nome = normalizeText(valor);
    if (!nome) throw new BadRequestException("Nome da vacina é obrigatório.");
    return nome;
  }

  private textoOpcional(valor: string | null | undefined): string | null {
    if (valor === undefined || valor === null) return null;
    return normalizeText(valor) || null;
  }

  private validarEsquema(totalDoses: number, intervaloDosesDias: number | null) {
    if (totalDoses > 1 && intervaloDosesDias === null) {
      throw new BadRequestException("Informe o intervalo em dias entre as doses quando o esquema tem mais de uma dose.");
    }
  }

  private diff(antes: Vacina, depois: Vacina) {
    const mudancas: Record<string, { antes: unknown; depois: unknown }> = {};
    for (const chave of Object.keys(depois) as (keyof Vacina)[]) {
      if (chave === "updatedAt" || chave === "createdAt") continue;
      const a = antes[chave];
      const d = depois[chave];
      if (JSON.stringify(a) !== JSON.stringify(d)) mudancas[chave] = { antes: a, depois: d };
    }
    return mudancas;
  }

  private async auditar(tx: Prisma.TransactionClient, usuarioId: number, vacinaId: number, tipo: string, dados: Record<string, unknown>) {
    await tx.auditoriaEvento.create({
      data: {
        tipo,
        usuarioId,
        dados: { entidade: "vacina", entidadeId: String(vacinaId), acao: tipo, ...dados } as Prisma.InputJsonValue,
      },
    });
  }

  private mapUnique(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException("Já existe uma vacina com este nome.");
    }
    throw error;
  }
}
