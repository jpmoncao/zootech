import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BaiasController } from "./baias.controller";
import { BaiasService } from "./baias.service";

@Module({ imports: [AuthModule], controllers: [BaiasController], providers: [BaiasService] })
export class BaiasModule {}
