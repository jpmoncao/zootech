import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateVacinaDto } from "./dto/create-vacina.dto";
import { ListVacinasDto } from "./dto/list-vacinas.dto";
import { UpdateVacinaDto } from "./dto/update-vacina.dto";
import { VacinasService } from "./vacinas.service";

// Catálogo: consulta para todos os perfis autenticados; escrita só da Coordenação. Sem DELETE: vacina é inativada.
@Controller("vacinas")
@UseGuards(JwtAuthGuard, RolesGuard)
export class VacinasController {
  constructor(private readonly vacinas: VacinasService) {}

  @Get()
  listar(@Query() filtros: ListVacinasDto) {
    return this.vacinas.listar(filtros);
  }

  @Get(":id")
  obter(@Param("id", ParseIntPipe) id: number) {
    return this.vacinas.obter(id);
  }

  @Post()
  @Roles("coordenacao")
  criar(@Body() dto: CreateVacinaDto, @CurrentUser() user: AuthUser) {
    return this.vacinas.criar(dto, user);
  }

  @Patch(":id")
  @Roles("coordenacao")
  atualizar(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateVacinaDto, @CurrentUser() user: AuthUser) {
    return this.vacinas.atualizar(id, dto, user);
  }

  @Post(":id/inativar")
  @Roles("coordenacao")
  inativar(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.vacinas.inativar(id, user);
  }

  @Post(":id/reativar")
  @Roles("coordenacao")
  reativar(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.vacinas.reativar(id, user);
  }
}
