import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService, REFRESH_COOKIE } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { AuthUser } from "./decorators/current-user.decorator";
import { Roles } from "./decorators/roles.decorator";
import { AceitarSolicitacaoDto } from "./dto/aceitar-solicitacao.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateSolicitacaoDto } from "./dto/create-solicitacao.dto";
import { LoginDto } from "./dto/login.dto";
import { RecusarSolicitacaoDto } from "./dto/recusar-solicitacao.dto";
import { UpdateMeDto } from "./dto/update-me.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("solicitacoes")
  async criarSolicitacao(@Body() dto: CreateSolicitacaoDto) {
    return this.auth.criarSolicitacao(dto);
  }

  @Get("solicitacoes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coordenacao")
  async listarSolicitacoes(@Query("status") status?: string) {
    return this.auth.listarSolicitacoes(status);
  }

  @Post("solicitacoes/:id/aceitar")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coordenacao")
  async aceitarSolicitacao(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AceitarSolicitacaoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.auth.aceitarSolicitacao(id, dto, user);
  }

  @Post("solicitacoes/:id/recusar")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coordenacao")
  async recusarSolicitacao(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RecusarSolicitacaoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.auth.recusarSolicitacao(id, dto, user);
  }

  @Post("login")
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.login(dto, res);
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    return this.auth.refresh(raw, res);
  }

  @Post("logout")
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    return this.auth.logout(raw, res);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  async atualizarMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMeDto,
  ) {
    return this.auth.atualizarMe(user, dto);
  }

  @Post("me/senha")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async alterarSenha(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    return this.auth.alterarSenha(user, dto, raw);
  }
}
