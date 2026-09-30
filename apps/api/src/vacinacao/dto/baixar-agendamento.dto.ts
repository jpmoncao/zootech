import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { DATA_CIVIL } from "./create-aplicacao-vacina.dto";

// A baixa cria a aplicação: animal, vacina e dose vêm do agendamento, não do corpo.
// O resto espelha o registro direto, inclusive a confirmação de dose adiantada.
export class BaixarAgendamentoDto {
  @Matches(DATA_CIVIL, { message: "dataAplicacao deve estar no formato AAAA-MM-DD." }) dataAplicacao!: string;
  @IsString() @MaxLength(60) lote!: string;
  @IsOptional() @Matches(DATA_CIVIL, { message: "validadeLote deve estar no formato AAAA-MM-DD." }) validadeLote?: string | null;
  @IsOptional() @IsString() @MaxLength(80) viaAplicacao?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) observacao?: string | null;
  @IsOptional() @IsString() @MaxLength(120) aplicadoPor?: string | null;
  @IsOptional() @IsBoolean() registroRetroativo?: boolean;
  @IsOptional() @IsBoolean() confirmaAdiantada?: boolean;
  @IsOptional() @IsString() @MaxLength(500) motivoAdiantada?: string;
  @IsOptional() @Matches(DATA_CIVIL, { message: "dataProximaDose deve estar no formato AAAA-MM-DD." }) dataProximaDose?: string | null;
}
