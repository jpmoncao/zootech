import { Module } from "@nestjs/common";
import { AgendaController } from "./agenda.controller";
import { AgendaService } from "./agenda.service";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { VacinacaoController } from "./vacinacao.controller";
import { VacinacaoService } from "./vacinacao.service";
import { VacinasController } from "./vacinas.controller";
import { VacinasService } from "./vacinas.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [VacinasController, VacinacaoController, AgendaController],
  providers: [VacinasService, VacinacaoService, AgendaService],
})
export class VacinacaoModule {}
