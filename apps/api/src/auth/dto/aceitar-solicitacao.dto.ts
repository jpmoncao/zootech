import { PerfilAcesso } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class AceitarSolicitacaoDto {
  @IsEnum(PerfilAcesso)
  perfilAcesso!: PerfilAcesso;

  @IsOptional()
  @IsString()
  @MinLength(4, { message: "CRMV deve ter pelo menos 4 dígitos." })
  crmv?: string;
}
