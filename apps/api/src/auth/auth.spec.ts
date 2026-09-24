import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient, type PerfilAcesso } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../app.module";

loadLocalEnv(resolve(__dirname, "../../.env"));

const EMAIL_SUFFIX = "@auth-test.gov.br";
const SENHA = "senha-teste-123";
const STAMP = String(Date.now()).slice(-8);

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

describe("auth", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let seq = 0;
  let coordA: { id: number; cpf: string };
  let coordB: { id: number; cpf: string };

  beforeAll(async () => {
    await assertDatabaseReachable();
    process.env.JWT_SECRET ??= "test-only-jwt-secret";

    prisma = new PrismaClient();
    await cleanup(prisma);

    coordA = await createCoordenacao(prisma, 1);
    coordB = await createCoordenacao(prisma, 2);

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
    await app.listen(0);
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) {
      await cleanup(prisma);
      await prisma.$disconnect();
    }
  });

  it("persiste o pedido sem token", async () => {
    const pessoa = nextPessoa("recepcao");
    const response = await request(app.getHttpServer())
      .post("/auth/solicitacoes")
      .send(pessoa);

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("pendente");
    expect(response.body.accessToken).toBeUndefined();
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("recusa o segundo pedido com o mesmo CPF", async () => {
    const pessoa = nextPessoa("agente");
    await request(app.getHttpServer()).post("/auth/solicitacoes").send(pessoa).expect(201);

    const response = await request(app.getHttpServer())
      .post("/auth/solicitacoes")
      .send({ ...nextPessoa("agente"), cpf: pessoa.cpf });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Já existe um cadastro com este CPF.");
  });

  it("não emite token para pedido pendente", async () => {
    const pessoa = nextPessoa("recepcao");
    await request(app.getHttpServer()).post("/auth/solicitacoes").send(pessoa).expect(201);

    const response = await request(app.getHttpServer()).post("/auth/login").send({
      identificador: pessoa.cpf,
      senha: SENHA,
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "Seu pedido ainda aguarda o aceite da coordenação.",
    );
    expect(response.body.accessToken).toBeUndefined();
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("responde 403 quando o papel não é coordenação", async () => {
    const tokenCoord = await tokenDe(coordA.cpf);
    const pessoa = nextPessoa("recepcao");
    const criado = await request(app.getHttpServer())
      .post("/auth/solicitacoes")
      .send(pessoa)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/auth/solicitacoes/${criado.body.id}/aceitar`)
      .set(auth(tokenCoord))
      .send({ perfilAcesso: "agente" })
      .expect(200);

    const tokenAgente = await tokenDe(pessoa.cpf);

    await request(app.getHttpServer())
      .get("/auth/solicitacoes")
      .set(auth(tokenAgente))
      .expect(403);

    await request(app.getHttpServer())
      .post(`/auth/solicitacoes/${criado.body.id}/aceitar`)
      .set(auth(tokenAgente))
      .send({ perfilAcesso: "agente" })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/auth/solicitacoes/${criado.body.id}/recusar`)
      .set(auth(tokenAgente))
      .send({})
      .expect(403);

    await request(app.getHttpServer())
      .get("/usuarios")
      .set(auth(tokenAgente))
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/usuarios/${coordA.id}/perfil`)
      .set(auth(tokenAgente))
      .send({ perfilAcesso: "agente" })
      .expect(403);
  });

  it("grava a função escolhida no aceite, não a pretendida", async () => {
    console.log("before", app.getHttpServer().address(), app.getHttpServer().listening);
    const tokenCoord = await tokenDe(coordA.cpf);
    const pessoa = nextPessoa("recepcao");
    const criado = await request(app.getHttpServer())
      .post("/auth/solicitacoes")
      .send(pessoa)
      .expect(201);

    const aceito = await request(app.getHttpServer())
      .post(`/auth/solicitacoes/${criado.body.id}/aceitar`)
      .set(auth(tokenCoord))
      .send({ perfilAcesso: "agente" });

    expect(aceito.status).toBe(200);
    expect(aceito.body.perfilAcesso).toBe("agente");

    const me = await request(app.getHttpServer())
      .get("/auth/me")
      .set(auth(await tokenDe(pessoa.cpf)))
      .expect(200);

    expect(me.body.perfilAcesso).toBe("agente");
  });

  it("não grava o aceite como veterinário sem CRMV", async () => {
    const tokenCoord = await tokenDe(coordA.cpf);
    const pessoa = nextPessoa("recepcao");
    const criado = await request(app.getHttpServer())
      .post("/auth/solicitacoes")
      .send(pessoa)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/auth/solicitacoes/${criado.body.id}/aceitar`)
      .set(auth(tokenCoord))
      .send({ perfilAcesso: "veterinario" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("CRMV deve ter pelo menos 4 dígitos.");

    const ainda = await prisma.solicitacao.findUnique({
      where: { id: criado.body.id },
    });
    expect(ainda?.status).toBe("pendente");
    const usuario = await prisma.usuario.findFirst({
      where: { cpf: pessoa.cpf },
    });
    expect(usuario).toBeNull();
  });

  it("troca o tipo e exige CRMV para veterinário", async () => {
    const tokenCoord = await tokenDe(coordA.cpf);
    const pessoa = nextPessoa("agente");
    const criado = await request(app.getHttpServer())
      .post("/auth/solicitacoes")
      .send(pessoa)
      .expect(201);

    const aceito = await request(app.getHttpServer())
      .post(`/auth/solicitacoes/${criado.body.id}/aceitar`)
      .set(auth(tokenCoord))
      .send({ perfilAcesso: "recepcao" })
      .expect(200);

    const semCrmv = await request(app.getHttpServer())
      .patch(`/usuarios/${aceito.body.id}/perfil`)
      .set(auth(tokenCoord))
      .send({ perfilAcesso: "veterinario" });

    expect(semCrmv.status).toBe(400);
    expect(semCrmv.body.message).toBe("CRMV deve ter pelo menos 4 dígitos.");

    const comCrmv = await request(app.getHttpServer())
      .patch(`/usuarios/${aceito.body.id}/perfil`)
      .set(auth(tokenCoord))
      .send({ perfilAcesso: "veterinario", crmv: "44556" });

    expect(comCrmv.status).toBe(200);
    expect(comCrmv.body.perfilAcesso).toBe("veterinario");
    expect(comCrmv.body.crmv).toBe("44556");
  });

  it("recusa a auto-troca quando existe outra coordenação", async () => {
    const token = await tokenDe(coordA.cpf);
    const response = await request(app.getHttpServer())
      .patch(`/usuarios/${coordA.id}/perfil`)
      .set(auth(token))
      .send({ perfilAcesso: "agente" });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "A coordenação não pode trocar o próprio tipo.",
    );

    const ainda = await prisma.usuario.findUnique({ where: { id: coordA.id } });
    expect(ainda?.perfilAcesso).toBe("coordenacao");
    const outra = await prisma.usuario.findUnique({ where: { id: coordB.id } });
    expect(outra?.perfilAcesso).toBe("coordenacao");
  });

  it("recusa rebaixar a última coordenação", async () => {
    const outras = await prisma.usuario.findMany({
      where: {
        ativo: true,
        perfilAcesso: "coordenacao",
        NOT: { id: coordA.id },
      },
      select: { id: true, perfilAcesso: true },
    });

    await prisma.usuario.updateMany({
      where: { id: { in: outras.map((item) => item.id) } },
      data: { perfilAcesso: "agente" },
    });

    try {
      const token = await tokenDe(coordA.cpf);
      const response = await request(app.getHttpServer())
        .patch(`/usuarios/${coordA.id}/perfil`)
        .set(auth(token))
        .send({ perfilAcesso: "agente" });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(
        "É preciso existir outra coordenação antes de rebaixar esta conta.",
      );

      const ainda = await prisma.usuario.findUnique({ where: { id: coordA.id } });
      expect(ainda?.perfilAcesso).toBe("coordenacao");
    } finally {
      for (const outra of outras) {
        await prisma.usuario.update({
          where: { id: outra.id },
          data: { perfilAcesso: outra.perfilAcesso },
        });
      }
    }
  });

  it("não altera a função pelo próprio perfil", async () => {
    const tokenCoord = await tokenDe(coordA.cpf);
    const pessoa = nextPessoa("recepcao");
    const criado = await request(app.getHttpServer())
      .post("/auth/solicitacoes")
      .send(pessoa)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/auth/solicitacoes/${criado.body.id}/aceitar`)
      .set(auth(tokenCoord))
      .send({ perfilAcesso: "recepcao" })
      .expect(200);

    const token = await tokenDe(pessoa.cpf);
    const response = await request(app.getHttpServer())
      .patch("/auth/me")
      .set(auth(token))
      .send({
        telefone: "11988887777",
        perfilAcesso: "coordenacao",
      });

    expect(response.status).toBe(200);
    expect(response.body.perfilAcesso).toBe("recepcao");
    expect(response.body.telefone).toBe("11988887777");

    const me = await request(app.getHttpServer())
      .get("/auth/me")
      .set(auth(token))
      .expect(200);
    expect(me.body.perfilAcesso).toBe("recepcao");
  });

  function nextPessoa(funcaoPretendida: PerfilAcesso) {
    seq += 1;
    const n = String(seq).padStart(2, "0");
    return {
      nome: `Pessoa Teste ${n}`,
      cpf: `9${STAMP}${n}`.slice(0, 11),
      matricula: `8${STAMP.slice(0, 4)}${n}`,
      email: `pessoa-${STAMP}-${n}${EMAIL_SUFFIX}`,
      funcaoPretendida,
      senha: SENHA,
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

async function createCoordenacao(prisma: PrismaClient, n: number) {
  const senhaHash = await bcrypt.hash(SENHA, 10);
  const cpf = `8${STAMP}${String(n).padStart(2, "0")}`.slice(0, 11);
  const usuario = await prisma.usuario.create({
    data: {
      nome: `Coordenação Teste ${n}`,
      email: `coord-${STAMP}-${n}${EMAIL_SUFFIX}`,
      senhaHash,
      cpf,
      perfilAcesso: "coordenacao",
      ativo: true,
      funcionario: {
        create: {
          matricula: `7${STAMP.slice(0, 4)}${n}`,
          cargo: "Coordenação",
          crmv: "12345",
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

  await prisma.solicitacao.deleteMany({
    where: {
      OR: [
        { email: { endsWith: EMAIL_SUFFIX } },
        ...(ids.length > 0 ? [{ decididoPorId: { in: ids } }] : []),
      ],
    },
  });

  if (ids.length === 0) return;

  await prisma.auditoriaEvento.deleteMany({
    where: { usuarioId: { in: ids } },
  });
  await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
}
