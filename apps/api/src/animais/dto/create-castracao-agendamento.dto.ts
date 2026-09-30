import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateCastracaoAgendamentoDto {
  @IsDateString() dataHoraPlanejada!: string;
  @IsOptional() @IsString() @MaxLength(1000) observacao?: string;
}
