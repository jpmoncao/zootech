import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AdocoesController } from "./adocoes.controller";
import { AdocoesService } from "./adocoes.service";

@Module({ imports: [AuthModule, PrismaModule], controllers: [AdocoesController], providers: [AdocoesService] })
export class AdocoesModule {}
