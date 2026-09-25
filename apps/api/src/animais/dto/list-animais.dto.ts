import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListAnimaisDto {
  @IsOptional() @IsString() busca?: string;
  @IsOptional() @IsIn(["cao", "gato"]) especie?: "cao" | "gato";
  @IsOptional() @IsIn(["macho", "femea", "nao_informado"]) sexo?: "macho" | "femea" | "nao_informado";
  @IsOptional() @IsIn(["pequeno", "medio", "grande", "nao_informado"]) porte?: "pequeno" | "medio" | "grande" | "nao_informado";
  @IsOptional() @IsIn(["em_tratamento", "em_quarentena_observacao", "saudavel", "adotado", "obito"]) situacao?: "em_tratamento" | "em_quarentena_observacao" | "saudavel" | "adotado" | "obito";
  @IsOptional() @IsIn(["sim", "nao", "nao_informado"]) castrado?: "sim" | "nao" | "nao_informado";
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) baiaId?: number;
  @IsOptional() @Transform(({ value }) => value === true || value === "true") @IsBoolean() semBaia?: boolean;
  @IsOptional() @Transform(({ value }) => value === true || value === "true") @IsBoolean() comAlertas?: boolean;
  @IsOptional() @Transform(({ value }) => value === true || value === "true") @IsBoolean() incluirTerminais?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limite?: number;
}
