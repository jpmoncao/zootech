import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AnimaisController } from "./animais.controller";
import { AnimaisService } from "./animais.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AnimaisController],
  providers: [AnimaisService],
})
export class AnimaisModule {}
