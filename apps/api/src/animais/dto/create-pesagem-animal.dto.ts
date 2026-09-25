import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreatePesagemAnimalDto {
  @Type(() => Number) @IsNumber() @Min(0.001) valorKg!: number;
  @IsOptional() @IsString() @MaxLength(500) observacao?: string;
}
