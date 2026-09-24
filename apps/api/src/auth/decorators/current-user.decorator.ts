import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Usuario } from "@prisma/client";

export type AuthUser = Usuario & {
  funcionario: { matricula: string; cargo: string; crmv: string | null } | null;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
