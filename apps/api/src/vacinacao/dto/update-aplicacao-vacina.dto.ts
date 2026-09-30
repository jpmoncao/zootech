import { IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { DATA_CIVIL } from "./create-aplicacao-vacina.dto";

// Só campos não estruturais. Animal, vacina, dose, data e a marcação de adiantada não são editáveis:
// a whitelist do ValidationPipe descarta qualquer outro campo enviado.
export class UpdateAplicacaoVacinaDto {
  @IsOptional() @IsString() @MaxLength(60) lote?: string;
  @IsOptional() @Matches(DATA_CIVIL, { message: "validadeLote deve estar no formato AAAA-MM-DD." }) validadeLote?: string | null;
  @IsOptional() @IsString() @MaxLength(80) viaAplicacao?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) observacao?: string | null;
  @IsOptional() @IsString() @MaxLength(120) aplicadoPor?: string | null;
  @IsOptional() @Matches(DATA_CIVIL, { message: "dataProximaDose deve estar no formato AAAA-MM-DD." }) dataProximaDose?: string | null;
}
