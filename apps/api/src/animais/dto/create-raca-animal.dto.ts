import { IsIn, IsString, MaxLength } from "class-validator";

export class CreateRacaAnimalDto {
  @IsIn(["cao", "gato"]) especie!: "cao" | "gato";
  @IsString() @MaxLength(80) nome!: string;
}
