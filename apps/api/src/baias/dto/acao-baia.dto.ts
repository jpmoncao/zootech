import { IsOptional, IsString, MaxLength } from "class-validator";

export class AcaoBaiaDto {
  @IsOptional() @IsString() @MaxLength(500) observacao?: string;
}
