import { Transform } from "class-transformer";
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateCastracaoLegadaDto {
  @IsOptional() @IsDateString() dataEfetiva?: string;
  @IsOptional() @Transform(({ value }) => value === true || value === "true") @IsBoolean() dataEfetivaTemHora?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) observacao?: string;
}
