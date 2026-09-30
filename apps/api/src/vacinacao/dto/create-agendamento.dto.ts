import { Type } from "class-transformer";
import { IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateAgendamentoDto {
  @Type(() => Number) @IsInt() @Min(1) animalId!: number;
  @Type(() => Number) @IsInt() @Min(1) vacinaId!: number;
  @IsISO8601({ strict: true }, { message: "dataHoraPrevista deve ser um instante ISO 8601." }) dataHoraPrevista!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) responsavelId?: number | null;
  @IsOptional() @IsString() @MaxLength(1000) observacao?: string | null;
}
