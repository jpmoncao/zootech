import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

const SITUACOES_RETORNO = ["em_tratamento", "em_quarentena_observacao", "saudavel"] as const;

export class RegistrarDevolucaoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  motivo!: string;

  @IsIn(SITUACOES_RETORNO)
  situacaoRetorno!: (typeof SITUACOES_RETORNO)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  baiaId?: number | null;
}
