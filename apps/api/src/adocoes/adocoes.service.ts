import { BadRequestException, ConflictException, Injectable, NotFoundException, StreamableFile } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import sharp from "sharp";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { ConcluirAdocaoDto } from "./dto/concluir-adocao.dto";
import { LiberarAdocaoDto } from "./dto/liberar-adocao.dto";
import { RegistrarDevolucaoDto } from "./dto/registrar-devolucao.dto";

const API_ROOT = resolve(__dirname, "..", "..");
const ROOT = resolve(API_ROOT, "storage", "media");
const MIME: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

@Injectable()
export class AdocoesService {
  private readonly mediaRoot: string;
  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    const configured = config.get<string>("ZOOTECH_MEDIA_ROOT") ?? config.get<string>("MEDIA_ROOT");
    this.mediaRoot = configured ? (isAbsolute(configured) ? resolve(configured) : resolve(API_ROOT, configured)) : ROOT;
  }

  async liberar(animalId: number, dto: LiberarAdocaoDto, ator: AuthUser) {
    const justificativa = dto.justificativa.trim();
    if (justificativa.length < 3) throw new BadRequestException("Justificativa obrigatória (mínimo de 3 caracteres).");
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "animais" WHERE id = ${animalId} FOR UPDATE`;
      const animal = await tx.animal.findUnique({ where: { id: animalId } });
      if (!animal) throw new NotFoundException("Animal não encontrado.");
      if (!["em_tratamento", "em_quarentena_observacao"].includes(animal.situacao)) {
        throw new ConflictException("Liberação excepcional só se aplica a animal em tratamento ou quarentena/observação.");
      }
      if (animal.situacao === "obito" || animal.situacao === "adotado") throw new ConflictException("Animal não elegível para adoção.");
      const liberacao = await tx.liberacaoAdocao.create({ data: { animalId, justificativa, autorizadaPorId: ator.id } });
      await tx.eventoAnimal.create({ data: { animalId, tipo: "edicao", resumo: "Animal liberado excepcionalmente para adoção.", usuarioId: ator.id, dados: { liberacaoId: liberacao.id, justificativa } } });
      await tx.auditoriaEvento.create({ data: { tipo: "animal_liberado_para_adocao", usuarioId: ator.id, dados: { entidade: "animal", entidadeId: String(animalId), liberacaoId: liberacao.id, justificativa } } });
      return liberacao;
    });
  }

  async concluir(animalId: number, dto: ConcluirAdocaoDto, file: Express.Multer.File | undefined, ator: AuthUser) {
    if (dto.consentiuTratamento !== true || dto.consentiuAcompanhamento !== true) throw new BadRequestException("As duas confirmações do tutor são obrigatórias.");
    if (!file?.buffer?.byteLength) throw new BadRequestException("Assinatura desenhada obrigatória.");
    if (file.size > 2 * 1024 * 1024) throw new BadRequestException("Assinatura excede o limite de 2 MB.");
    const image = await this.validarAssinatura(file.buffer);
    const nomeArquivo = `${randomUUID()}.webp`;
    const caminhoRelativo = `adocoes/${animalId}/${nomeArquivo}`;
    const caminho = resolve(this.mediaRoot, caminhoRelativo);
    await mkdir(dirname(caminho), { recursive: true });
    await writeFile(caminho, image);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "animais" WHERE id = ${animalId} FOR UPDATE`;
        const animal = await tx.animal.findUnique({ where: { id: animalId } });
        if (!animal) throw new NotFoundException("Animal não encontrado.");
        if (animal.situacao === "obito") throw new ConflictException("Animal com óbito não pode ser adotado.");
        if (animal.situacao === "adotado") throw new ConflictException("Animal já possui uma adoção ativa.");
        const tutor = await tx.tutor.findUnique({ where: { id: dto.tutorId } });
        if (!tutor) throw new NotFoundException("Tutor não encontrado.");
        let liberacaoId: number | null = null;
        const liberacao = await tx.liberacaoAdocao.findFirst({ where: { animalId }, orderBy: [{ autorizadaEm: "desc" }, { id: "desc" }] });
        if (animal.situacao !== "saudavel") {
          if (!liberacao) throw new ConflictException("Animal precisa de liberação clínica excepcional antes da adoção.");
          if (liberacao.consumidaEm) throw new ConflictException("A liberação excepcional já foi usada. Registre uma nova liberação para este ciclo.");
          liberacaoId = liberacao.id;
        }
        // Every completed adoption closes the pending authorization window, even if
        // the animal became healthy before the authorization was needed.
        if (liberacao && !liberacao.consumidaEm) {
          await tx.liberacaoAdocao.update({ where: { id: liberacao.id }, data: { consumidaEm: new Date() } });
        }
        const baiaAnteriorId = animal.baiaId;
        const adocao = await tx.adocao.create({ data: {
          animalId, tutorId: tutor.id, liberacaoId, consentiuTratamento: true, consentiuAcompanhamento: true,
          caminhoAssinatura: caminhoRelativo, nomeArquivoAssinatura: nomeArquivo, mimeTypeAssinatura: "image/webp",
          tamanhoAssinatura: image.byteLength, adotadaPorId: ator.id,
        }, include: { tutor: { include: { foto: true, documentos: true } }, adotadaPor: { select: { id: true, nome: true } }, liberacao: { include: { autorizadaPor: { select: { id: true, nome: true } } } } } });
        await tx.animal.update({ where: { id: animalId }, data: { situacao: "adotado", baiaId: null } });
        await tx.eventoAnimal.create({ data: { animalId, tipo: "mudanca_situacao", resumo: `Adoção concluída para ${tutor.nome}.`, usuarioId: ator.id, dados: { adocaoId: adocao.id, tutorId: tutor.id, baiaAnteriorId, liberacaoId } } });
        await tx.auditoriaEvento.create({ data: { tipo: "animal_adocao_concluida", usuarioId: ator.id, dados: { entidade: "animal", entidadeId: String(animalId), adocaoId: adocao.id, tutorId: tutor.id, baiaAnteriorId, liberacaoId } } });
        return adocao;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      await unlink(caminho).catch(() => undefined);
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034")) throw new ConflictException("Adoção concorrente detectada; atualize a ficha e tente novamente.");
      throw error;
    }
  }

  async devolver(animalId: number, dto: RegistrarDevolucaoDto, ator: AuthUser) {
    const motivo = dto.motivo.trim();
    if (motivo.length < 3) throw new BadRequestException("Informe o motivo da devolução (mínimo de 3 caracteres).");
    if (dto.baiaId !== undefined && dto.baiaId !== null && (!Number.isInteger(dto.baiaId) || dto.baiaId < 1)) {
      throw new BadRequestException("Baia inválida.");
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Keep the same animal-then-baia lock order used by alocar() and adoption.
        await tx.$queryRaw`SELECT id FROM "animais" WHERE id = ${animalId} FOR UPDATE`;
        const animal = await tx.animal.findUnique({ where: { id: animalId } });
        if (!animal) throw new NotFoundException("Animal não encontrado.");
        if (animal.situacao !== "adotado") throw new ConflictException("Só é possível registrar devolução para animal com adoção ativa.");

        const adocao = await tx.adocao.findFirst({
          where: { animalId, devolucao: null },
          orderBy: [{ adotadaEm: "desc" }, { id: "desc" }],
        });
        if (!adocao) throw new ConflictException("Não há adoção ativa para devolver.");

        const destinoId = dto.baiaId ?? null;
        if (destinoId !== null) {
          await tx.$queryRaw`SELECT id FROM "baias" WHERE id = ${destinoId} FOR UPDATE`;
          const baia = await tx.baia.findUnique({ where: { id: destinoId } });
          if (!baia) throw new NotFoundException("Baia de destino não encontrada.");
          if (baia.estado !== "ativa") throw new ConflictException("Animal só pode ser devolvido em baia ativa.");
          if (baia.exclusivaIsolamento && !animal.emIsolamento) {
            throw new ConflictException("Baia exclusiva de isolamento aceita apenas animal marcado em isolamento.");
          }
          const ocupacao = await tx.animal.count({ where: { baiaId: destinoId, id: { not: animalId } } });
          if (ocupacao >= baia.capacidade) throw new ConflictException("Baia sem vagas disponíveis.");
        }

        const devolucao = await tx.devolucao.create({
          data: {
            adocaoId: adocao.id,
            motivo,
            situacaoRetorno: dto.situacaoRetorno,
            baiaId: destinoId,
            recebidaPorId: ator.id,
          },
          include: { recebidaPor: { select: { id: true, nome: true } }, baia: { select: { id: true, codigo: true } } },
        });
        await tx.adocao.update({ where: { id: adocao.id }, data: { encerradaEm: devolucao.recebidaEm } });
        await tx.animal.update({ where: { id: animalId }, data: { situacao: dto.situacaoRetorno, baiaId: destinoId } });
        await tx.eventoAnimal.create({
          data: {
            animalId,
            tipo: "mudanca_situacao",
            resumo: destinoId === null ? "Animal devolvido ao CCZ sem baia alocada." : `Animal devolvido ao CCZ e alocado na baia ${devolucao.baia?.codigo}.`,
            usuarioId: ator.id,
            dados: { adocaoId: adocao.id, devolucaoId: devolucao.id, tutorId: adocao.tutorId, motivo, situacaoRetorno: dto.situacaoRetorno, baiaDestinoId: destinoId },
          },
        });
        await tx.auditoriaEvento.create({
          data: {
            tipo: "animal_devolucao_registrada",
            usuarioId: ator.id,
            dados: { entidade: "animal", entidadeId: String(animalId), adocaoId: adocao.id, devolucaoId: devolucao.id, motivo, situacaoRetorno: dto.situacaoRetorno, baiaDestinoId: destinoId },
          },
        });
        return devolucao;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034")) {
        throw new ConflictException("Devolução concorrente detectada; atualize a ficha e tente novamente.");
      }
      throw error;
    }
  }

  async obterAssinatura(animalId: number, adocaoId: number) {
    const adocao = await this.prisma.adocao.findFirst({ where: { id: adocaoId, animalId }, select: { caminhoAssinatura: true, mimeTypeAssinatura: true, tamanhoAssinatura: true } });
    if (!adocao) throw new NotFoundException("Assinatura não encontrada.");
    const path = resolve(this.mediaRoot, adocao.caminhoAssinatura);
    const info = await stat(path).catch(() => null);
    if (!info?.isFile()) throw new NotFoundException("Arquivo da assinatura não encontrado.");
    return { file: new StreamableFile(createReadStream(path)), mimeType: adocao.mimeTypeAssinatura, length: adocao.tamanhoAssinatura };
  }

  private async validarAssinatura(buffer: Buffer): Promise<Buffer> {
    try {
      const metadata = await sharp(buffer, { failOn: "warning" }).metadata();
      if (!metadata.format || !MIME[metadata.format] || !metadata.width || !metadata.height) throw new Error("invalid");
      if (metadata.width < 1 || metadata.height < 1 || metadata.width > 4096 || metadata.height > 4096) throw new Error("dimensions");
      const pixels = await sharp(buffer, { failOn: "warning" }).flatten({ background: "#fff" }).resize(256, 256, { fit: "inside" }).greyscale().raw().toBuffer();
      let inkPixels = 0;
      for (const pixel of pixels) if (pixel < 245) inkPixels += 1;
      if (inkPixels < 10) throw new Error("blank");
      const output = await sharp(buffer, { failOn: "warning" }).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
      if (output.byteLength === 0) throw new Error("empty");
      return output;
    } catch { throw new BadRequestException("Assinatura inválida ou vazia. Envie a imagem desenhada em PNG, JPEG ou WebP."); }
  }
}
