import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import sharp from "sharp";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTutorDto } from "./dto/create-tutor.dto";
import { UpdateTutorDto } from "./dto/update-tutor.dto";

const ROOT = resolve(process.env.ZOOTECH_MEDIA_ROOT ?? resolve(process.cwd(), "storage/media"), "tutores");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CPF_DIGITS = (value: string) => value.replace(/\D/g, "");

@Injectable()
export class TutoresService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(busca?: string) {
    const cpf = busca ? CPF_DIGITS(busca) : "";
    return this.prisma.tutor.findMany({
      where: busca?.trim() ? { OR: [
        { nome: { contains: busca.trim(), mode: "insensitive" } },
        ...(cpf ? [{ cpf: { contains: cpf } }] : []),
      ] } : undefined,
      include: { foto: { select: { id: true, mimeType: true, tamanhoBytes: true, createdAt: true } }, documentos: { select: { id: true, mimeType: true, tamanhoBytes: true, createdAt: true } } },
      orderBy: { nome: "asc" }, take: 50,
    });
  }

  async porCpf(value: string) {
    const cpf = CPF_DIGITS(value);
    this.validarCpf(cpf);
    const tutor = await this.prisma.tutor.findUnique({ where: { cpf }, include: { foto: true, documentos: true } });
    if (!tutor) throw new NotFoundException("Tutor não encontrado.");
    return tutor;
  }

  async obter(id: number) {
    const tutor = await this.prisma.tutor.findUnique({ where: { id }, include: {
      foto: { select: { id: true, mimeType: true, tamanhoBytes: true, createdAt: true } },
      documentos: { select: { id: true, mimeType: true, tamanhoBytes: true, createdAt: true } },
    } });
    if (!tutor) throw new NotFoundException("Tutor não encontrado.");
    return tutor;
  }

  async criar(dto: CreateTutorDto, ator: AuthUser) {
    const data = this.validarDados(dto, true);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const tutor = await tx.tutor.create({ data: { ...(data as Prisma.TutorUncheckedCreateInput), criadoPorId: ator.id } });
        await tx.auditoriaEvento.create({ data: { tipo: "tutor_criado", usuarioId: ator.id, dados: { entidade: "tutor", entidadeId: String(tutor.id), cpf: tutor.cpf } } });
        return tutor;
      });
    } catch (e) { this.mapUnique(e); }
  }

  async atualizar(id: number, dto: UpdateTutorDto, ator: AuthUser) {
    const atual = await this.prisma.tutor.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException("Tutor não encontrado.");
    const data = this.validarDados(dto, false);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const tutor = await tx.tutor.update({ where: { id }, data: { ...data, atualizadoPorId: ator.id } });
        await tx.auditoriaEvento.create({ data: { tipo: "tutor_atualizado", usuarioId: ator.id, dados: {
          entidade: "tutor", entidadeId: String(id), antes: this.snapshot(atual), depois: this.snapshot(tutor),
        } as Prisma.InputJsonObject } });
        return tutor;
      });
    } catch (e) { this.mapUnique(e); }
  }

  async guardarMidia(id: number, tipo: "foto" | "documento", file: Express.Multer.File, ator: AuthUser) {
    if (!file?.buffer?.length) throw new BadRequestException("Arquivo obrigatório.");
    if (file.size > MAX_IMAGE_BYTES || file.buffer.length > MAX_IMAGE_BYTES) throw new BadRequestException("A imagem deve ter no máximo 5 MB.");
    const tutor = await this.prisma.tutor.findUnique({ where: { id } });
    if (!tutor) throw new NotFoundException("Tutor não encontrado.");
    const image = await this.validarImagem(file.buffer);
    if (tipo === "foto" && await this.prisma.fotoTutor.findUnique({ where: { tutorId: id } })) throw new ConflictException("O tutor já possui foto pessoal.");
    if (tipo === "documento" && await this.prisma.documentoTutor.count({ where: { tutorId: id } }) >= 3) throw new ConflictException("O tutor já possui três fotos documentais.");

    const dir = resolve(ROOT, String(id), tipo === "foto" ? "perfil" : "documentos");
    const path = resolve(dir, `${randomUUID()}.webp`);
    await mkdir(dir, { recursive: true });
    await writeFile(path, image.bytes, { flag: "wx" });
    try {
      const saved = await this.prisma.$transaction(async (tx) => {
        if (tipo === "foto") {
          const meta = await tx.fotoTutor.create({ data: { tutorId: id, caminhoRelativo: this.relative(path), nomeArquivo: basename(file.originalname).slice(0, 180), mimeType: "image/webp", tamanhoBytes: image.bytes.length } });
          await tx.auditoriaEvento.create({ data: { tipo: "tutor_foto_adicionada", usuarioId: ator.id, dados: { entidade: "tutor", entidadeId: String(id), arquivoId: meta.id } } });
          return meta;
        }
        const meta = await tx.documentoTutor.create({ data: { tutorId: id, caminhoRelativo: this.relative(path), nomeArquivo: basename(file.originalname).slice(0, 180), mimeType: "image/webp", tamanhoBytes: image.bytes.length } });
        await tx.auditoriaEvento.create({ data: { tipo: "tutor_documento_adicionado", usuarioId: ator.id, dados: { entidade: "tutor", entidadeId: String(id), arquivoId: meta.id } } });
        return meta;
      });
      return { ...saved, url: `/tutores/${id}/midia/${tipo}/${saved.id}` };
    } catch (error) { await rm(path, { force: true }); this.mapUnique(error); }
  }

  async obterMidia(id: number, tipo: "foto" | "documento" | "assinatura", midiaId: number) {
    let caminho: string | null = null;
    const mimeType = "image/webp";
    if (tipo === "foto") caminho = (await this.prisma.fotoTutor.findFirst({ where: { id: midiaId, tutorId: id } }))?.caminhoRelativo ?? null;
    if (tipo === "documento") caminho = (await this.prisma.documentoTutor.findFirst({ where: { id: midiaId, tutorId: id } }))?.caminhoRelativo ?? null;
    if (!caminho) throw new NotFoundException("Mídia não encontrada.");
    const absolute = resolve(ROOT, caminho);
    if (!absolute.startsWith(`${ROOT}/`)) throw new NotFoundException("Mídia não encontrada.");
    try { return { bytes: await readFile(absolute), mimeType }; }
    catch { throw new NotFoundException("Mídia não encontrada."); }
  }

  private async validarImagem(input: Buffer) {
    try {
      const meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
      if (!meta.width || !meta.height || meta.width > 10000 || meta.height > 10000 || !["jpeg", "png", "webp"].includes(meta.format ?? "")) throw new Error();
      const bytes = await sharp(input).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
      return { bytes, mimeType: "image/webp" };
    } catch { throw new BadRequestException("Arquivo inválido. Envie uma imagem JPEG, PNG ou WebP válida."); }
  }

  private relative(path: string) { return path.slice(ROOT.length + 1).split("\\").join("/"); }

  private validarDados(input: object, complete: boolean) {
    const values = input as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    for (const key of ["nome", "telefone", "email", "tipoDocumento", "numeroDocumento", "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf"] as const) {
      if (values[key] !== undefined) data[key] = typeof values[key] === "string" ? (values[key] as string).trim() || null : values[key];
      if (complete && (data[key] === null || data[key] === undefined) && key !== "email" && key !== "complemento") throw new BadRequestException(`${key} é obrigatório.`);
    }
    if (values.uf !== undefined) data.uf = String(values.uf).trim().toUpperCase();
    if (values.cep !== undefined) data.cep = String(values.cep).replace(/\D/g, "");
    if (values.cpf !== undefined) { const cpf = CPF_DIGITS(String(values.cpf)); this.validarCpf(cpf); data.cpf = cpf; }
    else if (complete) throw new BadRequestException("CPF é obrigatório.");
    if (!Object.keys(data).length) throw new BadRequestException("Informe ao menos um campo para atualizar.");
    return data;
  }

  private validarCpf(cpf: string) {
    if (!/^\d{11}$/.test(cpf) || /^([0-9])\1{10}$/.test(cpf)) throw new BadRequestException("CPF inválido.");
    const calc = (base: string, start: number) => { const total = [...base].reduce((sum, d, i) => sum + Number(d) * (start - i), 0); const r = (total * 10) % 11; return r === 10 ? 0 : r; };
    if (calc(cpf.slice(0, 9), 10) !== Number(cpf[9]) || calc(cpf.slice(0, 10), 11) !== Number(cpf[10])) throw new BadRequestException("CPF inválido.");
  }

  private snapshot(tutor: { [key: string]: unknown }) { return Object.fromEntries(["nome", "cpf", "telefone", "email", "tipoDocumento", "numeroDocumento", "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf"].map((key) => [key, tutor[key]])); }
  private mapUnique(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("Já existe um tutor com este CPF ou esta mídia já foi registrada.");
    throw error;
  }
}
