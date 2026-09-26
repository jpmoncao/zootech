import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateCastracaoAvaliacaoDto {
  @IsOptional() @IsDateString() dataAvaliacao?: string;
  @IsOptional() @IsString() @MaxLength(1000) observacao?: string;
}
