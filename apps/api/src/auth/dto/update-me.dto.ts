import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from "class-validator";

export class UpdateMeDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== "" && value != null)
  @IsString()
  @Matches(/^(\d{10,11})?$/, {
    message: "Telefone deve ter 10 ou 11 dígitos, ou ficar vazio.",
  })
  telefone?: string | null;

  @IsOptional()
  @IsEmail()
  @Matches(/\.gov\.br$/i, {
    message: "E-mail institucional deve terminar em .gov.br.",
  })
  email?: string;
}
