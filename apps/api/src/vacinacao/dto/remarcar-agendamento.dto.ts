import { Type } from "class-transformer";
import { IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min } from "class-validator";

// Remarcar mantém o agendamento em `agendado`. Animal e vacina não mudam: para isso,
// cancela-se este e cria-se outro, porque a troca apagaria o rastro do compromisso original.
export class RemarcarAgendamentoDto {
  @IsISO8601({ strict: true }, { message: "dataHoraPrevista deve ser um instante ISO 8601." }) dataHoraPrevista!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) responsavelId?: number | null;
  @IsOptional() @IsString() @MaxLength(1000) observacao?: string | null;
  @IsOptional() @IsString() @MaxLength(500) motivo?: string;
}
