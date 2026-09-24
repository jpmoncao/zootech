import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateBaiaDto {
  @IsString() @MaxLength(40) codigo!: string;
  @IsIn(["canil", "gatil", "quarentena"]) setor!: "canil" | "gatil" | "quarentena";
  @IsIn(["coletiva", "individual"]) tipo!: "coletiva" | "individual";
  @Type(() => Number) @IsInt() @Min(1) capacidade!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) areaM2?: number;
  @IsOptional() @IsBoolean() possuiSolario?: boolean;
  @IsOptional() @IsBoolean() exclusivaIsolamento?: boolean;
}
