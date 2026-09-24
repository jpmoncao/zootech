import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = Number(config.get("PORT") ?? 3001);
  const origin = config.get<string>("CORS_ORIGIN");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  if (origin) {
    app.enableCors({ origin });
  }

  await app.listen(port, "0.0.0.0");
}

void bootstrap();
