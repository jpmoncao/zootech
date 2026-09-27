import { Body, Controller, Get, Param, ParseIntPipe, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ConcluirAdocaoDto } from "./dto/concluir-adocao.dto";
import { LiberarAdocaoDto } from "./dto/liberar-adocao.dto";
import { RegistrarDevolucaoDto } from "./dto/registrar-devolucao.dto";
import { AdocoesService } from "./adocoes.service";

@Controller("animais/:animalId/adocoes")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdocoesController {
  constructor(private readonly adocoes: AdocoesService) {}

  @Post("liberacao")
  @Roles("coordenacao", "veterinario")
  liberar(@Param("animalId", ParseIntPipe) animalId: number, @Body() dto: LiberarAdocaoDto, @CurrentUser() user: AuthUser) {
    return this.adocoes.liberar(animalId, dto, user);
  }

  @Post()
  @UseInterceptors(FileInterceptor("assinatura", { storage: memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  concluir(@Param("animalId", ParseIntPipe) animalId: number, @Body() dto: ConcluirAdocaoDto, @UploadedFile() assinatura: Express.Multer.File | undefined, @CurrentUser() user: AuthUser) {
    return this.adocoes.concluir(animalId, dto, assinatura, user);
  }

  @Post("devolucao")
  devolver(@Param("animalId", ParseIntPipe) animalId: number, @Body() dto: RegistrarDevolucaoDto, @CurrentUser() user: AuthUser) {
    return this.adocoes.devolver(animalId, dto, user);
  }

  @Get("assinatura/:adocaoId")
  async assinatura(@Param("animalId", ParseIntPipe) animalId: number, @Param("adocaoId", ParseIntPipe) adocaoId: number, @Res() response: Response) {
    const result = await this.adocoes.obterAssinatura(animalId, adocaoId);
    response.set({ "Content-Type": result.mimeType, "Content-Length": String(result.length), "Cache-Control": "private, no-store" });
    return result.file;
  }
}
