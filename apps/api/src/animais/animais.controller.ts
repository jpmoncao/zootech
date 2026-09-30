import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { memoryStorage } from "multer";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AnimaisService } from "./animais.service";
import { AlocarAnimalDto } from "./dto/alocar-animal.dto";
import { CancelarCastracaoDto } from "./dto/cancelar-castracao.dto";
import { ConcluirCastracaoDto } from "./dto/concluir-castracao.dto";
import { CreateAnimalDto } from "./dto/create-animal.dto";
import { CreateCastracaoAgendamentoDto } from "./dto/create-castracao-agendamento.dto";
import { CreateCastracaoAvaliacaoDto } from "./dto/create-castracao-avaliacao.dto";
import { CreateCastracaoLegadaDto } from "./dto/create-castracao-legada.dto";
import { CreateEventoAnimalDto } from "./dto/create-evento-animal.dto";
import { CreateObservacaoAnimalDto } from "./dto/create-observacao-animal.dto";
import { CreatePesagemAnimalDto } from "./dto/create-pesagem-animal.dto";
import { CreateRacaAnimalDto } from "./dto/create-raca-animal.dto";
import { EncerrarObservacaoAntirrabicaDto } from "./dto/encerrar-observacao-antirrabica.dto";
import { ListAnimaisDto } from "./dto/list-animais.dto";
import { ListCastracoesDto } from "./dto/list-castracoes.dto";
import { RevogarSituacaoDto } from "./dto/revogar-situacao.dto";
import { UpdateAnimalDto } from "./dto/update-animal.dto";

@Controller("animais")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnimaisController {
  constructor(private readonly animais: AnimaisService) { }

  @Get("racas")
  listarRacas(@Query("especie") especie?: "cao" | "gato") {
    return this.animais.listarRacas(especie);
  }

  @Get("castracoes")
  listarAgendaCastracoes(@Query() filtros: ListCastracoesDto) {
    return this.animais.listarAgendaCastracoes(filtros);
  }

  @Post("racas")
  criarRaca(@Body() dto: CreateRacaAnimalDto) {
    return this.animais.criarRaca(dto);
  }

  @Get()
  listar(@Query() filtros: ListAnimaisDto) {
    return this.animais.listar(filtros);
  }

  @Post()
  criar(@Body() dto: CreateAnimalDto, @CurrentUser() user: AuthUser) {
    return this.animais.criar(dto, user);
  }

  @Get(":id")
  obter(@Param("id", ParseIntPipe) id: number) {
    return this.animais.obter(id);
  }

  @Patch(":id")
  atualizar(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateAnimalDto, @CurrentUser() user: AuthUser) {
    return this.animais.atualizar(id, dto, user);
  }

  @Get(":id/timeline")
  timeline(@Param("id", ParseIntPipe) id: number) {
    return this.animais.timeline(id);
  }

  @Post(":id/observacoes")
  observar(@Param("id", ParseIntPipe) id: number, @Body() dto: CreateObservacaoAnimalDto, @CurrentUser() user: AuthUser) {
    return this.animais.observar(id, dto, user);
  }

  @Post(":id/pesagens")
  pesar(@Param("id", ParseIntPipe) id: number, @Body() dto: CreatePesagemAnimalDto, @CurrentUser() user: AuthUser) {
    return this.animais.pesar(id, dto, user);
  }

  @Post(":id/eventos")
  registrarEvento(@Param("id", ParseIntPipe) id: number, @Body() dto: CreateEventoAnimalDto, @CurrentUser() user: AuthUser) {
    return this.animais.registrarEvento(id, dto, user);
  }

  @Post(":id/alocacao")
  alocar(@Param("id", ParseIntPipe) id: number, @Body() dto: AlocarAnimalDto, @CurrentUser() user: AuthUser) {
    return this.animais.alocar(id, dto, user);
  }

  @Get(":id/castracoes")
  listarCastracoes(@Param("id", ParseIntPipe) id: number) {
    return this.animais.listarCastracoes(id);
  }

  @Post(":id/castracoes/avaliacoes")
  avaliarCastracao(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateCastracaoAvaliacaoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.animais.avaliarCastracao(id, dto, user);
  }

  @Post(":id/castracoes/legado-realizado")
  registrarCastracaoLegada(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateCastracaoLegadaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.animais.registrarCastracaoLegada(id, dto, user);
  }

  @Post(":id/castracoes/agendamentos")
  agendarCastracao(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateCastracaoAgendamentoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.animais.agendarCastracao(id, dto, user);
  }

  @Patch(":id/castracoes/:castracaoId/reagendar")
  reagendarCastracao(
    @Param("id", ParseIntPipe) id: number,
    @Param("castracaoId", ParseIntPipe) castracaoId: number,
    @Body() dto: CreateCastracaoAgendamentoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.animais.reagendarCastracao(id, castracaoId, dto, user);
  }

  @Patch(":id/castracoes/:castracaoId/concluir")
  concluirCastracao(
    @Param("id", ParseIntPipe) id: number,
    @Param("castracaoId", ParseIntPipe) castracaoId: number,
    @Body() dto: ConcluirCastracaoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.animais.concluirCastracao(id, castracaoId, dto, user);
  }

  @Patch(":id/castracoes/:castracaoId/cancelar")
  cancelarCastracao(
    @Param("id", ParseIntPipe) id: number,
    @Param("castracaoId", ParseIntPipe) castracaoId: number,
    @Body() dto: CancelarCastracaoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.animais.cancelarCastracao(id, castracaoId, dto, user);
  }

  @Post(":id/fotos")
  @UseInterceptors(
    FileInterceptor("foto", {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    }),
  )
  adicionarFoto(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.animais.adicionarFoto(id, file, user);
  }

  @Get(":id/fotos/:fotoId/arquivo")
  async obterArquivoFoto(
    @Param("id", ParseIntPipe) id: number,
    @Param("fotoId", ParseIntPipe) fotoId: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.animais.obterArquivoFoto(id, fotoId);
    response.set({
      "Content-Type": result.mimeType,
      "Content-Length": String(result.length),
      "Cache-Control": "private, max-age=300",
    });
    return result.file;
  }

  @Delete(":id/fotos/:fotoId")
  removerFoto(
    @Param("id", ParseIntPipe) id: number,
    @Param("fotoId", ParseIntPipe) fotoId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.animais.removerFoto(id, fotoId, user);
  }

  // Encerrar a observação antirrábica é endpoint próprio porque são três escritas
  // que precisam suceder juntas: observação final, mudança de situação e limpeza do período.
  @Post(":id/encerrar-observacao-antirrabica")
  encerrarObservacaoAntirrabica(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: EncerrarObservacaoAntirrabicaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.animais.encerrarObservacaoAntirrabica(id, dto, user);
  }

  @Post(":id/revogar-situacao")
  revogarSituacao(@Param("id", ParseIntPipe) id: number, @Body() dto: RevogarSituacaoDto, @CurrentUser() user: AuthUser) {
    return this.animais.revogarSituacao(id, dto, user);
  }
}
