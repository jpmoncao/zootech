import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";

export class ListCastracoesDto {
  @IsOptional() @IsIn(["agendada", "realizada", "cancelada"]) estado?: "agendada" | "realizada" | "cancelada";
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) de?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) ate?: string;
  @IsOptional() @IsString() busca?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limite?: number;
}
