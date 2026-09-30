import { Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

// Campos opcionais aceitam `null` para limpar o valor (IsOptional ignora null e undefined).
export class UpdateVacinaDto {
  @IsOptional() @IsString() @MaxLength(120) nome?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsIn(["cao", "gato"], { each: true }) especies?: ("cao" | "gato")[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) totalDoses?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(3650) intervaloDosesDias?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3650) revacinacaoDias?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(365) diasAvisoProximaDose?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(520) idadeMinimaSemanas?: number | null;
  @IsOptional() @IsString() @MaxLength(120) fabricante?: string | null;
  @IsOptional() @IsString() @MaxLength(80) viaAplicacaoSugerida?: string | null;
  @IsOptional() @IsBoolean() obrigatoria?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) observacoes?: string | null;
}
