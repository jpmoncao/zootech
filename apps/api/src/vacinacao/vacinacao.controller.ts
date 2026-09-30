import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateAplicacaoVacinaDto } from "./dto/create-aplicacao-vacina.dto";
import { ListAplicacoesDto } from "./dto/list-aplicacoes.dto";
import { MotivoDto } from "./dto/motivo.dto";
import { UpdateAplicacaoVacinaDto } from "./dto/update-aplicacao-vacina.dto";
import { VacinacaoService } from "./vacinacao.service";

// Consulta para todos os perfis autenticados; escrita clínica (coordenacao e veterinario).
// Anular aplicação é só da Coordenação. Sem DELETE: correção é anulação motivada mais novo registro.
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class VacinacaoController {
  constructor(private readonly vacinacao: VacinacaoService) {}

  @Get("animais/:animalId/vacinacao")
  obterDoAnimal(@Param("animalId", ParseIntPipe) animalId: number) {
    return this.vacinacao.obterDoAnimal(animalId);
  }

  @Post("animais/:animalId/vacinacao/aplicacoes")
  @Roles("coordenacao", "veterinario")
  registrarAplicacao(
    @Param("animalId", ParseIntPipe) animalId: number,
    @Body() dto: CreateAplicacaoVacinaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.vacinacao.registrarAplicacao(animalId, dto, user);
  }

  @Patch("animais/:animalId/vacinacao/aplicacoes/:aplicacaoId")
  @Roles("coordenacao", "veterinario")
  editarAplicacao(
    @Param("animalId", ParseIntPipe) animalId: number,
    @Param("aplicacaoId", ParseIntPipe) aplicacaoId: number,
    @Body() dto: UpdateAplicacaoVacinaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.vacinacao.editarAplicacao(animalId, aplicacaoId, dto, user);
  }

  @Post("animais/:animalId/vacinacao/aplicacoes/:aplicacaoId/anular")
  @Roles("coordenacao")
  anularAplicacao(
    @Param("animalId", ParseIntPipe) animalId: number,
    @Param("aplicacaoId", ParseIntPipe) aplicacaoId: number,
    @Body() dto: MotivoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.vacinacao.anularAplicacao(animalId, aplicacaoId, dto, user);
  }

  @Post("animais/:animalId/vacinacao/protocolos/:protocoloId/interromper")
  @Roles("coordenacao", "veterinario")
  interromperProtocolo(
    @Param("animalId", ParseIntPipe) animalId: number,
    @Param("protocoloId", ParseIntPipe) protocoloId: number,
    @Body() dto: MotivoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.vacinacao.interromperProtocolo(animalId, protocoloId, dto, user);
  }

  @Post("animais/:animalId/vacinacao/protocolos/:protocoloId/retomar")
  @Roles("coordenacao", "veterinario")
  retomarProtocolo(
    @Param("animalId", ParseIntPipe) animalId: number,
    @Param("protocoloId", ParseIntPipe) protocoloId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.vacinacao.retomarProtocolo(animalId, protocoloId, user);
  }

  @Get("vacinacao/aplicacoes")
  listarPorLote(@Query() filtros: ListAplicacoesDto) {
    return this.vacinacao.listarPorLote(filtros);
  }
}
