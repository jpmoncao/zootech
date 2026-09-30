import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PerfilAcesso, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../app.module";

loadLocalEnv(resolve(__dirname, "../../.env"));

const EMAIL_SUFFIX = "@vacinas-test.gov.br";
const SENHA = "senha-teste-123";
const STAMP = String(Date.now()).slice(-8);
const PERFIS: PerfilAcesso[] = ["coordenacao", "veterinario", "agente", "recepcao"];
const NAO_COORDENACAO: PerfilAcesso[] = ["veterinario", "agente", "recepcao"];

function loadLocalEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

describe("vacinas (catálogo)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let seq = 0;
  const usuarios = new Map<PerfilAcesso, { id: number; cpf: string }>();
  const tokens = new Map<PerfilAcesso, string>();

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está definido.");
    process.env.JWT_SECRET ??= "test-only-jwt-secret";
    prisma = new PrismaClient();
    await cleanup(prisma);

    for (const perfil of PERFIS) usuarios.set(perfil, await createUsuario(prisma, perfil));

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    for (const perfil of PERFIS) tokens.set(perfil, await tokenDe(usuarios.get(perfil)!.cpf));
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) {
      await cleanup(prisma);
      await prisma.$disconnect();
    }
  });

  it("exige autenticação em todas as rotas e não expõe exclusão", async () => {
    const http = request(app.getHttpServer());
    await http.get("/vacinas").expect(401);
    await http.get("/vacinas/1").expect(401);
    await http.post("/vacinas").send(payload()).expect(401);
    await http.patch("/vacinas/1").send({}).expect(401);
    await http.post("/vacinas/1/inativar").expect(401);
    await http.post("/vacinas/1/reativar").expect(401);

    const vacina = await criar(payload());
    await request(app.getHttpServer()).delete(`/vacinas/${vacina.id}`).set(auth("coordenacao")).expect(404);
    await request(app.getHttpServer()).get(`/vacinas/${vacina.id}`).set(auth("coordenacao")).expect(200);
  });

  it("libera a consulta aos quatro perfis e restringe a escrita à Coordenação", async () => {
    const vacina = await criar(payload());

    for (const perfil of PERFIS) {
      await request(app.getHttpServer()).get("/vacinas").set(auth(perfil)).expect(200);
      await request(app.getHttpServer()).get(`/vacinas/${vacina.id}`).set(auth(perfil)).expect(200);
    }

    for (const perfil of NAO_COORDENACAO) {
      await request(app.getHttpServer()).post("/vacinas").set(auth(perfil)).send(payload()).expect(403);
      await request(app.getHttpServer()).patch(`/vacinas/${vacina.id}`).set(auth(perfil)).send({ obrigatoria: true }).expect(403);
      await request(app.getHttpServer()).post(`/vacinas/${vacina.id}/inativar`).set(auth(perfil)).expect(403);
      await request(app.getHttpServer()).post(`/vacinas/${vacina.id}/reativar`).set(auth(perfil)).expect(403);
    }

    const intacta = await prisma.vacina.findUniqueOrThrow({ where: { id: vacina.id } });
    expect(intacta.obrigatoria).toBe(false);
    expect(intacta.ativa).toBe(true);
  });

  it("cria com nome normalizado, padrão de aviso em 7 dias e auditoria administrativa", async () => {
    const nome = `  Polivalente   Ação ${STAMP}-${++seq}  `;
    const vacina = await criar(payload({ nome, diasAvisoProximaDose: undefined }));

    expect(vacina.nome).toBe(nome.trim().replace(/\s+/g, " "));
    expect(vacina.nomeNormalizado).toBe(vacina.nome.toLocaleLowerCase("pt-BR"));
    expect(vacina.diasAvisoProximaDose).toBe(7);
    expect(vacina.ativa).toBe(true);
    expect(vacina.especies).toEqual(["cao"]);

    const auditoria = await prisma.auditoriaEvento.findMany({
      where: { usuarioId: usuarios.get("coordenacao")!.id, tipo: "vacina_criada" },
    });
    const registro = auditoria.find((evento) => (evento.dados as { entidadeId?: string }).entidadeId === String(vacina.id));
    expect(registro).toBeDefined();
    expect((registro!.dados as { entidade: string }).entidade).toBe("vacina");
  });

  it("recusa nome duplicado depois da normalização (caixa, espaços e acentuação equivalente)", async () => {
    const base = `Antirrábica Teste ${STAMP}-${++seq}`;
    await criar(payload({ nome: base }));

    for (const variante of [base.toUpperCase(), `  ${base.replace(/ /g, "   ")}  `, base.toLocaleLowerCase("pt-BR")]) {
      await request(app.getHttpServer())
        .post("/vacinas")
        .set(auth("coordenacao"))
        .send(payload({ nome: variante }))
        .expect(409);
    }
  });

  it("valida espécie, doses, intervalo e janela de aviso", async () => {
    const invalidos: Record<string, unknown>[] = [
      { nome: "   " },
      { especies: [] },
      { especies: ["cavalo"] },
      { especies: ["cao", "cao"] },
      { totalDoses: 0 },
      { totalDoses: 3, intervaloDosesDias: undefined },
      { totalDoses: 3, intervaloDosesDias: null },
      { intervaloDosesDias: -1 },
      { revacinacaoDias: 0 },
      { diasAvisoProximaDose: -1 },
      { diasAvisoProximaDose: 366 },
    ];
    for (const parcial of invalidos) {
      await request(app.getHttpServer())
        .post("/vacinas")
        .set(auth("coordenacao"))
        .send(payload(parcial))
        .expect(400);
    }

    const unica = await criar(payload({ totalDoses: 1, intervaloDosesDias: undefined, diasAvisoProximaDose: 0 }));
    expect(unica.totalDoses).toBe(1);
    expect(unica.intervaloDosesDias).toBeNull();
    expect(unica.diasAvisoProximaDose).toBe(0);
  });

  it("edita, avisa quantos protocolos seguem com o esquema anterior e valida o estado resultante", async () => {
    const vacina = await criar(payload({ totalDoses: 3, intervaloDosesDias: 21 }));
    const animal = await prisma.animal.create({
      data: {
        nome: "Animal Vacina",
        numeroRegistro: `VAC-${STAMP}-${++seq}`,
        numeroRegistroNormalizado: `vac-${STAMP}-${seq}`,
        especie: "cao",
      },
    });
    await prisma.protocoloVacinal.create({
      data: { animalId: animal.id, vacinaId: vacina.id, dosesPrevistas: 3, intervaloDosesDias: 21 },
    });

    const trocaEsquema = await request(app.getHttpServer())
      .patch(`/vacinas/${vacina.id}`)
      .set(auth("coordenacao"))
      .send({ totalDoses: 4 })
      .expect(200);
    expect(trocaEsquema.body.totalDoses).toBe(4);
    expect(trocaEsquema.body.protocolosComEsquemaAnterior).toBe(1);

    const semEsquema = await request(app.getHttpServer())
      .patch(`/vacinas/${vacina.id}`)
      .set(auth("coordenacao"))
      .send({ diasAvisoProximaDose: 15, obrigatoria: true })
      .expect(200);
    expect(semEsquema.body.protocolosComEsquemaAnterior).toBe(0);
    expect(semEsquema.body.diasAvisoProximaDose).toBe(15);

    const protocolo = await prisma.protocoloVacinal.findFirstOrThrow({ where: { vacinaId: vacina.id } });
    expect(protocolo.dosesPrevistas).toBe(3);

    const unica = await criar(payload({ totalDoses: 1, intervaloDosesDias: undefined }));
    await request(app.getHttpServer())
      .patch(`/vacinas/${unica.id}`)
      .set(auth("coordenacao"))
      .send({ totalDoses: 3 })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/vacinas/${vacina.id}`)
      .set(auth("coordenacao"))
      .send({ intervaloDosesDias: null })
      .expect(400);
    await request(app.getHttpServer()).patch("/vacinas/999999999").set(auth("coordenacao")).send({}).expect(404);

    const auditoria = await prisma.auditoriaEvento.findMany({ where: { tipo: "vacina_editada" } });
    const registro = auditoria.find((evento) => (evento.dados as { entidadeId?: string }).entidadeId === String(vacina.id));
    expect(registro).toBeDefined();
  });

  it("não deixa o cliente definir o nome normalizado nem o estado por edição", async () => {
    const vacina = await criar(payload());
    await request(app.getHttpServer())
      .patch(`/vacinas/${vacina.id}`)
      .set(auth("coordenacao"))
      .send({ nomeNormalizado: "forjado", ativa: false })
      .expect(200);
    const depois = await prisma.vacina.findUniqueOrThrow({ where: { id: vacina.id } });
    expect(depois.nomeNormalizado).toBe(vacina.nomeNormalizado);
    expect(depois.ativa).toBe(true);
  });

  it("inativa e reativa, mantém a vacina inativa no catálogo e a tira da seleção ativa", async () => {
    const vacina = await criar(payload({ nome: `Inativável ${STAMP}-${++seq}` }));

    await request(app.getHttpServer()).post(`/vacinas/${vacina.id}/reativar`).set(auth("coordenacao")).expect(409);
    const inativada = await request(app.getHttpServer())
      .post(`/vacinas/${vacina.id}/inativar`)
      .set(auth("coordenacao"))
      .expect(201);
    expect(inativada.body.ativa).toBe(false);
    await request(app.getHttpServer()).post(`/vacinas/${vacina.id}/inativar`).set(auth("coordenacao")).expect(409);

    const todas = await request(app.getHttpServer()).get("/vacinas").set(auth("agente")).expect(200);
    expect(todas.body.map((v: { id: number }) => v.id)).toContain(vacina.id);

    const ativas = await request(app.getHttpServer()).get("/vacinas?ativa=true").set(auth("agente")).expect(200);
    expect(ativas.body.map((v: { id: number }) => v.id)).not.toContain(vacina.id);

    const inativas = await request(app.getHttpServer()).get("/vacinas?ativa=false").set(auth("agente")).expect(200);
    expect(inativas.body.map((v: { id: number }) => v.id)).toContain(vacina.id);

    const reativada = await request(app.getHttpServer())
      .post(`/vacinas/${vacina.id}/reativar`)
      .set(auth("coordenacao"))
      .expect(201);
    expect(reativada.body.ativa).toBe(true);
  });

  it("filtra por espécie e por busca normalizada", async () => {
    const gato = await criar(payload({ nome: `Felina Exclusiva ${STAMP}-${++seq}`, especies: ["gato"] }));
    const ambas = await criar(payload({ nome: `Mista ${STAMP}-${++seq}`, especies: ["cao", "gato"] }));

    const gatos = await request(app.getHttpServer()).get("/vacinas?especie=gato").set(auth("recepcao")).expect(200);
    const idsGato = gatos.body.map((v: { id: number }) => v.id);
    expect(idsGato).toEqual(expect.arrayContaining([gato.id, ambas.id]));

    const caes = await request(app.getHttpServer()).get("/vacinas?especie=cao").set(auth("recepcao")).expect(200);
    expect(caes.body.map((v: { id: number }) => v.id)).not.toContain(gato.id);

    const busca = await request(app.getHttpServer())
      .get(`/vacinas?busca=${encodeURIComponent(`  FELINA exclusiva ${STAMP}`)}`)
      .set(auth("recepcao"))
      .expect(200);
    expect(busca.body.map((v: { id: number }) => v.id)).toEqual([gato.id]);

    await request(app.getHttpServer()).get("/vacinas?especie=cavalo").set(auth("recepcao")).expect(400);
    await request(app.getHttpServer()).get("/vacinas/999999999").set(auth("recepcao")).expect(404);
  });

  function payload(overrides: Record<string, unknown> = {}) {
    seq += 1;
    return {
      nome: `Vacina Teste ${STAMP}-${seq}`,
      especies: ["cao"],
      totalDoses: 3,
      intervaloDosesDias: 21,
      revacinacaoDias: 365,
      diasAvisoProximaDose: 7,
      ...overrides,
    };
  }

  async function criar(body: Record<string, unknown>) {
    const response = await request(app.getHttpServer())
      .post("/vacinas")
      .set(auth("coordenacao"))
      .send(body)
      .expect(201);
    return response.body as {
      id: number;
      nome: string;
      nomeNormalizado: string;
      especies: string[];
      totalDoses: number;
      intervaloDosesDias: number | null;
      diasAvisoProximaDose: number;
      ativa: boolean;
    };
  }

  function auth(perfil: PerfilAcesso) {
    return { Authorization: `Bearer ${tokens.get(perfil)!}` };
  }

  async function tokenDe(cpf: string) {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ identificador: cpf, senha: SENHA })
      .expect(200);
    return response.body.accessToken as string;
  }
});

async function createUsuario(prisma: PrismaClient, perfil: PerfilAcesso) {
  const senhaHash = await bcrypt.hash(SENHA, 10);
  const index = PERFIS.indexOf(perfil) + 1;
  const cpf = `5${STAMP}${String(index).padStart(2, "0")}`.slice(0, 11);
  const usuario = await prisma.usuario.create({
    data: {
      nome: `Usuário Vacinas ${perfil}`,
      email: `${perfil}-${STAMP}${EMAIL_SUFFIX}`,
      senhaHash,
      cpf,
      perfilAcesso: perfil,
      ativo: true,
      funcionario: {
        create: {
          matricula: `V${STAMP.slice(0, 5)}${index}`,
          cargo: perfil,
          crmv: perfil === "veterinario" || perfil === "coordenacao" ? "12345" : null,
        },
      },
    },
  });
  return { id: usuario.id, cpf };
}

async function cleanup(prisma: PrismaClient) {
  await prisma.animal.deleteMany({ where: { numeroRegistroNormalizado: { startsWith: `vac-${STAMP}` } } });
  await prisma.vacina.deleteMany({ where: { nomeNormalizado: { contains: STAMP } } });

  const usuarios = await prisma.usuario.findMany({
    where: { email: { endsWith: EMAIL_SUFFIX } },
    select: { id: true },
  });
  const ids = usuarios.map((usuario) => usuario.id);
  if (ids.length > 0) {
    await prisma.auditoriaEvento.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
  }
}
