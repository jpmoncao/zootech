import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const SEED_VARS = [
  "SEED_COORDENACAO_NOME",
  "SEED_COORDENACAO_CPF",
  "SEED_COORDENACAO_MATRICULA",
  "SEED_COORDENACAO_EMAIL",
  "SEED_COORDENACAO_SENHA",
  "SEED_COORDENACAO_CRMV",
] as const;

type EnvReader = {
  get(key: string): string | undefined;
};

export async function seedCoordenacao(
  prisma: PrismaClient,
  config: EnvReader,
): Promise<void> {
  const logger = new Logger("SeedCoordenacao");
  const values = Object.fromEntries(
    SEED_VARS.map((key) => [key, config.get(key)?.trim()]),
  ) as Record<(typeof SEED_VARS)[number], string | undefined>;

  if (SEED_VARS.some((key) => !values[key])) {
    logger.log("Variáveis SEED_COORDENACAO_* ausentes; seed ignorado.");
    return;
  }

  const cpf = values.SEED_COORDENACAO_CPF!;

  try {
    const existing = await prisma.usuario.findFirst({ where: { cpf } });
    if (existing) {
      logger.log(`Conta de coordenação com CPF ${cpf} já existe; seed ignorado.`);
      return;
    }

    const senhaHash = await bcrypt.hash(values.SEED_COORDENACAO_SENHA!, 10);
    const email = values.SEED_COORDENACAO_EMAIL!.toLowerCase();

    await prisma.usuario.create({
      data: {
        nome: values.SEED_COORDENACAO_NOME!,
        email,
        senhaHash,
        cpf,
        perfilAcesso: "coordenacao",
        ativo: true,
        funcionario: {
          create: {
            matricula: values.SEED_COORDENACAO_MATRICULA!,
            cargo: "Coordenação",
            crmv: values.SEED_COORDENACAO_CRMV!,
          },
        },
      },
    });

    logger.log(`Conta de coordenação criada para CPF ${cpf}.`);
  } catch (error) {
    logger.warn(
      `Seed da coordenação ignorado: banco indisponível ou falha ao gravar. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function loadLocalEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

async function main() {
  loadLocalEnv(resolve(__dirname, "../.env"));
  const prisma = new PrismaClient();
  try {
    await seedCoordenacao(prisma, {
      get: (key) => process.env[key],
    });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
