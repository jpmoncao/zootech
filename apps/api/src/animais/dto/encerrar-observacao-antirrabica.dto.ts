import { IsIn, IsString, MaxLength } from "class-validator";

// Encerrar o período exige conclusão escrita e desfecho: um período que fecha sem
// conclusão não serve como registro sanitário, que é a razão de controlar o prazo.
// `adotado` não entra: a adoção tem fluxo próprio. `em_observacao_antirrabica` também não,
// porque encerrar para a mesma situação seria reiniciar a contagem, não encerrar.
export class EncerrarObservacaoAntirrabicaDto {
  @IsString() @MaxLength(2000) observacaoFinal!: string;
  @IsIn(["em_tratamento", "em_quarentena_observacao", "saudavel", "obito"])
  situacao!: "em_tratamento" | "em_quarentena_observacao" | "saudavel" | "obito";
}
