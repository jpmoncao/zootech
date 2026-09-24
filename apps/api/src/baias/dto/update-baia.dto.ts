import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdateBaiaDto {
  @IsOptional() @IsString() @MaxLength(40) codigo?: string;
  @IsOptional() @IsIn(["canil", "gatil", "quarentena"]) setor?: "canil" | "gatil" | "quarentena";
  @IsOptional() @IsIn(["coletiva", "individual"]) tipo?: "coletiva" | "individual";
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) capacidade?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) areaM2?: number;
  @IsOptional() @IsBoolean() possuiSolario?: boolean;
  @IsOptional() @IsBoolean() exclusivaIsolamento?: boolean;
}
