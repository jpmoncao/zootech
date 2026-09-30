import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

export class ListVacinasDto {
  @IsOptional() @IsString() busca?: string;
  @IsOptional() @IsIn(["cao", "gato"]) especie?: "cao" | "gato";
  // Ausente = todas. Sem isso, "ausente" viraria `false` e filtraria só as inativas.
  @IsOptional() @Transform(({ value }) => (value === undefined ? undefined : value === true || value === "true")) @IsBoolean() ativa?: boolean;
}
