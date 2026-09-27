import { IsEmail, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class UpdateTutorDto {
  @IsOptional() @IsString() @MaxLength(120) nome?: string;
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsString() @MaxLength(30) telefone?: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(40) tipoDocumento?: string;
  @IsOptional() @IsString() @MaxLength(40) numeroDocumento?: string;
  @IsOptional() @IsString() @MaxLength(9) cep?: string;
  @IsOptional() @IsString() @MaxLength(160) logradouro?: string;
  @IsOptional() @IsString() @MaxLength(20) numero?: string;
  @IsOptional() @IsString() @MaxLength(100) complemento?: string;
  @IsOptional() @IsString() @MaxLength(100) bairro?: string;
  @IsOptional() @IsString() @MaxLength(100) cidade?: string;
  @IsOptional() @IsString() @Length(2, 2) uf?: string;
}
