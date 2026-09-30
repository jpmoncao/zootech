import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class RevogarSituacaoDto {
  @IsIn(["em_tratamento", "em_quarentena_observacao", "em_observacao_antirrabica", "saudavel"]) situacao!: "em_tratamento" | "em_quarentena_observacao" | "em_observacao_antirrabica" | "saudavel";
  @IsString() @MinLength(5) @MaxLength(500) motivo!: string;
}
