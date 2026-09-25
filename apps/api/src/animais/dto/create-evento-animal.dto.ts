import { IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateEventoAnimalDto {
  @IsIn(["exame", "diagnostico"]) tipo!: "exame" | "diagnostico";
  @IsString() @MaxLength(240) resumo!: string;
  @IsOptional() @IsObject() dados?: Record<string, unknown>;
}
