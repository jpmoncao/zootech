import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateAnimalDto {
  @IsOptional() @IsString() @MaxLength(120) nome?: string;
  @IsOptional() @IsString() @MaxLength(60) numeroRegistro?: string;
  @IsOptional() @IsIn(["cao", "gato"]) especie?: "cao" | "gato";
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) racaId?: number | null;
  @IsOptional() @IsIn(["macho", "femea", "nao_informado"]) sexo?: "macho" | "femea" | "nao_informado";
  @IsOptional() @IsIn(["pequeno", "medio", "grande", "nao_informado"]) porte?: "pequeno" | "medio" | "grande" | "nao_informado";
  @IsOptional() @IsString() @MaxLength(80) corPelagem?: string | null;
  @IsOptional() @IsIn(["em_tratamento", "em_quarentena_observacao", "saudavel", "obito"]) situacao?: "em_tratamento" | "em_quarentena_observacao" | "saudavel" | "obito";
  @IsOptional() @IsBoolean() emIsolamento?: boolean;
  @IsOptional() @IsIn(["sim", "nao", "nao_informado"]) castrado?: "sim" | "nao" | "nao_informado";
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.001) pesoAtualKg?: number | null;
  @IsOptional() @IsDateString() dataAcolhimento?: string | null;
  @IsOptional() @IsDateString() dataNascimento?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) idadeEstimadaQuantidade?: number | null;
  @IsOptional() @IsIn(["dias", "meses", "anos"]) idadeEstimadaUnidade?: "dias" | "meses" | "anos" | null;
  @IsOptional() @IsBoolean() idadeAproximada?: boolean;
  @IsOptional() @IsBoolean() nasceuNoCcz?: boolean;
  @IsOptional() @IsString() @MaxLength(120) acolhidoPor?: string | null;
}
