import { IsString, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  senhaAtual!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  senhaNova!: string;
}
