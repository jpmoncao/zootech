import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class ConcluirCastracaoDto {
  @IsDateString() dataEfetiva!: string;
  @IsOptional() @IsBoolean() dataEfetivaTemHora?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) observacao?: string;
}
