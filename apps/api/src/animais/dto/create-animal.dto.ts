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

export class CreateAnimalDto {
  @IsString() @MaxLength(120) nome!: string;
  @IsString() @MaxLength(60) numeroRegistro!: string;
  @IsIn(["cao", "gato"]) especie!: "cao" | "gato";
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) racaId?: number;
  @IsOptional() @IsIn(["macho", "femea", "nao_informado"]) sexo?: "macho" | "femea" | "nao_informado";
  @IsOptional() @IsIn(["pequeno", "medio", "grande", "nao_informado"]) porte?: "pequeno" | "medio" | "grande" | "nao_informado";
  @IsOptional() @IsString() @MaxLength(80) corPelagem?: string;
  @IsOptional() @IsIn(["em_tratamento", "em_quarentena_observacao", "saudavel", "obito"]) situacao?: "em_tratamento" | "em_quarentena_observacao" | "saudavel" | "obito";
  @IsOptional() @IsBoolean() emIsolamento?: boolean;
  @IsOptional() @IsIn(["sim", "nao", "nao_informado"]) castrado?: "sim" | "nao" | "nao_informado";
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.001) pesoAtualKg?: number;
  @IsOptional() @IsDateString() dataAcolhimento?: string;
  @IsOptional() @IsDateString() dataNascimento?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) idadeEstimadaQuantidade?: number;
  @IsOptional() @IsIn(["dias", "meses", "anos"]) idadeEstimadaUnidade?: "dias" | "meses" | "anos";
  @IsOptional() @IsBoolean() idadeAproximada?: boolean;
  @IsOptional() @IsBoolean() nasceuNoCcz?: boolean;
  @IsOptional() @IsString() @MaxLength(120) acolhidoPor?: string;
}
