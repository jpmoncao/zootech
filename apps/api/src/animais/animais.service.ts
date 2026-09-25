import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Prisma,
  type Animal,
  type EventoAnimal,
  type FotoAnimal,
  type ObservacaoAnimal,
  type PesagemAnimal,
  type SituacaoAnimal,
  type TipoEventoAnimal,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import sharp from "sharp";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { AlocarAnimalDto } from "./dto/alocar-animal.dto";
import { CreateAnimalDto } from "./dto/create-animal.dto";
import { CreateEventoAnimalDto } from "./dto/create-evento-animal.dto";
import { CreateObservacaoAnimalDto } from "./dto/create-observacao-animal.dto";
import { CreatePesagemAnimalDto } from "./dto/create-pesagem-animal.dto";
import { CreateRacaAnimalDto } from "./dto/create-raca-animal.dto";
import { ListAnimaisDto } from "./dto/list-animais.dto";
import { RevogarSituacaoDto } from "./dto/revogar-situacao.dto";
import { UpdateAnimalDto } from "./dto/update-animal.dto";

const TERMINAIS: SituacaoAnimal[] = ["adotado", "obito"];
const FOTO_MAX_BYTES = 5 * 1024 * 1024;
const FOTO_MAX_DIMENSION = 1200;
const FOTO_MAX_ITEMS = 10;
const FOTO_ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const API_ROOT = resolve(__dirname, "..", "..");
const LIST_INCLUDE = {
  raca: true,
  baia: { select: { id: true, codigo: true, setor: true } },
  criadoPor: { select: { id: true, nome: true, perfilAcesso: true } },
  fotos: { orderBy: [{ identificacao: "desc" }, { ordem: "asc" }, { id: "asc" }] },
} satisfies Prisma.AnimalInclude;

