import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AnimaisModule } from "./animais/animais.module";
import { AuthModule } from "./auth/auth.module";
import { BaiasModule } from "./baias/baias.module";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BaiasModule,
    AnimaisModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
