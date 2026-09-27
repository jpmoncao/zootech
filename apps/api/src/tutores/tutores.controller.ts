import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res,
  UploadedFile, UseGuards, UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { memoryStorage } from "multer";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateTutorDto } from "./dto/create-tutor.dto";
import { UpdateTutorDto } from "./dto/update-tutor.dto";
import { TutoresService } from "./tutores.service";

@Controller("tutores")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TutoresController {
  constructor(private readonly tutores: TutoresService) {}

  @Get() listar(@Query("busca") busca?: string) { return this.tutores.listar(busca); }
  @Get("cpf/:cpf") porCpf(@Param("cpf") cpf: string) { return this.tutores.porCpf(cpf); }
  @Post() criar(@Body() dto: CreateTutorDto, @CurrentUser() user: AuthUser) { return this.tutores.criar(dto, user); }
  @Get(":id") obter(@Param("id", ParseIntPipe) id: number) { return this.tutores.obter(id); }
  @Patch(":id") atualizar(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateTutorDto, @CurrentUser() user: AuthUser) { return this.tutores.atualizar(id, dto, user); }

  @Post(":id/midia/foto")
  @UseInterceptors(FileInterceptor("arquivo", { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  foto(@Param("id", ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) { return this.tutores.guardarMidia(id, "foto", file, user); }

  @Post(":id/midia/documentos")
  @UseInterceptors(FileInterceptor("arquivo", { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  documento(@Param("id", ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) { return this.tutores.guardarMidia(id, "documento", file, user); }

  @Get(":id/midia/:tipo/:midiaId")
  async midia(@Param("id", ParseIntPipe) id: number, @Param("tipo") tipo: "foto" | "documento", @Param("midiaId", ParseIntPipe) midiaId: number, @Res() res: Response) {
    const image = await this.tutores.obterMidia(id, tipo, midiaId);
    res.setHeader("Content-Type", image.mimeType);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(image.bytes);
  }
}
