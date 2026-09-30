import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";

export class ListAnimaisDto {
  @IsOptional() @IsString() busca?: string;
  @IsOptional() @IsIn(["cao", "gato"]) especie?: "cao" | "gato";
  @IsOptional() @IsIn(["macho", "femea", "nao_informado"]) sexo?: "macho" | "femea" | "nao_informado";
  @IsOptional() @IsIn(["pequeno", "medio", "grande", "nao_informado"]) porte?: "pequeno" | "medio" | "grande" | "nao_informado";
  @IsOptional() @IsIn(["em_tratamento", "em_quarentena_observacao", "em_observacao_antirrabica", "saudavel", "adotado", "obito"]) situacao?: "em_tratamento" | "em_quarentena_observacao" | "em_observacao_antirrabica" | "saudavel" | "adotado" | "obito";
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) baiaId?: number;
  @IsOptional() @Transform(({ value }) => value === true || value === "true") @IsBoolean() semBaia?: boolean;
  @IsOptional() @Transform(({ value }) => value === true || value === "true") @IsBoolean() comAlertas?: boolean;
  @IsOptional() @Transform(({ value }) => value === true || value === "true") @IsBoolean() incluirTerminais?: boolean;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) adotadaDe?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) adotadaAte?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limite?: number;
}
