import { IsString, MaxLength } from "class-validator";

export class MotivoDto {
  @IsString() @MaxLength(500) motivo!: string;
}
