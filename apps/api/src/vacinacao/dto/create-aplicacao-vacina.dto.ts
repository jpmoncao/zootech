import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from "class-validator";

export const DATA_CIVIL = /^\d{4}-\d{2}-\d{2}$/;

export class CreateAplicacaoVacinaDto {
  @Type(() => Number) @IsInt() @Min(1) vacinaId!: number;
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
  // Dose que a tela mostrou. Se outra pessoa registrou no meio-tempo, a divergência vira recusa em vez de gravar a dose errada.
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) numeroDoseEsperada?: number;
}
