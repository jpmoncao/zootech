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
  type EspecieAnimal,
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
import { dataCivilLocal, diffDias, hojeCivil } from "../vacinacao/datas";
import { resolverProximaDose } from "../vacinacao/protocolo";
import { AlocarAnimalDto } from "./dto/alocar-animal.dto";
import { CreateAnimalDto } from "./dto/create-animal.dto";
import { CreateEventoAnimalDto } from "./dto/create-evento-animal.dto";
import { CreateObservacaoAnimalDto } from "./dto/create-observacao-animal.dto";
import { CreatePesagemAnimalDto } from "./dto/create-pesagem-animal.dto";
import { CreateRacaAnimalDto } from "./dto/create-raca-animal.dto";
import { EncerrarObservacaoAntirrabicaDto } from "./dto/encerrar-observacao-antirrabica.dto";
import { ListAnimaisDto } from "./dto/list-animais.dto";
import { RevogarSituacaoDto } from "./dto/revogar-situacao.dto";
import { UpdateAnimalDto } from "./dto/update-animal.dto";

const TERMINAIS: SituacaoAnimal[] = ["adotado", "obito"];
const OBSERVACAO_ANTIRRABICA: SituacaoAnimal = "em_observacao_antirrabica";
const OBSERVACAO_ANTIRRABICA_DIAS = 10;
const FOTO_MAX_BYTES = 5 * 1024 * 1024;
const FOTO_MAX_DIMENSION = 1200;
const FOTO_MAX_ITEMS = 10;
const FOTO_ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const API_ROOT = resolve(__dirname, "..", "..");
// Protocolos e reações entram na consulta porque alimentam os alertas. São relações to-many:
// o Prisma as busca em consulta própria com `IN (ids da página)`, não em join gigante.
// `VACINACAO_INCLUDE` fica fora da resposta da lista (ver `viewAnimal`): a lista só mostra
// a contagem de alertas, e devolver protocolos aninhados engordaria a página sem uso.
const VACINACAO_INCLUDE = {
  protocolosVacinais: {
    include: {
      vacina: { select: { id: true, nome: true, diasAvisoProximaDose: true } },
      aplicacoes: {
        where: { anuladaEm: null },
        select: { numeroDose: true, dataAplicacao: true, dataProximaDose: true, dataProximaDoseCalculada: true },
      },
    },
  },
} satisfies Prisma.AnimalInclude;

