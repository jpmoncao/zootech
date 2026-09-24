import { IsBoolean, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class LoginDto {
  @IsString()
  @Matches(/^(\d{11}|\d{4,8})$/, {
    message: "Informe um CPF (11 dígitos) ou matrícula (4 a 8 dígitos).",
  })
  identificador!: string;

  @IsString()
  @MinLength(1)
  senha!: string;

  @IsOptional()
  @IsBoolean()
  manterConectado?: boolean;
}