const DETAIL_INCLUDE = {
  ...LIST_INCLUDE,
  pesagens: {
    include: { usuario: { select: { id: true, nome: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  },
  observacoes: {
    include: { usuario: { select: { id: true, nome: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  },
  eventos: {
    include: { usuario: { select: { id: true, nome: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  },
} satisfies Prisma.AnimalInclude;

type AnimalListEntity = Prisma.AnimalGetPayload<{ include: typeof LIST_INCLUDE }>;
type AnimalDetailEntity = Prisma.AnimalGetPayload<{ include: typeof DETAIL_INCLUDE }>;

function normalizeText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

function normalizeLookup(value: string): string {
  return normalizeText(value).toLocaleLowerCase("pt-BR");
}

function normalizeRegistro(value: string): string {
  return normalizeLookup(value);
}

function asDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(value);
}

@Injectable()
export class AnimaisService {
  private readonly mediaRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const configured = config.get<string>("ZOOTECH_MEDIA_ROOT") ?? config.get<string>("MEDIA_ROOT");
    this.mediaRoot = configured
      ? isAbsolute(configured)
        ? resolve(configured)
        : resolve(API_ROOT, configured)
      : resolve(API_ROOT, "storage", "media");
  }

  async listar(filtros: ListAnimaisDto) {
    const pagina = filtros.pagina ?? 1;
    const limite = filtros.limite ?? 20;
    const where: Prisma.AnimalWhereInput = {
      ...(filtros.busca?.trim()
        ? {
          OR: [
            { nome: { contains: normalizeText(filtros.busca), mode: "insensitive" } },
            { numeroRegistroNormalizado: { contains: normalizeRegistro(filtros.busca) } },
          ],
        }
        : {}),
      ...(filtros.especie ? { especie: filtros.especie } : {}),
      ...(filtros.sexo ? { sexo: filtros.sexo } : {}),
      ...(filtros.porte ? { porte: filtros.porte } : {}),
      ...(filtros.castrado ? { castrado: filtros.castrado } : {}),
      ...(filtros.baiaId ? { baiaId: filtros.baiaId } : {}),
      ...(filtros.semBaia ? { baiaId: null } : {}),
      ...(filtros.situacao
        ? { situacao: filtros.situacao }
        : filtros.incluirTerminais
          ? {}
          : { situacao: { notIn: TERMINAIS } }),
    };

    const [total, animais] = await this.prisma.$transaction([
      this.prisma.animal.count({ where }),
      this.prisma.animal.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
    ]);
    const items = animais.map((animal) => this.viewAnimal(animal));

    return {
      items: filtros.comAlertas ? items.filter((animal) => animal.alertas.length > 0) : items,
      total,
      pagina,
      limite,
    };
  }

  async obter(id: number) {
    return this.viewAnimal(await this.getDetailOrThrow(id));
  }

  async listarRacas(especie?: "cao" | "gato") {
    return this.prisma.racaAnimal.findMany({
      where: especie ? { especie } : {},
      orderBy: [{ especie: "asc" }, { tipo: "asc" }, { nome: "asc" }],
    });
  }

  async criarRaca(dto: CreateRacaAnimalDto) {
    const nome = normalizeText(dto.nome);
    if (!nome) throw new BadRequestException("Nome da raça é obrigatório.");
    if (["outra", "não informada", "nao informada"].includes(normalizeLookup(nome))) {
      throw new BadRequestException("Use as opções especiais já cadastradas.");
    }
    try {
      return await this.prisma.racaAnimal.create({
        data: {
          especie: dto.especie,
          nome,
          nomeNormalizado: normalizeLookup(nome),
          tipo: "personalizada",
          catalogoPadrao: false,
        },
      });
    } catch (error) {
      this.mapUnique(error, "Já existe uma raça com este nome para a espécie.");
    }
  }

  async criar(dto: CreateAnimalDto, ator: AuthUser) {
    const data = await this.buildCreateData(dto, ator);
    try {
      const animal = await this.prisma.$transaction(async (tx) => {
        const created = await tx.animal.create({ data, include: DETAIL_INCLUDE });
        const resumo = `Animal ${created.numeroRegistro} criado.`;
        await this.createEvento(tx, created.id, "criacao", resumo, ator.id, { depois: this.snapshot(created) });
        await this.createAudit(tx, ator.id, created.id, "animal_criado", { depois: this.snapshot(created) });
        return created;
      });
      return this.viewAnimal(animal);
    } catch (error) {
      this.mapUnique(error, "Já existe um animal com este número de registro.");
    }
  }

  async atualizar(id: number, dto: UpdateAnimalDto, ator: AuthUser) {
    try {
      const animal = await this.prisma.$transaction(async (tx) => {
        const atual = await tx.animal.findUnique({ where: { id }, include: DETAIL_INCLUDE });
        if (!atual) throw new NotFoundException("Animal não encontrado.");
        this.assertEditable(atual);
        await this.validateIsolationUpdate(tx, atual, dto);
        const data = await this.buildUpdateData(tx, atual, dto);
        if (Object.keys(data).length === 0) return atual;
        const atualizado = await tx.animal.update({ where: { id }, data, include: DETAIL_INCLUDE });
        const tipo: TipoEventoAnimal = atual.situacao !== atualizado.situacao ? "mudanca_situacao" : "edicao";
        const resumo = tipo === "mudanca_situacao"
          ? `Situação alterada de ${atual.situacao} para ${atualizado.situacao}.`
          : "Ficha do animal editada.";
        const mudancas = this.diffSnapshots(this.snapshot(atual), this.snapshot(atualizado));
        await this.createEvento(tx, id, tipo, resumo, ator.id, { mudancas });
        await this.createAudit(tx, ator.id, id, "animal_editado", { mudancas });
        return atualizado;
      });
      return this.viewAnimal(animal);
    } catch (error) {
      this.mapUnique(error, "Já existe um animal com este número de registro.");
    }
  }

  async observar(id: number, dto: CreateObservacaoAnimalDto, ator: AuthUser) {
    const texto = normalizeText(dto.texto);
    if (!texto) throw new BadRequestException("Texto da observação é obrigatório.");
    return this.prisma.$transaction(async (tx) => {
      const animal = await tx.animal.findUnique({ where: { id } });
      if (!animal) throw new NotFoundException("Animal não encontrado.");
      this.assertEditable(animal);
      if (dto.observacaoOrigemId) {
        const origem = await tx.observacaoAnimal.findFirst({ where: { id: dto.observacaoOrigemId, animalId: id } });
        if (!origem) throw new BadRequestException("Observação de origem não pertence a este animal.");
      }
      const observacao = await tx.observacaoAnimal.create({
        data: { animalId: id, texto, usuarioId: ator.id, observacaoOrigemId: dto.observacaoOrigemId },
        include: { usuario: { select: { id: true, nome: true } } },
      });
      await this.createEvento(tx, id, "observacao", "Observação registrada.", ator.id, { observacaoId: observacao.id, texto });
      await this.createAudit(tx, ator.id, id, "animal_observacao_registrada", { observacaoId: observacao.id });
      return this.viewObservacao(observacao);
    });
  }

  async pesar(id: number, dto: CreatePesagemAnimalDto, ator: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const animal = await tx.animal.findUnique({ where: { id } });
      if (!animal) throw new NotFoundException("Animal não encontrado.");
      this.assertEditable(animal);
      const pesagem = await tx.pesagemAnimal.create({
        data: { animalId: id, valorKg: dto.valorKg, observacao: dto.observacao?.trim() || null, usuarioId: ator.id },
        include: { usuario: { select: { id: true, nome: true } } },
      });
      await tx.animal.update({ where: { id }, data: { pesoAtualKg: dto.valorKg } });
      await this.createEvento(tx, id, "pesagem", `Pesagem registrada: ${dto.valorKg} kg.`, ator.id, { pesagemId: pesagem.id, valorKg: dto.valorKg });
      await this.createAudit(tx, ator.id, id, "animal_pesagem_registrada", { pesagemId: pesagem.id, valorKg: dto.valorKg });
      return this.viewPesagem(pesagem);
    });
  }

  async registrarEvento(id: number, dto: CreateEventoAnimalDto, ator: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const animal = await tx.animal.findUnique({ where: { id } });
      if (!animal) throw new NotFoundException("Animal não encontrado.");
      this.assertEditable(animal);
      const evento = await this.createEvento(tx, id, dto.tipo, normalizeText(dto.resumo), ator.id, dto.dados ?? {});
      await this.createAudit(tx, ator.id, id, `animal_${dto.tipo}_registrado`, { eventoId: evento.id, resumo: evento.resumo });
      return this.viewEvento(evento);
    });
  }

  async alocar(id: number, dto: AlocarAnimalDto, ator: AuthUser) {
    if (dto.baiaId === undefined) {
      throw new BadRequestException("Informe a baia de destino ou null para retirar o animal da baia.");
    }
    return this.prisma.$transaction(async (tx) => {
      const atual = await tx.animal.findUnique({ where: { id }, include: DETAIL_INCLUDE });
      if (!atual) throw new NotFoundException("Animal não encontrado.");
      this.assertEditable(atual);

      const origemId = atual.baiaId;
      const destinoId = dto.baiaId ?? null;
      if (origemId === destinoId) return this.viewAnimal(atual);

      if (destinoId !== null) {
        await this.lockBaia(tx, destinoId);
        const destino = await tx.baia.findUnique({ where: { id: destinoId } });
        if (!destino) throw new NotFoundException("Baia de destino não encontrada.");
        await this.assertPodeReceberAnimal(tx, destino, atual);
      }

      const atualizado = await tx.animal.update({ where: { id }, data: { baiaId: destinoId }, include: DETAIL_INCLUDE });

      const baiaOrigem = atual.baia ? atual.baia.codigo : null;
      const baiaDestino = atualizado.baia ? atualizado.baia.codigo : null;  

      const resumo = this.resumoAlocacao(baiaOrigem, baiaDestino);
      const dados = {
        baiaOrigemId: origemId,
        baiaDestinoId: destinoId,
        observacao: dto.observacao?.trim() || null,
      };
      await this.createEvento(tx, id, "mudanca_baia", resumo, ator.id, dados);
      await this.createAudit(tx, ator.id, id, "animal_baia_alterada", dados);
      return this.viewAnimal(atualizado);
    });
  }

  async adicionarFoto(id: number, file: Express.Multer.File | undefined, ator: AuthUser) {
    if (!file) throw new BadRequestException("Arquivo da foto é obrigatório.");
    const processed = await this.processFoto(file);
    const nomeArquivo = `${randomUUID()}.webp`;
    const caminhoRelativo = ["animais", String(id), nomeArquivo].join("/");
    const caminhoAbsoluto = this.resolveManagedPath("animais", String(id), nomeArquivo);

    await mkdir(dirname(caminhoAbsoluto), { recursive: true });
    await writeFile(caminhoAbsoluto, processed.buffer);

    try {
      const foto = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "animais" WHERE id = ${id} FOR UPDATE`;
        const animal = await tx.animal.findUnique({ where: { id } });
        if (!animal) throw new NotFoundException("Animal não encontrado.");
        this.assertEditable(animal);

        const total = await tx.fotoAnimal.count({ where: { animalId: id } });
        if (total >= FOTO_MAX_ITEMS) throw new ConflictException("A galeria do animal já possui 10 fotos.");
        const ultima = await tx.fotoAnimal.findFirst({
          where: { animalId: id },
          orderBy: [{ ordem: "desc" }, { id: "desc" }],
          select: { ordem: true },
        });
        const created = await tx.fotoAnimal.create({
          data: {
            animalId: id,
            caminhoAbsoluto: caminhoRelativo,
            nomeArquivo,
            mimeType: "image/webp",
            tamanhoBytes: processed.buffer.byteLength,
            largura: processed.largura,
            altura: processed.altura,
            identificacao: total === 0,
            ordem: (ultima?.ordem ?? -1) + 1,
          },
        });
        await this.createEvento(tx, id, "foto", "Foto adicionada à galeria.", ator.id, { fotoId: created.id });
        await this.createAudit(tx, ator.id, id, "animal_foto_adicionada", { fotoId: created.id });
        return created;
      });
      return this.viewFoto(foto);
    } catch (error) {
      await this.unlinkIfManaged(caminhoAbsoluto);
      throw error;
    }
  }

  async obterArquivoFoto(animalId: number, fotoId: number) {
    const foto = await this.prisma.fotoAnimal.findFirst({ where: { id: fotoId, animalId } });
    if (!foto) throw new NotFoundException("Foto não encontrada.");
    const caminho = this.resolveStoredPath(foto.caminhoAbsoluto);
    try {
      await access(caminho);
    } catch {
      throw new NotFoundException("Arquivo da foto não encontrado.");
    }
    return {
      file: new StreamableFile(createReadStream(caminho)),
      mimeType: foto.mimeType,
      length: foto.tamanhoBytes,
    };
  }

  async removerFoto(animalId: number, fotoId: number, ator: AuthUser) {
    const removed = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "animais" WHERE id = ${animalId} FOR UPDATE`;
      const animal = await tx.animal.findUnique({ where: { id: animalId } });
      if (!animal) throw new NotFoundException("Animal não encontrado.");
      this.assertEditable(animal);
      const foto = await tx.fotoAnimal.findFirst({ where: { id: fotoId, animalId } });
      if (!foto) throw new NotFoundException("Foto não encontrada.");

      await tx.fotoAnimal.delete({ where: { id: foto.id } });
      if (foto.identificacao) {
        const proxima = await tx.fotoAnimal.findFirst({
          where: { animalId },
          orderBy: [{ ordem: "asc" }, { id: "asc" }],
        });
        if (proxima) {
          await tx.fotoAnimal.update({ where: { id: proxima.id }, data: { identificacao: true } });
        }
      }
      await this.createEvento(tx, animalId, "foto", "Foto removida da galeria.", ator.id, { fotoId });
      await this.createAudit(tx, ator.id, animalId, "animal_foto_removida", { fotoId });
      return foto;
    });

    await this.unlinkFotoIfUnreferenced(removed);
    return { ok: true };
  }

  async timeline(id: number) {
    await this.exists(id);
    const eventos = await this.prisma.eventoAnimal.findMany({
      where: { animalId: id },
      include: { usuario: { select: { id: true, nome: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    console.log(eventos);
    return eventos.map((evento) => this.viewEvento(evento));
  }

  async revogarSituacao(id: number, dto: RevogarSituacaoDto, ator: AuthUser) {
    if (ator.perfilAcesso !== "coordenacao") {
      throw new ForbiddenException("Somente a coordenação pode revogar situação terminal.");
    }
    return this.prisma.$transaction(async (tx) => {
      const atual = await tx.animal.findUnique({ where: { id }, include: DETAIL_INCLUDE });
      if (!atual) throw new NotFoundException("Animal não encontrado.");
      if (!TERMINAIS.includes(atual.situacao)) throw new ConflictException("Animal não está em situação terminal.");
      const atualizado = await tx.animal.update({ where: { id }, data: { situacao: dto.situacao }, include: DETAIL_INCLUDE });
      await this.createEvento(tx, id, "revogacao_situacao_terminal", `Situação terminal ${atual.situacao} revogada.`, ator.id, {
        situacaoAnterior: atual.situacao,
        situacaoNova: dto.situacao,
        motivo: dto.motivo.trim(),
      });
      await this.createAudit(tx, ator.id, id, "animal_situacao_terminal_revogada", {
        situacaoAnterior: atual.situacao,
        situacaoNova: dto.situacao,
        motivo: dto.motivo.trim(),
      });
      return this.viewAnimal(atualizado);
    });
  }

  private async exists(id: number) {
    const animal = await this.prisma.animal.findUnique({ where: { id } });
    if (!animal) throw new NotFoundException("Animal não encontrado.");
    return animal;
  }

  private async getDetailOrThrow(id: number) {
    const animal = await this.prisma.animal.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!animal) throw new NotFoundException("Animal não encontrado.");
    return animal;
  }

  private async buildCreateData(dto: CreateAnimalDto, ator: AuthUser): Promise<Prisma.AnimalCreateInput> {
    const nome = normalizeText(dto.nome);
    const numeroRegistro = normalizeText(dto.numeroRegistro);
    if (!nome) throw new BadRequestException("Nome é obrigatório.");
    if (!numeroRegistro) throw new BadRequestException("Número de registro é obrigatório.");
    const raca = dto.racaId ? await this.getRaca(dto.racaId, dto.especie) : undefined;
    const datas = this.resolveDatas(dto);
    return {
      nome,
      numeroRegistro,
      numeroRegistroNormalizado: normalizeRegistro(numeroRegistro),
      especie: dto.especie,
      ...(raca ? { raca: { connect: { id: raca.id } } } : {}),
      sexo: dto.sexo ?? "nao_informado",
      porte: dto.porte ?? "nao_informado",
      corPelagem: dto.corPelagem ? normalizeText(dto.corPelagem) : null,
      situacao: dto.situacao ?? "em_tratamento",
      emIsolamento: dto.emIsolamento ?? false,
      castrado: dto.castrado ?? "nao_informado",
      pesoAtualKg: dto.pesoAtualKg,
      dataAcolhimento: datas.dataAcolhimento,
      dataNascimento: datas.dataNascimento,
      idadeEstimadaQuantidade: datas.idadeEstimadaQuantidade,
      idadeEstimadaUnidade: datas.idadeEstimadaUnidade,
      idadeAproximada: datas.idadeAproximada,
      nasceuNoCcz: dto.nasceuNoCcz ?? false,
      acolhidoPor: dto.acolhidoPor ? normalizeText(dto.acolhidoPor) : null,
      criadoPor: { connect: { id: ator.id } },
    };
  }

  private async buildUpdateData(tx: Prisma.TransactionClient, atual: Animal, dto: UpdateAnimalDto): Promise<Prisma.AnimalUpdateInput> {
    const especie = dto.especie ?? atual.especie;
    const data: Prisma.AnimalUpdateInput = {};
    if (dto.nome !== undefined) data.nome = this.requiredText(dto.nome, "Nome é obrigatório.");
    if (dto.numeroRegistro !== undefined) {
      const numeroRegistro = this.requiredText(dto.numeroRegistro, "Número de registro é obrigatório.");
      data.numeroRegistro = numeroRegistro;
      data.numeroRegistroNormalizado = normalizeRegistro(numeroRegistro);
    }
    if (dto.especie !== undefined) data.especie = dto.especie;
    if (dto.racaId !== undefined) {
      data.raca = dto.racaId === null ? { disconnect: true } : { connect: { id: (await this.getRaca(dto.racaId, especie, tx)).id } };
    } else if (dto.especie !== undefined && atual.racaId) {
      await this.getRaca(atual.racaId, especie, tx);
    }
    if (dto.sexo !== undefined) data.sexo = dto.sexo;
    if (dto.porte !== undefined) data.porte = dto.porte;
    if (dto.corPelagem !== undefined) data.corPelagem = dto.corPelagem ? normalizeText(dto.corPelagem) : null;
    if (dto.situacao !== undefined) {
      data.situacao = dto.situacao;
    }
    if (dto.emIsolamento !== undefined) data.emIsolamento = dto.emIsolamento;
    if (dto.castrado !== undefined) data.castrado = dto.castrado;
    if (dto.pesoAtualKg !== undefined) data.pesoAtualKg = dto.pesoAtualKg;
    if (dto.acolhidoPor !== undefined) data.acolhidoPor = dto.acolhidoPor ? normalizeText(dto.acolhidoPor) : null;
    const shouldResolveDates = [
      dto.dataAcolhimento,
      dto.dataNascimento,
      dto.idadeEstimadaQuantidade,
      dto.idadeEstimadaUnidade,
      dto.idadeAproximada,
      dto.nasceuNoCcz,
    ].some((value) => value !== undefined);
    if (shouldResolveDates) {
      const resolved = this.resolveDatas({
        dataAcolhimento: dto.dataAcolhimento === undefined ? atual.dataAcolhimento?.toISOString() : dto.dataAcolhimento,
        dataNascimento: dto.dataNascimento === undefined ? atual.dataNascimento?.toISOString() : dto.dataNascimento,
        idadeEstimadaQuantidade: dto.idadeEstimadaQuantidade === undefined ? atual.idadeEstimadaQuantidade ?? undefined : dto.idadeEstimadaQuantidade,
        idadeEstimadaUnidade: dto.idadeEstimadaUnidade === undefined ? atual.idadeEstimadaUnidade ?? undefined : dto.idadeEstimadaUnidade,
        idadeAproximada: dto.idadeAproximada === undefined ? atual.idadeAproximada : dto.idadeAproximada,
        nasceuNoCcz: dto.nasceuNoCcz === undefined ? atual.nasceuNoCcz : dto.nasceuNoCcz,
      });
      data.dataAcolhimento = resolved.dataAcolhimento;
      data.dataNascimento = resolved.dataNascimento;
      data.idadeEstimadaQuantidade = resolved.idadeEstimadaQuantidade;
      data.idadeEstimadaUnidade = resolved.idadeEstimadaUnidade;
      data.idadeAproximada = resolved.idadeAproximada;
      data.nasceuNoCcz = dto.nasceuNoCcz ?? atual.nasceuNoCcz;
    }
    return data;
  }

  private async validateIsolationUpdate(tx: Prisma.TransactionClient, atual: Animal, dto: UpdateAnimalDto) {
    if (dto.emIsolamento !== false || !atual.baiaId) return;
    const baia = await tx.baia.findUnique({ where: { id: atual.baiaId } });
    if (baia?.exclusivaIsolamento) {
      throw new ConflictException("Animal alocado em baia exclusiva de isolamento deve permanecer marcado em isolamento.");
    }
  }

  private resolveDatas(dto: {
    dataAcolhimento?: string | null;
    dataNascimento?: string | null;
    idadeEstimadaQuantidade?: number | null;
    idadeEstimadaUnidade?: "dias" | "meses" | "anos" | null;
    idadeAproximada?: boolean;
    nasceuNoCcz?: boolean;
  }) {
    const dataNascimento = asDate(dto.dataNascimento);
    let dataAcolhimento = asDate(dto.dataAcolhimento);
    const nasceuNoCcz = dto.nasceuNoCcz ?? false;
    if (nasceuNoCcz && !dataAcolhimento && dataNascimento) dataAcolhimento = dataNascimento;
    if (!dataAcolhimento && !nasceuNoCcz) throw new BadRequestException("Data de acolhimento é obrigatória.");
    if (nasceuNoCcz && !dataNascimento) throw new BadRequestException("Animal nascido no CCZ precisa de data de nascimento.");
    if (dataNascimento) {
      return {
        dataAcolhimento,
        dataNascimento,
        idadeEstimadaQuantidade: null,
        idadeEstimadaUnidade: null,
        idadeAproximada: false,
      };
    }
    const hasQuantidade = dto.idadeEstimadaQuantidade !== undefined && dto.idadeEstimadaQuantidade !== null;
    const hasUnidade = dto.idadeEstimadaUnidade !== undefined && dto.idadeEstimadaUnidade !== null;
    if (hasQuantidade !== hasUnidade) throw new BadRequestException("Idade estimada exige quantidade e unidade.");
    return {
      dataAcolhimento,
      dataNascimento: null,
      idadeEstimadaQuantidade: dto.idadeEstimadaQuantidade ?? null,
      idadeEstimadaUnidade: dto.idadeEstimadaUnidade ?? null,
      idadeAproximada: dto.idadeAproximada ?? hasQuantidade,
    };
  }

  private async getRaca(id: number, especie: "cao" | "gato", tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    const raca = await tx.racaAnimal.findUnique({ where: { id } });
    if (!raca) throw new BadRequestException("Raça não encontrada.");
    if (raca.especie !== especie) throw new BadRequestException("Raça não pertence à espécie informada.");
    return raca;
  }

  private assertEditable(animal: Pick<Animal, "situacao">) {
    if (TERMINAIS.includes(animal.situacao)) {
      throw new ConflictException("Animal em situação terminal fica somente para consulta.");
    }
  }

  private async lockBaia(tx: Prisma.TransactionClient, baiaId: number) {
    await tx.$queryRaw`SELECT id FROM "baias" WHERE id = ${baiaId} FOR UPDATE`;
  }

  private async assertPodeReceberAnimal(
    tx: Prisma.TransactionClient,
    baia: {
      id: number;
      estado: string;
      capacidade: number;
      exclusivaIsolamento: boolean;
    },
    animal: Pick<Animal, "id" | "emIsolamento">,
  ) {
    if (baia.estado !== "ativa") {
      throw new ConflictException("Animal só pode ser alocado em baia ativa.");
    }
    if (baia.exclusivaIsolamento && !animal.emIsolamento) {
      throw new ConflictException("Baia exclusiva de isolamento aceita apenas animal marcado em isolamento.");
    }
    const ocupacao = await tx.animal.count({ where: { baiaId: baia.id, id: { not: animal.id } } });
    if (ocupacao >= baia.capacidade) {
      throw new ConflictException("Baia sem vagas disponíveis.");
    }
  }

  private resumoAlocacao(origemCodigo: string | null, destinoCodigo: string | null) {
    if (origemCodigo && destinoCodigo) return `Animal transferido da baia ${origemCodigo} para a baia ${destinoCodigo}.`;
    if (destinoCodigo) return `Animal alocado na baia ${destinoCodigo}.`;
    return `Animal retirado da baia ${origemCodigo}.`;
  }

  private requiredText(value: string, message: string) {
    const normalized = normalizeText(value);
    if (!normalized) throw new BadRequestException(message);
    return normalized;
  }

  private snapshot(animal: Animal | AnimalDetailEntity) {
    return {
      nome: animal.nome,
      numeroRegistro: animal.numeroRegistro,
      especie: animal.especie,
      racaId: animal.racaId,
      sexo: animal.sexo,
      porte: animal.porte,
      corPelagem: animal.corPelagem,
      situacao: animal.situacao,
      emIsolamento: animal.emIsolamento,
      castrado: animal.castrado,
      pesoAtualKg: animal.pesoAtualKg?.toString() ?? null,
      dataAcolhimento: animal.dataAcolhimento?.toISOString() ?? null,
      dataNascimento: animal.dataNascimento?.toISOString() ?? null,
      idadeEstimadaQuantidade: animal.idadeEstimadaQuantidade,
      idadeEstimadaUnidade: animal.idadeEstimadaUnidade,
      idadeAproximada: animal.idadeAproximada,
      nasceuNoCcz: animal.nasceuNoCcz,
      baiaId: animal.baiaId,
      acolhidoPor: animal.acolhidoPor,
    };
  }

  private diffSnapshots(antes: Record<string, unknown>, depois: Record<string, unknown>) {
    return Object.fromEntries(
      Object.keys(depois)
        .filter((key) => JSON.stringify(antes[key]) !== JSON.stringify(depois[key]))
        .map((key) => [key, { antes: antes[key], depois: depois[key] }]),
    );
  }

  private alertas(animal: AnimalListEntity | AnimalDetailEntity) {
    const alertas: { tipo: string; mensagem: string }[] = [];
    if (!animal.baiaId) alertas.push({ tipo: "sem_baia", mensagem: "Animal sem baia alocada." });
    if (animal.sexo === "nao_informado") alertas.push({ tipo: "sexo_nao_informado", mensagem: "Sexo não informado." });
    if (!animal.raca || animal.raca.tipo === "nao_informada") alertas.push({ tipo: "raca_nao_informada", mensagem: "Raça não informada." });
    if (animal.idadeAproximada) alertas.push({ tipo: "idade_aproximada", mensagem: "Idade aproximada." });
    if (animal.castrado === "nao_informado") alertas.push({ tipo: "castracao_nao_informada", mensagem: "Castração não informada." });
    return alertas;
  }

  private viewAnimal(animal: AnimalListEntity | AnimalDetailEntity) {
    const base = {
      ...animal,
      pesoAtualKg: animal.pesoAtualKg?.toString() ?? null,
      somenteLeitura: TERMINAIS.includes(animal.situacao),
      alertas: this.alertas(animal),
      fotos: animal.fotos.map((foto) => this.viewFoto(foto)),
    };
    if ("pesagens" in animal) {
      return {
        ...base,
        pesagens: animal.pesagens.map((pesagem) => this.viewPesagem(pesagem)),
        observacoes: animal.observacoes.map((observacao) => this.viewObservacao(observacao)),
        eventos: animal.eventos.map((evento) => this.viewEvento(evento)),
      };
    }
    return base;
  }

  private viewPesagem(pesagem: PesagemAnimal & { usuario?: { id: number; nome: string } | null }) {
    return { ...pesagem, valorKg: pesagem.valorKg.toString() };
  }

  private viewObservacao(observacao: ObservacaoAnimal & { usuario?: { id: number; nome: string } | null }) {
    return observacao;
  }

  private viewEvento(evento: EventoAnimal & { usuario?: { id: number; nome: string } | null }) {
    return evento;
  }

  private viewFoto(foto: FotoAnimal) {
    return {
      id: foto.id,
      animalId: foto.animalId,
      nomeArquivo: foto.nomeArquivo,
      mimeType: foto.mimeType,
      tamanhoBytes: foto.tamanhoBytes,
      largura: foto.largura,
      altura: foto.altura,
      identificacao: foto.identificacao,
      ordem: foto.ordem,
      createdAt: foto.createdAt,
      url: `/animais/${foto.animalId}/fotos/${foto.id}/arquivo`,
    };
  }

  private async processFoto(file: Express.Multer.File) {
    try {
      const image = sharp(file.buffer, { failOn: "warning" }).rotate();
      const metadata = await image.metadata();
      if (!metadata.format || !FOTO_ALLOWED_FORMATS.has(metadata.format)) {
        throw new BadRequestException("Formato de foto inválido. Envie JPEG, PNG ou WebP.");
      }
      if (!metadata.width || !metadata.height) {
        throw new BadRequestException("Não foi possível ler as dimensões da foto.");
      }
      if (metadata.width !== metadata.height) {
        throw new BadRequestException("A foto precisa estar recortada em quadrado.");
      }
      const side = Math.min(metadata.width, FOTO_MAX_DIMENSION);
      const qualities = [85, 80, 75, 70];
      for (const quality of qualities) {
        const buffer = await sharp(file.buffer, { failOn: "warning" })
          .rotate()
          .resize(side, side, { fit: "inside", withoutEnlargement: true })
          .webp({ quality })
          .toBuffer();
        if (buffer.byteLength <= FOTO_MAX_BYTES) {
          return { buffer, largura: side, altura: side };
        }
      }
      throw new BadRequestException("Não foi possível comprimir a foto para menos de 5 MB mantendo qualidade mínima.");
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException("Arquivo de foto inválido ou corrompido.");
    }
  }

  private resolveManagedPath(...parts: string[]) {
    return this.assertManagedPath(resolve(this.mediaRoot, ...parts));
  }

  private resolveStoredPath(stored: string) {
    if (!isAbsolute(stored)) {
      const parts = stored.split(/[\\/]/).filter(Boolean);
      return this.resolveManagedPath(...parts);
    }
    return this.assertManagedPath(stored);
  }

  private assertManagedPath(path: string) {
    const resolved = resolve(path);
    const rel = relative(this.mediaRoot, resolved);
    if (rel.startsWith("..") || rel === ".." || rel.includes(`..${sep}`) || resolve(this.mediaRoot, rel) !== resolved) {
      throw new BadRequestException("Caminho de mídia inválido.");
    }
    return resolved;
  }

  private async unlinkFotoIfUnreferenced(foto: FotoAnimal) {
    const caminho = this.resolveStoredPath(foto.caminhoAbsoluto);
    const referencias = await this.prisma.fotoAnimal.count({ where: { caminhoAbsoluto: foto.caminhoAbsoluto } });
    if (referencias === 0) await this.unlinkIfManaged(caminho);
  }

  private async unlinkIfManaged(path: string) {
    const managed = this.assertManagedPath(path);
    try {
      const stats = await stat(managed);
      if (stats.isFile()) await unlink(managed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  private async createEvento(
    tx: Prisma.TransactionClient,
    animalId: number,
    tipo: TipoEventoAnimal,
    resumo: string,
    usuarioId: number,
    dados: Record<string, unknown>,
  ) {
    return tx.eventoAnimal.create({
      data: { animalId, tipo, resumo, usuarioId, dados: dados as Prisma.InputJsonValue },
      include: { usuario: { select: { id: true, nome: true } } },
    });
  }

  private async createAudit(
    tx: Prisma.TransactionClient,
    usuarioId: number,
    animalId: number,
    tipo: string,
    dados: Record<string, unknown>,
  ) {
    await tx.auditoriaEvento.create({
      data: { tipo, usuarioId, dados: { entidade: "animal", entidadeId: String(animalId), acao: tipo, ...dados } },
    });
  }

  private mapUnique(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException(message);
    }
    throw error;
  }
}
