import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AgendaService } from "./agenda.service";
import { BaixarAgendamentoDto } from "./dto/baixar-agendamento.dto";
import { CreateAgendamentoDto } from "./dto/create-agendamento.dto";
import { ListAgendaDto } from "./dto/list-agenda.dto";
import { MotivoDto } from "./dto/motivo.dto";
import { RemarcarAgendamentoDto } from "./dto/remarcar-agendamento.dto";

// Agenda: consulta para todos os perfis autenticados; operar é clínico.
// Estados finais não voltam atrás — a ação é criar um novo agendamento.
@Controller("vacinacao")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgendaController {
  constructor(private readonly agenda: AgendaService) {}

  @Get("agenda")
  listar(@Query() filtros: ListAgendaDto) {
    return this.agenda.listar(filtros);
  }

  @Get("agendamentos/:id")
  obter(@Param("id", ParseIntPipe) id: number) {
    return this.agenda.obter(id);
  }

  @Post("agendamentos")
  @Roles("coordenacao", "veterinario")
  criar(@Body() dto: CreateAgendamentoDto, @CurrentUser() user: AuthUser) {
    return this.agenda.criar(dto, user);
  }

  @Patch("agendamentos/:id")
  @Roles("coordenacao", "veterinario")
  remarcar(@Param("id", ParseIntPipe) id: number, @Body() dto: RemarcarAgendamentoDto, @CurrentUser() user: AuthUser) {
    return this.agenda.remarcar(id, dto, user);
  }

  @Post("agendamentos/:id/cancelar")
  @Roles("coordenacao", "veterinario")
  cancelar(@Param("id", ParseIntPipe) id: number, @Body() dto: MotivoDto, @CurrentUser() user: AuthUser) {
    return this.agenda.cancelar(id, dto, user);
  }

  @Post("agendamentos/:id/falta")
  @Roles("coordenacao", "veterinario")
  marcarFalta(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.agenda.marcarFalta(id, user);
  }

  @Post("agendamentos/:id/baixa")
  @Roles("coordenacao", "veterinario")
  baixar(@Param("id", ParseIntPipe) id: number, @Body() dto: BaixarAgendamentoDto, @CurrentUser() user: AuthUser) {
    return this.agenda.baixar(id, dto, user);
  }
}
