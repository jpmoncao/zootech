import { SetMetadata } from "@nestjs/common";
import { PerfilAcesso } from "@prisma/client";

export const ROLES_KEY = "roles";

export const Roles = (...roles: PerfilAcesso[]) =>
  SetMetadata(ROLES_KEY, roles);
