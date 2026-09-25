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

type RacaSeed = {
  especie: "cao" | "gato";
  nome: string;
  tipo: "catalogo" | "srd" | "outra" | "nao_informada";
};

const RACAS_CAES = [
  "SRD (Sem Raça Definida)",
  "Akita",
  "Basset Hound",
  "Beagle",
  "Border Collie",
  "Boxer",
  "Buldogue Francês",
  "Buldogue Inglês",
  "Bull Terrier",
  "Cane Corso",
  "Chihuahua",
  "Chow Chow",
  "Cocker Spaniel",
  "Dachshund",
  "Dálmata",
  "Doberman",
  "Dogo Argentino",
  "Fila Brasileiro",
  "Golden Retriever",
  "Husky Siberiano",
  "Labrador Retriever",
  "Lhasa Apso",
  "Maltês",
  "Mastim Napolitano",
  "Pastor Alemão",
  "Pastor Belga",
  "Pinscher",
  "Pit Bull (American Pit Bull Terrier)",
  "Poodle",
  "Pug",
  "Rottweiler",
  "Schnauzer",
  "Shih Tzu",
  "Spitz Alemão (Lulu da Pomerânia)",
  "Staffordshire Bull Terrier",
  "Yorkshire Terrier",
] as const;

const RACAS_GATOS = [
  "SRD (Sem Raça Definida)",
  "Abissínio",
  "Angorá",
  "Azul Russo",
  "Bengal",
  "Bobtail",
  "British Shorthair (Pelo Curto Inglês)",
  "Burmês",
  "Exótico",
  "Himalaio",
  "Maine Coon",
  "Munchkin",
  "Persa",
  "Ragdoll",
  "Savannah",
  "Scottish Fold",
  "Siamês",
  "Siberiano",
  "Sphynx",
] as const;

const RACAS_PADRAO: RacaSeed[] = [
  ...RACAS_CAES.map((nome) => ({
    especie: "cao" as const,
    nome,
    tipo: nome.startsWith("SRD") ? ("srd" as const) : ("catalogo" as const),
  })),
  { especie: "cao", nome: "Outra", tipo: "outra" },
  { especie: "cao", nome: "Não Informada", tipo: "nao_informada" },
  ...RACAS_GATOS.map((nome) => ({
    especie: "gato" as const,
    nome,
    tipo: nome.startsWith("SRD") ? ("srd" as const) : ("catalogo" as const),
  })),
  { especie: "gato", nome: "Outra", tipo: "outra" },
  { especie: "gato", nome: "Não Informada", tipo: "nao_informada" },
];

function normalizarNomeCatalogo(nome: string): string {
  return nome.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

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

export async function seedRacasAnimais(prisma: PrismaClient): Promise<void> {
  const logger = new Logger("SeedRacasAnimais");

  try {
    await prisma.$transaction(
      RACAS_PADRAO.map((raca) => {
        const nome = raca.nome.normalize("NFC").trim().replace(/\s+/g, " ");

        return prisma.racaAnimal.upsert({
          where: {
            especie_nomeNormalizado: {
              especie: raca.especie,
              nomeNormalizado: normalizarNomeCatalogo(nome),
            },
          },
          create: {
            especie: raca.especie,
            nome,
            nomeNormalizado: normalizarNomeCatalogo(nome),
            tipo: raca.tipo,
            catalogoPadrao: true,
          },
          update: {
            nome,
            tipo: raca.tipo,
            catalogoPadrao: true,
          },
        });
      }),
    );

    logger.log(`Catálogo de raças sincronizado (${RACAS_PADRAO.length} entradas).`);
  } catch (error) {
    logger.warn(
      `Seed de raças ignorado: banco indisponível, migration pendente ou falha ao gravar. ${error instanceof Error ? error.message : String(error)}`,
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
    await seedRacasAnimais(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
