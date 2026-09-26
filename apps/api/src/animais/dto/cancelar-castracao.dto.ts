import { IsString, MaxLength, MinLength } from "class-validator";

export class CancelarCastracaoDto {
  @IsString() @MinLength(3) @MaxLength(500) motivo!: string;
}
