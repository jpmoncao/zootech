import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PerfilAcesso, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../app.module";

loadLocalEnv(resolve(__dirname, "../../.env"));

const EMAIL_SUFFIX = "@baias-test.gov.br";
const SENHA = "senha-teste-123";
const STAMP = String(Date.now()).slice(-8);
const PERFIS: PerfilAcesso[] = ["coordenacao", "veterinario", "agente", "recepcao"];
const PERFIS_SEM_COORDENACAO: PerfilAcesso[] = ["veterinario", "agente", "recepcao"];

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

describe("baias authorization", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let seq = 0;
  const usuarios = new Map<PerfilAcesso, { id: number; cpf: string }>();
  const tokens = new Map<PerfilAcesso, string>();

  beforeAll(async () => {
    await assertDatabaseReachable();
    process.env.JWT_SECRET ??= "test-only-jwt-secret";

    prisma = new PrismaClient();
    await cleanup(prisma);

    for (const perfil of PERFIS) {
      usuarios.set(perfil, await createUsuario(prisma, perfil));
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    for (const perfil of PERFIS) {
      tokens.set(perfil, await tokenDe(usuarios.get(perfil)!.cpf));
    }
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) {
      await cleanup(prisma);
      await prisma.$disconnect();
    }
  });

  it("exige autenticação para consultar baias", async () => {
    await request(app.getHttpServer()).get("/baias").expect(401);
  });

  it("permite que todos os perfis autenticados consultem lista e detalhe", async () => {
    const baia = await criarBaiaComoCoordenacao();

    for (const perfil of PERFIS) {
      await request(app.getHttpServer())
        .get("/baias")
        .set(auth(tokens.get(perfil)!))
        .expect(200);

      await request(app.getHttpServer())
        .get(`/baias/${baia.id}`)
        .set(auth(tokens.get(perfil)!))
        .expect(200);
    }
  });

  it("permite que coordenação administre baias e consulte histórico", async () => {
    const token = tokens.get("coordenacao")!;
    const criada = await request(app.getHttpServer())
      .post("/baias")
      .set(auth(token))
      .send(nextBaia("COORD"))
      .expect(201);

    const editada = await request(app.getHttpServer())
      .patch(`/baias/${criada.body.id}`)
      .set(auth(token))
      .send({ capacidade: 3, possuiSolario: true })
      .expect(200);

    expect(editada.body.capacidade).toBe(3);
    expect(editada.body.possuiSolario).toBe(true);

    const interditada = await request(app.getHttpServer())
      .post(`/baias/${criada.body.id}/acoes/interditar`)
      .set(auth(token))
      .send({ observacao: "Validação RBAC" })
      .expect(201);

    expect(interditada.body.estado).toBe("interditada");

    const historico = await request(app.getHttpServer())
      .get(`/baias/${criada.body.id}/historico`)
      .set(auth(token))
      .expect(200);

    expect(historico.body.map((evento: { tipo: string }) => evento.tipo)).toEqual(
      expect.arrayContaining(["baia_criada", "baia_editada", "baia_interditar"]),
    );
  });

  it("recusa código duplicado sem diferenciar caixa ou espaços", async () => {
    const token = tokens.get("coordenacao")!;
    const codigo = `AUT-${STAMP}-DUP`;

    await request(app.getHttpServer())
      .post("/baias")
      .set(auth(token))
      .send({ ...nextBaia("DUP-A"), codigo })
      .expect(201);

    await request(app.getHttpServer())
      .post("/baias")
      .set(auth(token))
      .send({ ...nextBaia("DUP-B"), codigo: `  ${codigo.toLocaleLowerCase("pt-BR")}  ` })
      .expect(409);
  });

  it("valida capacidade mínima e capacidade de baia individual", async () => {
    const token = tokens.get("coordenacao")!;

    await request(app.getHttpServer())
      .post("/baias")
      .set(auth(token))
      .send({ ...nextBaia("CAP-ZERO"), capacidade: 0 })
      .expect(400);

    await request(app.getHttpServer())
      .post("/baias")
      .set(auth(token))
      .send({ ...nextBaia("CAP-IND"), tipo: "individual", capacidade: 2 })
      .expect(400);
  });

  it("filtra lista por setor, estado e busca por código", async () => {
    const token = tokens.get("coordenacao")!;
    const canil = await request(app.getHttpServer())
      .post("/baias")
      .set(auth(token))
      .send({ ...nextBaia("FILT-CANIL"), codigo: `AUT-${STAMP}-CANIL-A`, setor: "canil" })
      .expect(201);
    const gatil = await request(app.getHttpServer())
      .post("/baias")
      .set(auth(token))
      .send({ ...nextBaia("FILT-GATIL"), codigo: `AUT-${STAMP}-GATIL-B`, setor: "gatil" })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/baias/${gatil.body.id}/acoes/interditar`)
      .set(auth(token))
      .send({})
      .expect(201);

    const porSetor = await request(app.getHttpServer())
      .get("/baias")
      .query({ setor: "gatil", busca: `${STAMP}-GATIL` })
      .set(auth(token))
      .expect(200);

    expect(porSetor.body.map((baia: { id: number }) => baia.id)).toEqual([gatil.body.id]);

    const porEstado = await request(app.getHttpServer())
      .get("/baias")
      .query({ estado: "ativa", busca: `${STAMP}-CANIL` })
      .set(auth(token))
      .expect(200);

    expect(porEstado.body.map((baia: { id: number }) => baia.id)).toEqual([canil.body.id]);
  });

  it("registra fluxo de higienização com atualização de data e histórico", async () => {
    const token = tokens.get("coordenacao")!;
    const criada = await request(app.getHttpServer())
      .post("/baias")
      .set(auth(token))
      .send(nextBaia("HIG"))
      .expect(201);

    const iniciada = await request(app.getHttpServer())
      .post(`/baias/${criada.body.id}/acoes/iniciar_higienizacao`)
      .set(auth(token))
      .send({ observacao: "Lavagem" })
      .expect(201);

    expect(iniciada.body.estado).toBe("em_higienizacao");
    expect(iniciada.body.ultimaHigienizacaoEm).toBeNull();

    await request(app.getHttpServer())
      .post(`/baias/${criada.body.id}/acoes/interditar`)
      .set(auth(token))
      .send({})
      .expect(409);

    const concluida = await request(app.getHttpServer())
      .post(`/baias/${criada.body.id}/acoes/concluir_higienizacao`)
      .set(auth(token))
      .send({ observacao: "Seca" })
      .expect(201);

    expect(concluida.body.estado).toBe("ativa");
    expect(typeof concluida.body.ultimaHigienizacaoEm).toBe("string");

    const historico = await request(app.getHttpServer())
      .get(`/baias/${criada.body.id}/historico`)
      .set(auth(token))
      .expect(200);

    expect(historico.body.map((evento: { tipo: string }) => evento.tipo)).toEqual(
      expect.arrayContaining(["baia_iniciar_higienizacao", "baia_higienizacao_concluida"]),
    );
  });

  it("mostra ocupação real e bloqueia capacidade/ações incompatíveis em baia ocupada", async () => {
    const token = tokens.get("coordenacao")!;
    const baia = await criarBaiaComoCoordenacao();
    const animal = await prisma.animal.create({
      data: {
        nome: `Ocupante ${STAMP}`,
        numeroRegistro: `BAIAS-${STAMP}-${seq}`,
        numeroRegistroNormalizado: `baias-${STAMP}-${seq}`,
        especie: "cao",
        sexo: "nao_informado",
        baiaId: baia.id,
      },
    });
    await prisma.animal.create({
      data: {
        nome: `Ocupante Extra ${STAMP}`,
        numeroRegistro: `BAIAS-${STAMP}-${seq}-extra`,
        numeroRegistroNormalizado: `baias-${STAMP}-${seq}-extra`,
        especie: "cao",
        sexo: "nao_informado",
        baiaId: baia.id,
      },
    });

    const detalhe = await request(app.getHttpServer())
      .get(`/baias/${baia.id}`)
      .set(auth(token))
      .expect(200);

    expect(detalhe.body.ocupacao).toBe(2);
    expect(detalhe.body.vagasDisponiveis).toBe(0);
    expect(detalhe.body.ocupantes.map((ocupante: { id: number }) => ocupante.id)).toContain(animal.id);

    await request(app.getHttpServer())
      .patch(`/baias/${baia.id}`)
      .set(auth(token))
      .send({ tipo: "individual", capacidade: 1 })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/baias/${baia.id}`)
      .set(auth(token))
      .send({ exclusivaIsolamento: true })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/baias/${baia.id}/acoes/interditar`)
      .set(auth(token))
      .send({})
      .expect(409);
    await request(app.getHttpServer())
      .post(`/baias/${baia.id}/acoes/iniciar_higienizacao`)
      .set(auth(token))
      .send({})
      .expect(409);
    await request(app.getHttpServer())
      .post(`/baias/${baia.id}/acoes/inativar`)
      .set(auth(token))
      .send({})
      .expect(409);
  });

  it("nega CRUD, ações operacionais e auditoria para perfis sem coordenação", async () => {
    const baia = await criarBaiaComoCoordenacao();

    for (const perfil of PERFIS_SEM_COORDENACAO) {
      const token = tokens.get(perfil)!;

      await request(app.getHttpServer())
        .post("/baias")
        .set(auth(token))
        .send(nextBaia(`NEG-${perfil}`))
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/baias/${baia.id}`)
        .set(auth(token))
        .send({ capacidade: 4 })
        .expect(403);

      await request(app.getHttpServer())
        .post(`/baias/${baia.id}/acoes/interditar`)
        .set(auth(token))
        .send({ observacao: "Tentativa negada" })
        .expect(403);

      await request(app.getHttpServer())
        .get(`/baias/${baia.id}/historico`)
        .set(auth(token))
        .expect(403);
    }
  });

  async function criarBaiaComoCoordenacao() {
    const response = await request(app.getHttpServer())
      .post("/baias")
      .set(auth(tokens.get("coordenacao")!))
      .send(nextBaia("BASE"))
      .expect(201);
    return response.body as { id: number };
  }

  function nextBaia(prefix: string) {
    seq += 1;
    return {
      codigo: `AUT-${STAMP}-${prefix}-${seq}`,
      setor: "canil",
      tipo: "coletiva",
      capacidade: 2,
      possuiSolario: false,
      exclusivaIsolamento: false,
    };
  }

  async function tokenDe(cpf: string) {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ identificador: cpf, senha: SENHA })
      .expect(200);
    return response.body.accessToken as string;
  }
});

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function assertDatabaseReachable() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL não está definido. Suba o Postgres com `docker compose up -d`, aplique as migrações e exporte a URL (veja apps/api/.env.example).",
    );
  }

  const probe = new PrismaClient();
  try {
    await probe.$queryRaw`SELECT 1`;
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Não foi possível alcançar o Postgres em DATABASE_URL. Suba o banco com \`docker compose up -d\` e aplique as migrações. Causa: ${cause}`,
    );
  } finally {
    await probe.$disconnect();
  }
}

