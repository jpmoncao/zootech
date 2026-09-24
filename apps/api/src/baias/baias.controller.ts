import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AcaoBaiaDto } from "./dto/acao-baia.dto";
import { CreateBaiaDto } from "./dto/create-baia.dto";
import { ListBaiasDto } from "./dto/list-baias.dto";
import { UpdateBaiaDto } from "./dto/update-baia.dto";
import { BaiasService } from "./baias.service";

@Controller("baias")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BaiasController {
  constructor(private readonly baias: BaiasService) {}

  @Get()
  listar(@Query() filtros: ListBaiasDto) { return this.baias.listar(filtros); }

  @Get(":id/historico")
  @Roles("coordenacao")
  historico(@Param("id", ParseIntPipe) id: number) { return this.baias.historico(id); }

  @Get(":id")
  obter(@Param("id", ParseIntPipe) id: number) { return this.baias.obter(id); }

  @Post()
  @Roles("coordenacao")
  criar(@Body() dto: CreateBaiaDto, @CurrentUser() user: AuthUser) { return this.baias.criar(dto, user); }

  @Patch(":id")
  @Roles("coordenacao")
  atualizar(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateBaiaDto, @CurrentUser() user: AuthUser) {
    return this.baias.atualizar(id, dto, user);
  }

  @Post(":id/acoes/:acao")
  @Roles("coordenacao")
  acao(@Param("id", ParseIntPipe) id: number, @Param("acao") acao: string, @Body() dto: AcaoBaiaDto, @CurrentUser() user: AuthUser) {
    return this.baias.acao(id, acao, dto, user);
  }
}
