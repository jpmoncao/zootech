import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TutoresController } from "./tutores.controller";
import { TutoresService } from "./tutores.service";

@Module({ imports: [AuthModule, PrismaModule], controllers: [TutoresController], providers: [TutoresService], exports: [TutoresService] })
export class TutoresModule {}
