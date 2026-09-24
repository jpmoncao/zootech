import { createHash, randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PerfilAcesso, StatusSolicitacao, Usuario } from "@prisma/client";
import * as bcrypt from "bcrypt";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { AceitarSolicitacaoDto } from "./dto/aceitar-solicitacao.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateSolicitacaoDto } from "./dto/create-solicitacao.dto";
import { LoginDto } from "./dto/login.dto";
import { RecusarSolicitacaoDto } from "./dto/recusar-solicitacao.dto";
import { UpdateMeDto } from "./dto/update-me.dto";
import type { AuthUser } from "./decorators/current-user.decorator";

export const REFRESH_COOKIE = "refreshToken";
const ACCESS_TTL = "15m";
const REFRESH_DAYS = 14;
const BCRYPT_ROUNDS = 10;

const MSG_CREDENCIAL =
  "CPF, matrícula ou senha não conferem.";
const MSG_PENDENTE =
  "Seu pedido ainda aguarda o aceite da coordenação.";
const MSG_RECUSADA = "A coordenação não aceitou este pedido.";
const MSG_JA_DECIDIDO = "Este pedido já foi decidido.";

export const CARGO_POR_PERFIL: Record<PerfilAcesso, string> = {
  coordenacao: "Coordenação",
  veterinario: "Médico(a)-veterinário(a)",
  agente: "Agente de zoonoses",
  recepcao: "Recepção",
};