async function createUsuario(prisma: PrismaClient, perfil: PerfilAcesso) {
  const senhaHash = await bcrypt.hash(SENHA, 10);
  const index = PERFIS.indexOf(perfil) + 1;
  const cpf = `6${STAMP}${String(index).padStart(2, "0")}`.slice(0, 11);
  const usuario = await prisma.usuario.create({
    data: {
      nome: `Usuário Baias ${perfil}`,
      email: `${perfil}-${STAMP}${EMAIL_SUFFIX}`,
      senhaHash,
      cpf,
      perfilAcesso: perfil,
      ativo: true,
      funcionario: {
        create: {
          matricula: `B${STAMP.slice(0, 5)}${index}`,
          cargo: perfil,
          crmv: perfil === "veterinario" || perfil === "coordenacao" ? "12345" : null,
        },
      },
    },
  });
  return { id: usuario.id, cpf };
}

async function cleanup(prisma: PrismaClient) {
  const usuarios = await prisma.usuario.findMany({
    where: { email: { endsWith: EMAIL_SUFFIX } },
    select: { id: true },
  });
  const ids = usuarios.map((usuario) => usuario.id);

  if (ids.length > 0) {
    await prisma.auditoriaEvento.deleteMany({
      where: { usuarioId: { in: ids } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
  }

  await prisma.animal.deleteMany({
    where: { numeroRegistroNormalizado: { startsWith: `baias-${STAMP}` } },
  });

  await prisma.baia.deleteMany({
    where: { codigoNormalizado: { startsWith: `AUT-${STAMP}` } },
  });
}
