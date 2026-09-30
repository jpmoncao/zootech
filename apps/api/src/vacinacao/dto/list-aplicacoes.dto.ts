import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class ListAplicacoesDto {
  @IsString() @MaxLength(60) lote!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) vacinaId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limite?: number;
}
