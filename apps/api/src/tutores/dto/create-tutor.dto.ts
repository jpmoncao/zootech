import { IsEmail, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class CreateTutorDto {
  @IsString() @MaxLength(120) nome!: string;
  @IsString() cpf!: string;
  @IsString() @MaxLength(30) telefone!: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsString() @MaxLength(40) tipoDocumento!: string;
  @IsString() @MaxLength(40) numeroDocumento!: string;
  @IsString() @MaxLength(9) cep!: string;
  @IsString() @MaxLength(160) logradouro!: string;
  @IsString() @MaxLength(20) numero!: string;
  @IsOptional() @IsString() @MaxLength(100) complemento?: string;
  @IsString() @MaxLength(100) bairro!: string;
  @IsString() @MaxLength(100) cidade!: string;
  @IsString() @Length(2, 2) uf!: string;
}
