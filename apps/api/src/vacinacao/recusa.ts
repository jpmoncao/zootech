import { ConflictException } from "@nestjs/common";

// Recusa de regra de domínio: 409 com `codigo` estável. O front consome o código, não o texto.
export function recusa(codigo: string, message: string, extra: Record<string, unknown> = {}) {
  return new ConflictException({ statusCode: 409, error: "Conflict", codigo, message, ...extra });
}
