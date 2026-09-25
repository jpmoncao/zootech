import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateObservacaoAnimalDto {
  @IsString() @MaxLength(2000) texto!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) observacaoOrigemId?: number;
}
