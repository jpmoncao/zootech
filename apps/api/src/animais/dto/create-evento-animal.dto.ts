import { Type } from "class-transformer";
import { IsIn, IsInt, IsObject, IsOptional, IsString, MaxLength, Min, ValidateIf } from "class-validator";

const REACAO = "reacao_adversa";

export class CreateEventoAnimalDto {
  @IsIn(["exame", "diagnostico", REACAO]) tipo!: "exame" | "diagnostico" | "reacao_adversa";
  @IsString() @MaxLength(240) resumo!: string;
  @IsOptional() @IsObject() dados?: Record<string, unknown>;

  // Gravidade e desfecho são obrigatórios na reação adversa e proibidos nos demais tipos:
  // o CHECK do banco exige que existam juntos, e só a reação os usa.
  @ValidateIf((dto: CreateEventoAnimalDto) => dto.tipo === REACAO)
  @IsIn(["leve", "moderada", "grave"])
  gravidadeReacao?: "leve" | "moderada" | "grave";

  @ValidateIf((dto: CreateEventoAnimalDto) => dto.tipo === REACAO)
  @IsIn(["em_acompanhamento", "resolvida", "resolvida_com_sequela", "obito"])
  desfechoReacao?: "em_acompanhamento" | "resolvida" | "resolvida_com_sequela" | "obito";

  // Aplicação que originou a reação. Opcional: quem registra da seção de eventos pode não saber qual foi.
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) aplicacaoVacinaId?: number;

  // Atualização de desfecho: aponta para a reação já registrada. O evento é imutável,
  // então evoluir o quadro é criar outro evento que referencia o original.
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) eventoOrigemId?: number;
}
