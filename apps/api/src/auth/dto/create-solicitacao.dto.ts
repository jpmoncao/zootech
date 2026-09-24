import { PerfilAcesso } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateSolicitacaoDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  nome!: string;

  @IsString()
  @Matches(/^\d{11}$/, { message: "CPF deve ter 11 dígitos." })
  cpf!: string;

  @IsString()
  @Matches(/^\d{4,8}$/, { message: "Matrícula deve ter de 4 a 8 dígitos." })
  matricula!: string;

  @IsEmail()
  @Matches(/\.gov\.br$/i, {
    message: "E-mail institucional deve terminar em .gov.br.",
  })
  email!: string;

  @IsEnum(PerfilAcesso)
  funcaoPretendida!: PerfilAcesso;

  @ValidateIf((dto: CreateSolicitacaoDto) => dto.funcaoPretendida === "veterinario")
  @IsString({ message: "CRMV é obrigatório para veterinário." })
  @MinLength(4, { message: "CRMV deve ter pelo menos 4 dígitos." })
  crmv?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  senha!: string;
}
