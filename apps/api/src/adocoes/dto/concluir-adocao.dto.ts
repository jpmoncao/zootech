import { Transform } from "class-transformer";
import { IsBoolean, IsInt, Min } from "class-validator";

export class ConcluirAdocaoDto {
  @Transform(({ value }) => typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value)
  @IsInt()
  @Min(1)
  tutorId!: number;

  @Transform(({ value }) => value === "true" ? true : value === "false" ? false : value)
  @IsBoolean()
  consentiuTratamento!: boolean;

  @Transform(({ value }) => value === "true" ? true : value === "false" ? false : value)
  @IsBoolean()
  consentiuAcompanhamento!: boolean;
}
