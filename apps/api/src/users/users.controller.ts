import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UpdatePerfilDto } from "./dto/update-perfil.dto";
import { UsersService } from "./users.service";

@Controller("usuarios")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("coordenacao")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  listar() {
    return this.users.listarAtivos();
  }

  @Patch(":id/perfil")
  atualizarPerfil(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdatePerfilDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.users.atualizarPerfil(id, dto, user);
  }
}
