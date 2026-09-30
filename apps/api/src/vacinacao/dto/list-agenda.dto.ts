import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from "class-validator";

export class ListAgendaDto {
  @IsOptional() @IsString() busca?: string;
  @IsOptional() @IsISO8601({ strict: true }) de?: string;
  @IsOptional() @IsISO8601({ strict: true }) ate?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) vacinaId?: number;
  @IsOptional() @IsIn(["cao", "gato"]) especie?: "cao" | "gato";
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) responsavelId?: number;
  @IsOptional() @IsIn(["agendado", "aplicado", "faltou", "cancelado"]) status?: "agendado" | "aplicado" | "faltou" | "cancelado";
  // Derivado, não armazenado: agendamento `agendado` cuja data e hora já passaram.
  @IsOptional() @Transform(({ value }) => (value === undefined ? undefined : value === true || value === "true")) @IsBoolean() atrasados?: boolean;
  // A agenda operacional esconde animais em situação terminal; o filtro explícito os traz de volta.
  @IsOptional() @Transform(({ value }) => (value === undefined ? undefined : value === true || value === "true")) @IsBoolean() incluirTerminais?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limite?: number;
}
