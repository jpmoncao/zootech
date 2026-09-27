import { IsString, MaxLength, MinLength } from "class-validator";

export class LiberarAdocaoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  justificativa!: string;
}
