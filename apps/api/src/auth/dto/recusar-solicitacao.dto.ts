import { IsOptional, IsString, MaxLength } from "class-validator";

export class RecusarSolicitacaoDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  motivo?: string;
}
