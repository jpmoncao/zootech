import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PerfilAcesso } from "@prisma/client";
import {
  CARGO_POR_PERFIL,
  digitsOnly,
  toPublicUser,
  type PublicUser,
} from "../auth/auth.service";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { UpdatePerfilDto } from "./dto/update-perfil.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listarAtivos(): Promise<PublicUser[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { ativo: true },
      include: { funcionario: true },
      orderBy: { nome: "asc" },
    });

    return usuarios.map(toPublicUser);
  }

  async atualizarPerfil(
    id: number,
    dto: UpdatePerfilDto,
    ator: AuthUser,
  ): Promise<PublicUser> {
    const alvo = await this.prisma.usuario.findUnique({
      where: { id },
      include: { funcionario: true },
    });

    if (!alvo || !alvo.ativo) {
      throw new NotFoundException("Usuário não encontrado.");
    }

    if (
      alvo.perfilAcesso === "coordenacao" &&
      dto.perfilAcesso !== "coordenacao"
    ) {
      const outras = await this.prisma.usuario.count({
        where: {
          ativo: true,
          perfilAcesso: "coordenacao",
          NOT: { id },
        },
      });
      if (outras === 0) {
        throw new ConflictException(
          "É preciso existir outra coordenação antes de rebaixar esta conta.",
        );
      }
    }

    if (ator.id === id) {
      throw new ForbiddenException(
        "A coordenação não pode trocar o próprio tipo.",
      );
    }

    let crmv: string | null = null;
    if (dto.perfilAcesso === "veterinario") {
      const digits = dto.crmv ? digitsOnly(dto.crmv) : "";
      if (digits.length < 4) {
        throw new BadRequestException("CRMV deve ter pelo menos 4 dígitos.");
      }
      crmv = digits;
    }

    const anterior = alvo.perfilAcesso;

    const atualizado = await this.prisma.$transaction(async (tx) => {
      const user = await tx.usuario.update({
        where: { id },
        data: {
          perfilAcesso: dto.perfilAcesso,
          funcionario: {
            update: {
              cargo: CARGO_POR_PERFIL[dto.perfilAcesso],
              crmv,
            },
          },
        },
        include: { funcionario: true },
      });

      await tx.refreshToken.deleteMany({ where: { usuarioId: id } });

      await tx.auditoriaEvento.create({
        data: {
          tipo: "tipo_alterado",
          usuarioId: ator.id,
          dados: {
            usuarioId: id,
            perfilAnterior: anterior,
            perfilNovo: dto.perfilAcesso as PerfilAcesso,
            alteradoPorId: ator.id,
          },
        },
      });

      return user;
    });

    return toPublicUser(atualizado);
  }
}