const LIST_INCLUDE = {
  raca: true,
  baia: { select: { id: true, codigo: true, setor: true } },
  criadoPor: { select: { id: true, nome: true, perfilAcesso: true } },
  fotos: { orderBy: [{ identificacao: "desc" }, { ordem: "asc" }, { id: "asc" }] },
  ...VACINACAO_INCLUDE,
  // Só as reações: na lista não há timeline, e o alerta precisa do desfecho corrente da cadeia.
  eventos: {
    where: { tipo: "reacao_adversa" as const },
    include: { usuario: { select: { id: true, nome: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  },
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

// Catálogo consultado uma vez por requisição e reaproveitado por todos os animais da página:
// o alerta de vacina obrigatória pendente depende do catálogo, não do animal.
type VacinaObrigatoria = { id: number; nome: string; especies: EspecieAnimal[] };

export function normalizeText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function normalizeLookup(value: string): string {
  return normalizeText(value).toLocaleLowerCase("pt-BR");
}

function normalizeRegistro(value: string): string {
  return normalizeLookup(value);
}

function omitir<T extends object, K extends keyof T>(objeto: T, ...chaves: K[]): Omit<T, K> {
  const copia = { ...objeto } as Record<string, unknown>;
  for (const chave of chaves) delete copia[chave as string];
  return copia as Omit<T, K>;
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

    const [total, animais, vacinasObrigatorias] = await this.prisma.$transaction([
      this.prisma.animal.count({ where }),
      this.prisma.animal.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.prisma.vacina.findMany({
        where: { ativa: true, obrigatoria: true },
        select: { id: true, nome: true, especies: true },
        orderBy: { nome: "asc" },
      }),
    ]);
    const items = animais.map((animal) => this.viewAnimal(animal, vacinasObrigatorias));

    return {
      items: filtros.comAlertas ? items.filter((animal) => animal.alertas.length > 0) : items,
      total,
      pagina,
      limite,
    };
  }

  async obter(id: number) {
    const [animal, vacinasObrigatorias] = await Promise.all([this.getDetailOrThrow(id), this.vacinasObrigatorias()]);
    return this.viewAnimal(animal, vacinasObrigatorias);
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
      return this.viewAnimal(animal, await this.vacinasObrigatorias());
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
      return this.viewAnimal(animal, await this.vacinasObrigatorias());
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
    const resumo = normalizeText(dto.resumo);
    if (!resumo) throw new BadRequestException("Resumo do evento é obrigatório.");
    const reacao = dto.tipo === "reacao_adversa";
    if (!reacao && (dto.gravidadeReacao !== undefined || dto.desfechoReacao !== undefined)) {
      throw new BadRequestException("Gravidade e desfecho pertencem apenas ao evento de reação adversa.");
    }
    if (!reacao && (dto.aplicacaoVacinaId !== undefined || dto.eventoOrigemId !== undefined)) {
      throw new BadRequestException("Aplicação de vacina e evento de origem pertencem apenas ao evento de reação adversa.");
    }

    return this.prisma.$transaction(async (tx) => {
      const animal = await tx.animal.findUnique({ where: { id } });
      if (!animal) throw new NotFoundException("Animal não encontrado.");
      this.assertEditable(animal);

      let aplicacaoVacinaId = dto.aplicacaoVacinaId ?? null;
      let eventoOrigemId: number | null = null;

      if (reacao) {
        if (aplicacaoVacinaId !== null) {
          const aplicacao = await tx.aplicacaoVacina.findFirst({ where: { id: aplicacaoVacinaId, animalId: id } });
          if (!aplicacao) throw new BadRequestException("Aplicação de vacina não pertence a este animal.");
        }
        if (dto.eventoOrigemId !== undefined) {
          const origem = await tx.eventoAnimal.findFirst({
            where: { id: dto.eventoOrigemId, animalId: id, tipo: "reacao_adversa" },
          });
          if (!origem) throw new BadRequestException("Evento de origem não é uma reação adversa deste animal.");
          // A cadeia fica com um nível só: apontar para uma atualização resolve para a raiz.
          // Assim "desfecho corrente" é sempre o último evento que aponta para a mesma raiz.
          eventoOrigemId = origem.eventoOrigemId ?? origem.id;
          // A atualização herda a aplicação da raiz quando não informa outra.
          if (aplicacaoVacinaId === null) {
            const raiz = origem.eventoOrigemId
              ? await tx.eventoAnimal.findUnique({ where: { id: origem.eventoOrigemId } })
              : origem;
            aplicacaoVacinaId = raiz?.aplicacaoVacinaId ?? null;
          }
        }
      }

      const evento = await tx.eventoAnimal.create({
        data: {
          animalId: id,
          tipo: dto.tipo,
          resumo,
          usuarioId: ator.id,
          dados: (dto.dados ?? {}) as Prisma.InputJsonValue,
          ...(reacao
            ? {
                gravidadeReacao: dto.gravidadeReacao,
                desfechoReacao: dto.desfechoReacao,
                aplicacaoVacinaId,
                eventoOrigemId,
              }
            : {}),
        },
        include: { usuario: { select: { id: true, nome: true } } },
      });

      await this.createAudit(tx, ator.id, id, `animal_${dto.tipo}_registrado`, {
        eventoId: evento.id,
        resumo: evento.resumo,
        ...(reacao
          ? {
              gravidadeReacao: evento.gravidadeReacao,
              desfechoReacao: evento.desfechoReacao,
              aplicacaoVacinaId,
              eventoOrigemId,
              atualizacaoDeDesfecho: eventoOrigemId !== null,
            }
          : {}),
      });
      return this.viewEvento(evento);
    });
  }

  // Encerrar exige conclusão escrita e desfecho. Observação, situação, limpeza do período,
  // evento e auditoria gravam na mesma transação: ou tudo, ou o período continua aberto.
  async encerrarObservacaoAntirrabica(id: number, dto: EncerrarObservacaoAntirrabicaDto, ator: AuthUser) {
    const texto = normalizeText(dto.observacaoFinal);
    if (!texto) throw new BadRequestException("Observação final é obrigatória.");

    return this.prisma.$transaction(async (tx) => {
      const atual = await tx.animal.findUnique({ where: { id } });
      if (!atual) throw new NotFoundException("Animal não encontrado.");
      this.assertEditable(atual);
      if (atual.situacao !== OBSERVACAO_ANTIRRABICA) {
        throw new ConflictException("Animal não está em observação antirrábica.");
      }

      const inicio = atual.observacaoAntirrabicaInicioEm;
      const diasDecorridos = inicio
        ? Math.floor((Date.now() - inicio.getTime()) / 86_400_000)
        : null;
      const antecipado = diasDecorridos !== null && diasDecorridos < OBSERVACAO_ANTIRRABICA_DIAS;

      const observacao = await tx.observacaoAnimal.create({
        data: { animalId: id, texto, usuarioId: ator.id },
      });
      const atualizado = await tx.animal.update({
        where: { id },
        data: { situacao: dto.situacao, observacaoAntirrabicaInicioEm: null },
        include: DETAIL_INCLUDE,
      });

      const dados = {
        observacaoId: observacao.id,
        observacaoFinal: texto,
        situacaoAnterior: atual.situacao,
        situacaoNova: dto.situacao,
        inicioEm: inicio?.toISOString() ?? null,
        diasDecorridos,
        periodoDias: OBSERVACAO_ANTIRRABICA_DIAS,
        antecipado,
      };
      await this.createEvento(
        tx,
        id,
        "encerramento_observacao_antirrabica",
        antecipado
          ? `Observação antirrábica encerrada no dia ${diasDecorridos} de ${OBSERVACAO_ANTIRRABICA_DIAS} (antecipada).`
          : "Observação antirrábica encerrada.",
        ator.id,
        dados,
      );
      await this.createAudit(tx, ator.id, id, "animal_observacao_antirrabica_encerrada", dados);
      return this.viewAnimal(atualizado, await this.vacinasObrigatorias(tx));
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
      if (origemId === destinoId) return this.viewAnimal(atual, await this.vacinasObrigatorias(tx));

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
      return this.viewAnimal(atualizado, await this.vacinasObrigatorias(tx));
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
      const atualizado = await tx.animal.update({
        where: { id },
        data: {
          situacao: dto.situacao,
          observacaoAntirrabicaInicioEm: dto.situacao === OBSERVACAO_ANTIRRABICA ? new Date() : null,
        },
        include: DETAIL_INCLUDE,
      });
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
      return this.viewAnimal(atualizado, await this.vacinasObrigatorias(tx));
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
      observacaoAntirrabicaInicioEm: dto.situacao === OBSERVACAO_ANTIRRABICA ? new Date() : null,
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
      // Entrar na observação antirrábica marca o início do período; sair limpa.
      // Recolocar o animal reinicia a contagem: o período anterior fica no histórico, não no campo.
      if (dto.situacao === OBSERVACAO_ANTIRRABICA) {
        data.observacaoAntirrabicaInicioEm = new Date();
      } else if (atual.situacao === OBSERVACAO_ANTIRRABICA) {
        data.observacaoAntirrabicaInicioEm = null;
      }
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

  // Reação adversa é evento imutável: a evolução do desfecho é outro evento apontando para a raiz.
  // O desfecho corrente é o do evento mais recente da cadeia; empate de instante resolve pelo maior id.
  private reacoesAdversas(eventos: AnimalDetailEntity["eventos"]) {
    const reacoes = eventos.filter((evento) => evento.tipo === "reacao_adversa");
    const raizes = reacoes.filter((evento) => evento.eventoOrigemId === null);

    return raizes
      .map((raiz) => {
        const cadeia = [raiz, ...reacoes.filter((evento) => evento.eventoOrigemId === raiz.id)].sort((a, b) =>
          a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id,
        );
        const corrente = cadeia[cadeia.length - 1];
        return {
          id: raiz.id,
          registradoEm: raiz.createdAt,
          registradoPor: raiz.usuario ?? null,
          resumo: raiz.resumo,
          aplicacaoVacinaId: raiz.aplicacaoVacinaId,
          gravidade: corrente.gravidadeReacao,
          desfecho: corrente.desfechoReacao,
          emAcompanhamento: corrente.desfechoReacao === "em_acompanhamento",
          atualizacoes: cadeia.slice(1).map((evento) => ({
            id: evento.id,
            registradoEm: evento.createdAt,
            registradoPor: evento.usuario ?? null,
            resumo: evento.resumo,
            gravidade: evento.gravidadeReacao,
            desfecho: evento.desfechoReacao,
          })),
        };
      })
      .sort((a, b) => b.registradoEm.getTime() - a.registradoEm.getTime() || b.id - a.id);
  }

  // Contagem regressiva em dias corridos. Vencido quando o período de 10 dias passou
  // e a situação não mudou; o alerta correspondente entra na tarefa de alertas.
  private observacaoAntirrabica(animal: Pick<Animal, "situacao" | "observacaoAntirrabicaInicioEm">) {
    if (animal.situacao !== OBSERVACAO_ANTIRRABICA || !animal.observacaoAntirrabicaInicioEm) return null;
    const inicio = animal.observacaoAntirrabicaInicioEm;
    const decorridos = Math.floor((Date.now() - inicio.getTime()) / 86_400_000);
    const restantes = OBSERVACAO_ANTIRRABICA_DIAS - decorridos;
    return {
      inicioEm: inicio,
      periodoDias: OBSERVACAO_ANTIRRABICA_DIAS,
      diasDecorridos: decorridos,
      diasRestantes: Math.max(restantes, 0),
      encerraEm: new Date(inicio.getTime() + OBSERVACAO_ANTIRRABICA_DIAS * 86_400_000),
      vencida: restantes <= 0,
    };
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
      observacaoAntirrabicaInicioEm: animal.observacaoAntirrabicaInicioEm?.toISOString() ?? null,
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

  private alertas(
    animal: AnimalListEntity | AnimalDetailEntity,
    vacinasObrigatorias: VacinaObrigatoria[],
  ) {
    const alertas: { tipo: string; mensagem: string }[] = [];
    if (!animal.baiaId) alertas.push({ tipo: "sem_baia", mensagem: "Animal sem baia alocada." });
    if (animal.sexo === "nao_informado") alertas.push({ tipo: "sexo_nao_informado", mensagem: "Sexo não informado." });
    if (!animal.raca || animal.raca.tipo === "nao_informada") alertas.push({ tipo: "raca_nao_informada", mensagem: "Raça não informada." });
    if (animal.idadeAproximada) alertas.push({ tipo: "idade_aproximada", mensagem: "Idade aproximada." });
    if (animal.castrado === "nao_informado") alertas.push({ tipo: "castracao_nao_informada", mensagem: "Castração não informada." });

    // Animal em situação terminal fica somente para consulta: não cobra vacina, observação nem reação.
    if (TERMINAIS.includes(animal.situacao)) return alertas;

    alertas.push(...this.alertasVacinacao(animal, vacinasObrigatorias));
    alertas.push(...this.alertasObservacaoAntirrabica(animal));
    alertas.push(...this.alertasReacaoAdversa(animal));
    return alertas;
  }

  private alertasVacinacao(
    animal: AnimalListEntity | AnimalDetailEntity,
    vacinasObrigatorias: VacinaObrigatoria[],
  ) {
    const alertas: { tipo: string; mensagem: string }[] = [];
    const hoje = hojeCivil();
    const protocolos = animal.protocolosVacinais;
    const comAplicacao = protocolos.filter((protocolo) => protocolo.aplicacoes.length > 0);

    if (comAplicacao.length === 0) {
      alertas.push({
        tipo: "sem_vacinacao_registrada",
        mensagem: "Nenhuma vacina registrada para este animal.",
      });
    }

    for (const protocolo of protocolos) {
      const nome = protocolo.vacina.nome;
      if (protocolo.status === "interrompido") {
        alertas.push({
          tipo: "protocolo_vacinal_interrompido",
          mensagem: `${nome}: protocolo interrompido${protocolo.motivoInterrupcao ? ` (${protocolo.motivoInterrupcao})` : ""}.`,
        });
        continue;
      }

      const aplicadas = protocolo.aplicacoes.length;
      const faltantes = Math.max(protocolo.dosesPrevistas - aplicadas, 0);
      if (faltantes > 0) {
        alertas.push({
          tipo: "esquema_vacinal_incompleto",
          mensagem: `${nome}: ${aplicadas} de ${protocolo.dosesPrevistas} doses, ${faltantes === 1 ? "falta 1" : `faltam ${faltantes}`}.`,
        });
      }

      const proxima = resolverProximaDose(protocolo, protocolo.aplicacoes);
      if (!proxima) continue;
      const dias = diffDias(proxima, hoje);
      if (dias < 0) {
        const atraso = Math.abs(dias);
        alertas.push({
          tipo: "dose_vencida",
          mensagem: `${nome}: dose venceu há ${atraso === 1 ? "1 dia" : `${atraso} dias`}.`,
        });
        continue;
      }
      // Janela de aviso vem do catálogo atual, não do protocolo: é preferência de operação.
      // Valor 0 desliga o aviso antecipado desta vacina.
      const janela = protocolo.vacina.diasAvisoProximaDose;
      if (janela > 0 && dias <= janela) {
        alertas.push({
          tipo: "dose_a_vencer",
          mensagem: dias === 0 ? `${nome}: dose vence hoje.` : `${nome}: dose vence em ${dias === 1 ? "1 dia" : `${dias} dias`}.`,
        });
      }
    }

    const comAlgumaAplicacao = new Set(comAplicacao.map((protocolo) => protocolo.vacinaId));
    for (const vacina of vacinasObrigatorias) {
      if (!vacina.especies.includes(animal.especie)) continue;
      if (comAlgumaAplicacao.has(vacina.id)) continue;
      alertas.push({
        tipo: "vacina_obrigatoria_pendente",
        mensagem: `${vacina.nome} é obrigatória e não tem nenhuma dose registrada.`,
      });
    }
    return alertas;
  }

  private alertasObservacaoAntirrabica(animal: AnimalListEntity | AnimalDetailEntity) {
    const periodo = this.observacaoAntirrabica(animal);
    if (!periodo) return [];
    if (periodo.vencida) {
      const atraso = periodo.diasDecorridos - periodo.periodoDias;
      return [{
        tipo: "observacao_antirrabica_vencida",
        mensagem: atraso <= 0
          ? "Observação antirrábica: período encerrado. Registre a observação final do animal."
          : `Observação antirrábica: período encerrado há ${atraso === 1 ? "1 dia" : `${atraso} dias`}. Registre a observação final do animal.`,
      }];
    }
    return [{
      tipo: "observacao_antirrabica_em_curso",
      mensagem: periodo.diasRestantes === 0
        ? "Observação antirrábica: encerra hoje."
        : `Observação antirrábica: ${periodo.diasRestantes === 1 ? "falta 1 dia" : `faltam ${periodo.diasRestantes} dias`} (encerra em ${periodo.encerraEm.toISOString().slice(0, 10)}).`,
    }];
  }

  private alertasReacaoAdversa(animal: AnimalListEntity | AnimalDetailEntity) {
    return this.reacoesAdversas(animal.eventos)
      .filter((reacao) => reacao.emAcompanhamento)
      .map((reacao) => {
        const dias = diffDias(hojeCivil(), dataCivilLocal(reacao.registradoEm));
        const quando = dias <= 0 ? "hoje" : dias === 1 ? "há 1 dia" : `há ${dias} dias`;
        return {
          tipo: "reacao_adversa_em_acompanhamento",
          mensagem: `Reação adversa ${reacao.gravidade} registrada ${quando} segue em acompanhamento.`,
        };
      });
  }

  // Uma consulta por requisição, indexada por `ativa` e reaproveitada por toda a página.
  private async vacinasObrigatorias(
    cliente: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<VacinaObrigatoria[]> {
    return cliente.vacina.findMany({
      where: { ativa: true, obrigatoria: true },
      select: { id: true, nome: true, especies: true },
      orderBy: { nome: "asc" },
    });
  }

  private viewAnimal(animal: AnimalListEntity | AnimalDetailEntity, vacinasObrigatorias: VacinaObrigatoria[]) {
    // `protocolosVacinais` e `eventos` entram na consulta só para calcular alertas.
    // Saem da resposta: a lista mostra a contagem de alertas, e o detalhe expõe
    // vacinação por `GET /animais/:id/vacinacao` e reações por `reacoesAdversas`.
    const base = {
      ...omitir(animal, "protocolosVacinais", "eventos"),
      pesoAtualKg: animal.pesoAtualKg?.toString() ?? null,
      somenteLeitura: TERMINAIS.includes(animal.situacao),
      alertas: this.alertas(animal, vacinasObrigatorias),
      fotos: animal.fotos.map((foto) => this.viewFoto(foto)),
    };
    if ("pesagens" in animal) {
      return {
        ...base,
        pesagens: animal.pesagens.map((pesagem) => this.viewPesagem(pesagem)),
        observacoes: animal.observacoes.map((observacao) => this.viewObservacao(observacao)),
        eventos: animal.eventos.map((evento) => this.viewEvento(evento)),
        reacoesAdversas: this.reacoesAdversas(animal.eventos),
        observacaoAntirrabica: this.observacaoAntirrabica(animal),
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
