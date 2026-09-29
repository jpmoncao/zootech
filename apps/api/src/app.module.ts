import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AnimaisModule } from "./animais/animais.module";
import { AuthModule } from "./auth/auth.module";
import { BaiasModule } from "./baias/baias.module";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { TutoresModule } from "./tutores/tutores.module";
import { AdocoesModule } from "./adocoes/adocoes.module";
import { DashboardModule } from "./dashboard/dashboard.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BaiasModule,
    AnimaisModule,
    TutoresModule,
    AdocoesModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