export type PublicUser = {
  id: number;
  nome: string;
  email: string;
  cpfMascarado: string;
  telefone: string | null;
  perfilAcesso: PerfilAcesso;
  matricula: string | null;
  cargo: string | null;
  crmv: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async criarSolicitacao(dto: CreateSolicitacaoDto) {
    const nome = dto.nome.trim();
    const cpf = digitsOnly(dto.cpf);
    const matricula = digitsOnly(dto.matricula);
    const email = dto.email.trim().toLowerCase();
    const crmv =
      dto.funcaoPretendida === "veterinario"
        ? digitsOnly(dto.crmv ?? "")
        : dto.crmv
          ? digitsOnly(dto.crmv)
          : null;

    if (matricula === cpf) {
      throw new BadRequestException("A matrícula deve ser distinta do CPF.");
    }

    if (dto.funcaoPretendida === "veterinario" && (!crmv || crmv.length < 4)) {
      throw new BadRequestException("CRMV deve ter pelo menos 4 dígitos.");
    }

    await this.assertSemConflito({ cpf, email, matricula });

    const senhaHash = await bcrypt.hash(dto.senha, BCRYPT_ROUNDS);

    const solicitacao = await this.prisma.solicitacao.create({
      data: {
        nome,
        cpf,
        matricula,
        email,
        funcaoPretendida: dto.funcaoPretendida,
        crmv: crmv && crmv.length > 0 ? crmv : null,
        senhaHash,
        status: "pendente",
      },
    });

    await this.prisma.auditoriaEvento.create({
      data: {
        tipo: "solicitacao_criada",
        dados: {
          solicitacaoId: solicitacao.id,
          cpf,
          email,
          matricula,
          funcaoPretendida: dto.funcaoPretendida,
        },
      },
    });

    return {
      id: solicitacao.id,
      status: solicitacao.status,
      createdAt: solicitacao.createdAt,
    };
  }

  async login(dto: LoginDto, res: Response) {
    const identificador = digitsOnly(dto.identificador);
    const manterConectado = Boolean(dto.manterConectado);

    const usuario = await this.findUsuarioAtivoPorIdentificador(identificador);
    if (usuario) {
      const ok = await bcrypt.compare(dto.senha, usuario.senhaHash);
      if (!ok) {
        throw new UnauthorizedException(MSG_CREDENCIAL);
      }
      return this.emitSession(usuario, res, manterConectado);
    }

    const solicitacoes = await this.prisma.solicitacao.findMany({
      where: {
        OR: [{ cpf: identificador }, { matricula: identificador }],
      },
      orderBy: { createdAt: "desc" },
    });

    for (const solicitacao of solicitacoes) {
      const ok = await bcrypt.compare(dto.senha, solicitacao.senhaHash);
      if (!ok) continue;

      if (solicitacao.status === "pendente") {
        throw new UnauthorizedException(MSG_PENDENTE);
      }
      if (solicitacao.status === "recusada") {
        const message = solicitacao.motivo
          ? `${MSG_RECUSADA} ${solicitacao.motivo}`
          : MSG_RECUSADA;
        throw new UnauthorizedException(message);
      }
    }

    throw new UnauthorizedException(MSG_CREDENCIAL);
  }

  async refresh(rawToken: string | undefined, res: Response) {
    if (!rawToken) {
      throw new UnauthorizedException();
    }

    const tokenHash = hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        usuario: { include: { funcionario: true } },
      },
    });

    if (!stored || !stored.usuario.ativo) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException();
    }

    if (stored.expiresAt && stored.expiresAt.getTime() < Date.now()) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => undefined);
      this.clearRefreshCookie(res);
      throw new UnauthorizedException();
    }

    const accessToken = await this.signAccessToken(stored.usuario.id);
    return {
      accessToken,
      usuario: toPublicUser(stored.usuario),
    };
  }

  async logout(rawToken: string | undefined, res: Response) {
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await this.prisma.refreshToken
        .deleteMany({ where: { tokenHash } })
        .catch(() => undefined);
    }
    this.clearRefreshCookie(res);
    return { ok: true as const };
  }

  me(user: AuthUser): PublicUser {
    return toPublicUser(user);
  }

  async listarSolicitacoes(status?: string) {
    const allowed = Object.values(StatusSolicitacao) as string[];
    const filtro = (!status ? "pendente" : status) as StatusSolicitacao;

    if (!allowed.includes(filtro)) {
      throw new BadRequestException("Status de solicitação inválido.");
    }

    const itens = await this.prisma.solicitacao.findMany({
      where: { status: filtro },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nome: true,
        cpf: true,
        matricula: true,
        email: true,
        funcaoPretendida: true,
        crmv: true,
        status: true,
        createdAt: true,
      },
    });

    return itens.map(({ cpf, ...item }) => ({
      ...item,
      cpfMascarado: maskCpf(cpf),
    }));
  }

  async aceitarSolicitacao(
    id: number,
    dto: AceitarSolicitacaoDto,
    decisor: AuthUser,
  ) {
    const solicitacao = await this.prisma.solicitacao.findUnique({
      where: { id },
    });

    if (!solicitacao) {
      throw new NotFoundException("Solicitação não encontrada.");
    }

    if (solicitacao.status !== "pendente") {
      throw new ConflictException(MSG_JA_DECIDIDO);
    }

    let crmvFinal: string | null = null;
    if (dto.perfilAcesso === "veterinario") {
      const fromDto = dto.crmv ? digitsOnly(dto.crmv) : "";
      const fromSol = solicitacao.crmv ? digitsOnly(solicitacao.crmv) : "";
      crmvFinal =
        fromDto.length >= 4 ? fromDto : fromSol.length >= 4 ? fromSol : null;
      if (!crmvFinal) {
        throw new BadRequestException("CRMV deve ter pelo menos 4 dígitos.");
      }
    }

    await this.assertSemConflitoAtivo({
      cpf: solicitacao.cpf,
      email: solicitacao.email,
      matricula: solicitacao.matricula,
    });

    const usuario = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.solicitacao.updateMany({
        where: { id, status: "pendente" },
        data: {
          status: "aceita",
          decididoPorId: decisor.id,
          motivo: null,
        },
      });

      if (claimed.count === 0) {
        throw new ConflictException(MSG_JA_DECIDIDO);
      }

      const criado = await tx.usuario.create({
        data: {
          nome: solicitacao.nome,
          email: solicitacao.email,
          senhaHash: solicitacao.senhaHash,
          cpf: solicitacao.cpf,
          perfilAcesso: dto.perfilAcesso,
          ativo: true,
          funcionario: {
            create: {
              matricula: solicitacao.matricula,
              cargo: CARGO_POR_PERFIL[dto.perfilAcesso],
              crmv: crmvFinal,
            },
          },
        },
        include: { funcionario: true },
      });

      await tx.auditoriaEvento.create({
        data: {
          tipo: "solicitacao_aceita",
          usuarioId: decisor.id,
          dados: {
            solicitacaoId: id,
            usuarioId: criado.id,
            perfilAcesso: dto.perfilAcesso,
            funcaoPretendida: solicitacao.funcaoPretendida,
          },
        },
      });

      return criado;
    });

    return toPublicUser(usuario);
  }

  async recusarSolicitacao(
    id: number,
    dto: RecusarSolicitacaoDto,
    decisor: AuthUser,
  ) {
    const motivo = dto.motivo?.trim() || null;

    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.solicitacao.updateMany({
        where: { id, status: "pendente" },
        data: {
          status: "recusada",
          motivo,
          decididoPorId: decisor.id,
        },
      });

      if (claimed.count === 0) {
        const existing = await tx.solicitacao.findUnique({ where: { id } });
        if (!existing) {
          throw new NotFoundException("Solicitação não encontrada.");
        }
        throw new ConflictException(MSG_JA_DECIDIDO);
      }

      await tx.auditoriaEvento.create({
        data: {
          tipo: "solicitacao_recusada",
          usuarioId: decisor.id,
          dados: {
            solicitacaoId: id,
            motivo,
          },
        },
      });

      return tx.solicitacao.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          status: true,
          motivo: true,
          updatedAt: true,
        },
      });
    });

    return result;
  }

  async atualizarMe(user: AuthUser, dto: UpdateMeDto): Promise<PublicUser> {
    const data: { telefone?: string | null; email?: string } = {};

    if (dto.telefone !== undefined) {
      const digits = dto.telefone ? digitsOnly(dto.telefone) : "";
      data.telefone = digits.length === 0 ? null : digits;
      if (data.telefone && data.telefone.length < 10) {
        throw new BadRequestException(
          "Telefone deve ter 10 ou 11 dígitos, ou ficar vazio.",
        );
      }
    }

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const conflito = await this.prisma.usuario.findFirst({
        where: {
          email,
          ativo: true,
          NOT: { id: user.id },
        },
        select: { id: true },
      });
      if (conflito) {
        throw new ConflictException("Já existe um cadastro com este e-mail.");
      }
      data.email = email;
    }

    const atualizado = await this.prisma.usuario.update({
      where: { id: user.id },
      data,
      include: { funcionario: true },
    });

    return toPublicUser(atualizado);
  }

  async alterarSenha(
    user: AuthUser,
    dto: ChangePasswordDto,
    rawRefresh: string | undefined,
  ) {
    const ok = await bcrypt.compare(dto.senhaAtual, user.senhaHash);
    if (!ok) {
      throw new UnauthorizedException("Senha atual não confere.");
    }

    if (dto.senhaNova === dto.senhaAtual) {
      throw new BadRequestException(
        "A nova senha deve ser diferente da senha atual.",
      );
    }

    const senhaHash = await bcrypt.hash(dto.senhaNova, BCRYPT_ROUNDS);
    const keepHash = rawRefresh ? hashToken(rawRefresh) : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: user.id },
        data: { senhaHash },
      });

      if (keepHash) {
        await tx.refreshToken.deleteMany({
          where: {
            usuarioId: user.id,
            NOT: { tokenHash: keepHash },
          },
        });
      } else {
        await tx.refreshToken.deleteMany({ where: { usuarioId: user.id } });
      }

      await tx.auditoriaEvento.create({
        data: {
          tipo: "senha_alterada",
          usuarioId: user.id,
          dados: { usuarioId: user.id },
        },
      });
    });

    return { ok: true as const };
  }

  private async assertSemConflitoAtivo(input: {
    cpf: string;
    email: string;
    matricula: string;
  }) {
    const [cpfUsuario, emailUsuario, matriculaUsuario] = await Promise.all([
      this.prisma.usuario.findFirst({
        where: { cpf: input.cpf, ativo: true },
        select: { id: true },
      }),
      this.prisma.usuario.findFirst({
        where: { email: input.email, ativo: true },
        select: { id: true },
      }),
      this.prisma.funcionario.findFirst({
        where: {
          matricula: input.matricula,
          usuario: { ativo: true },
        },
        select: { id: true },
      }),
    ]);

    if (cpfUsuario) {
      throw new ConflictException("Já existe um cadastro com este CPF.");
    }
    if (emailUsuario) {
      throw new ConflictException("Já existe um cadastro com este e-mail.");
    }
    if (matriculaUsuario) {
      throw new ConflictException("Já existe um cadastro com esta matrícula.");
    }
  }

  private async assertSemConflito(input: {
    cpf: string;
    email: string;
    matricula: string;
  }) {
    const [cpfUsuario, emailUsuario, matriculaUsuario, cpfSol, emailSol, matSol] =
      await Promise.all([
        this.prisma.usuario.findFirst({
          where: { cpf: input.cpf, ativo: true },
          select: { id: true },
        }),
        this.prisma.usuario.findFirst({
          where: { email: input.email, ativo: true },
          select: { id: true },
        }),
        this.prisma.funcionario.findFirst({
          where: {
            matricula: input.matricula,
            usuario: { ativo: true },
          },
          select: { id: true },
        }),
        this.prisma.solicitacao.findFirst({
          where: { cpf: input.cpf, status: "pendente" },
          select: { id: true },
        }),
        this.prisma.solicitacao.findFirst({
          where: { email: input.email, status: "pendente" },
          select: { id: true },
        }),
        this.prisma.solicitacao.findFirst({
          where: { matricula: input.matricula, status: "pendente" },
          select: { id: true },
        }),
      ]);

    if (cpfUsuario || cpfSol) {
      throw new ConflictException("Já existe um cadastro com este CPF.");
    }
    if (emailUsuario || emailSol) {
      throw new ConflictException("Já existe um cadastro com este e-mail.");
    }
    if (matriculaUsuario || matSol) {
      throw new ConflictException("Já existe um cadastro com esta matrícula.");
    }
  }

  private async findUsuarioAtivoPorIdentificador(identificador: string) {
    if (identificador.length === 11) {
      return this.prisma.usuario.findFirst({
        where: { cpf: identificador, ativo: true },
        include: { funcionario: true },
      });
    }

    return this.prisma.usuario.findFirst({
      where: {
        ativo: true,
        funcionario: { matricula: identificador },
      },
      include: { funcionario: true },
    });
  }

  private async emitSession(
    usuario: Usuario & {
      funcionario: { matricula: string; cargo: string; crmv: string | null } | null;
    },
    res: Response,
    manterConectado: boolean,
  ) {
    const accessToken = await this.signAccessToken(usuario.id);
    const rawRefresh = randomBytes(48).toString("base64url");
    const tokenHash = hashToken(rawRefresh);
    const expiresAt = manterConectado
      ? new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
      : null;

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        usuarioId: usuario.id,
        expiresAt,
      },
    });

    this.setRefreshCookie(res, rawRefresh, manterConectado);

    await this.prisma.auditoriaEvento.create({
      data: {
        tipo: "login",
        usuarioId: usuario.id,
        dados: { usuarioId: usuario.id },
      },
    });

    return {
      accessToken,
      usuario: toPublicUser(usuario),
    };
  }

  private signAccessToken(userId: number): Promise<string> {
    return this.jwt.signAsync({ sub: userId }, { expiresIn: ACCESS_TTL });
  }

  private setRefreshCookie(
    res: Response,
    rawToken: string,
    manterConectado: boolean,
  ) {
    const secure = this.config.get<string>("NODE_ENV") === "production";
    res.cookie(REFRESH_COOKIE, rawToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      ...(manterConectado
        ? { maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000 }
        : {}),
    });
  }

  clearRefreshCookie(res: Response) {
    const secure = this.config.get<string>("NODE_ENV") === "production";
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
    });
  }
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function maskCpf(cpf: string): string {
  const d = digitsOnly(cpf);
  if (d.length !== 11) return "***";
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

export function toPublicUser(
  user: Usuario & {
    funcionario: { matricula: string; cargo: string; crmv: string | null } | null;
  },
): PublicUser {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    cpfMascarado: maskCpf(user.cpf),
    telefone: user.telefone,
    perfilAcesso: user.perfilAcesso,
    matricula: user.funcionario?.matricula ?? null,
    cargo: user.funcionario?.cargo ?? null,
    crmv: user.funcionario?.crmv ?? null,
  };
}
