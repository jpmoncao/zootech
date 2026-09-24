import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma/prisma.service";
import { seedCoordenacao } from "./seed";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = Number(config.get("PORT") ?? 3001);
  const origin = config.get<string>("CORS_ORIGIN");

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  if (origin) {
    app.enableCors({ origin, credentials: true });
  }

  await seedCoordenacao(app.get(PrismaService), config);

  await app.listen(port, "0.0.0.0");
}

void bootstrap();
