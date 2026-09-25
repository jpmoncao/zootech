import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class AlocarAnimalDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) baiaId?: number | null;
  @IsOptional() @IsString() @MaxLength(240) observacao?: string;
}
