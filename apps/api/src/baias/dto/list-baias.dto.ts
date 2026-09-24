import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class ListBaiasDto {
  @IsOptional() @IsIn(["canil", "gatil", "quarentena"]) setor?: "canil" | "gatil" | "quarentena";
  @IsOptional() @IsIn(["ativa", "inativa", "interditada", "em_higienizacao"]) estado?: "ativa" | "inativa" | "interditada" | "em_higienizacao";
  @IsOptional() @IsString() @MaxLength(40) busca?: string;
}
