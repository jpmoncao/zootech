import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PerfilAcesso, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { DashboardService } from "./dashboard.service";

loadLocalEnv(resolve(__dirname, "../../.env"));

function loadLocalEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

describe("DashboardService", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("separa ocupação irregular por causa e não a soma ao alojamento regular", async () => {
    const animalCount = jest.fn()
      .mockResolvedValueOnce(4) // ativos
      .mockResolvedValueOnce(2) // alojados em baia ativa
      .mockResolvedValueOnce(1) // disponíveis
      .mockResolvedValueOnce(1) // tratamento
      .mockResolvedValueOnce(1) // quarentena
      .mockResolvedValueOnce(1) // ativos em baia não ativa
      .mockResolvedValueOnce(1); // terminais alocados
    const prisma = {
      animal: { count: animalCount },
      castracaoAnimal: { count: jest.fn().mockResolvedValue(0) },
      baia: { findMany: jest.fn().mockResolvedValue([{ id: 10, codigo: "A-01", capacidade: 2, estado: "ativa", _count: { animais: 2 } }]) },
      adocao: { count: jest.fn().mockResolvedValue(0) },
    } as unknown as PrismaService;

    const result = await new DashboardService(prisma).obter();

    expect(result.plantel.animaisAtivos).toBe(4);
    expect(result.plantel.animaisAlojados).toBe(2);
    expect(result.ocupacao.baiasAtivas).toEqual([
      { baiaId: 10, codigo: "A-01", ocupantes: 2, capacidade: 2, estado: "ativa" },
    ]);
    expect(result.ocupacao.irregulares).toEqual({
      animalAtivoEmBaiaNaoAtiva: 1,
      animalTerminalAlocado: 1,
    });

    expect(animalCount.mock.calls[1][0].where).toEqual({
      situacao: { notIn: ["adotado", "obito"] },
      baia: { estado: "ativa" },
    });
    expect(animalCount.mock.calls[5][0].where).toEqual({
      situacao: { notIn: ["adotado", "obito"] },
      baia: { estado: { in: ["inativa", "interditada", "em_higienizacao"] } },
    });
    expect(animalCount.mock.calls[6][0].where).toEqual({
      situacao: { in: ["adotado", "obito"] },
      baiaId: { not: null },
    });
  });

  it("retorna zeros, lista vazia e vacinação como roadmap quando não há registros", async () => {
    const prisma = {
      animal: { count: jest.fn().mockResolvedValue(0) },
      castracaoAnimal: { count: jest.fn().mockResolvedValue(0) },
      baia: { findMany: jest.fn().mockResolvedValue([]) },
      adocao: { count: jest.fn().mockResolvedValue(0) },
    } as unknown as PrismaService;

    const result = await new DashboardService(prisma).obter();

    expect(result.plantel).toEqual({ animaisAtivos: 0, animaisAlojados: 0, disponiveisAdocao: 0 });
    expect(result.ocupacao.baiasAtivas).toEqual([]);
    expect(result.pendencias.vacinas).toEqual({ estado: "futura_implementacao", mensagem: "Vacinas pendentes — futura implementação." });
    expect(result.adocoes.variacaoPercentual).toBeNull();
  });

  it("calcula os meses no fuso local e usa limite superior exclusivo", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
    const adocaoCount = jest.fn()
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);
    const prisma = {
      animal: { count: jest.fn().mockResolvedValue(0) },
      castracaoAnimal: { count: jest.fn().mockResolvedValue(0) },
      baia: { findMany: jest.fn().mockResolvedValue([]) },
      adocao: { count: adocaoCount },
    } as unknown as PrismaService;

    const result = await new DashboardService(prisma).obter();

    expect(adocaoCount.mock.calls[0][0].where).toEqual({
      adotadaEm: {
        gte: new Date("2026-09-01T03:00:00.000Z"),
        lt: new Date("2026-10-01T03:00:00.000Z"),
      },
    });
    expect(adocaoCount.mock.calls[1][0].where).toEqual({
      adotadaEm: {
        gte: new Date("2026-08-01T03:00:00.000Z"),
        lt: new Date("2026-09-01T03:00:00.000Z"),
      },
    });
    expect(result.adocoes).toMatchObject({
      mesAtual: { total: 3 },
      mesAnterior: { total: 2 },
      variacaoAbsoluta: 1,
      variacaoPercentual: 50,
    });
  });

  it("atravessa a virada de ano e omite percentual sem base anterior", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
    const adocaoCount = jest.fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    const prisma = {
      animal: { count: jest.fn().mockResolvedValue(0) },
      castracaoAnimal: { count: jest.fn().mockResolvedValue(0) },
      baia: { findMany: jest.fn().mockResolvedValue([]) },
      adocao: { count: adocaoCount },
    } as unknown as PrismaService;

    const result = await new DashboardService(prisma).obter();

    expect(adocaoCount.mock.calls[0][0].where).toEqual({
      adotadaEm: {
        gte: new Date("2026-01-01T03:00:00.000Z"),
        lt: new Date("2026-02-01T03:00:00.000Z"),
      },
    });
    expect(adocaoCount.mock.calls[1][0].where).toEqual({
      adotadaEm: {
        gte: new Date("2025-12-01T03:00:00.000Z"),
        lt: new Date("2026-01-01T03:00:00.000Z"),
      },
    });
    expect(result.adocoes.variacaoAbsoluta).toBe(1);
    expect(result.adocoes.variacaoPercentual).toBeNull();
  });
});

describe("GET /dashboard", () => {
  type Snapshot = {
    plantel: { animaisAtivos: number; animaisAlojados: number; disponiveisAdocao: number };
    acompanhamentoClinico: { emTratamento: number; emQuarentena: number };
    pendencias: { castracoesAgendadas: number; vacinas: { estado: string } };
    ocupacao: {
      baiasAtivas: unknown[];
      irregulares: { animalAtivoEmBaiaNaoAtiva: number; animalTerminalAlocado: number };
    };
    adocoes: {
      mesAtual: { total: number };
      mesAnterior: { total: number };
      variacaoAbsoluta: number;
    };
  };
  const stamp = String(Date.now());
  const prefix = `DASH-${stamp}`;
  const emailSuffix = `@${stamp}.dashboard-test.gov.br`;
  const senha = "senha-dashboard-123";
  const perfis: PerfilAcesso[] = ["coordenacao", "veterinario", "agente", "recepcao"];
  let app: INestApplication;
  let prisma: PrismaClient;
  let sequence = 0;
  let baseline: Snapshot;
  const cpfs = new Map<PerfilAcesso, string>();
  const tokens = new Map<PerfilAcesso, string>();

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL não está definido para os testes integrados da dashboard.");
    }
    process.env.JWT_SECRET ??= "test-only-jwt-secret";
    prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;

    const usuarios = await Promise.all(perfis.map(async (perfil, index) => {
      const cpf = `${stamp.slice(-8)}${String(index + 1).padStart(3, "0")}`;
      const usuario = await prisma.usuario.create({
        data: {
          nome: `Dashboard ${perfil}`,
          email: `${perfil}${emailSuffix}`,
          cpf,
          senhaHash: await bcrypt.hash(senha, 10),
          perfilAcesso: perfil,
        },
      });
      cpfs.set(perfil, cpf);
      return usuario;
    }));

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    for (const perfil of perfis) {
      const login = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ identificador: cpfs.get(perfil), senha })
        .expect(200);
      tokens.set(perfil, login.body.accessToken);
    }

    baseline = (await request(app.getHttpServer())
      .get("/dashboard")
      .set(auth(tokens.get("coordenacao")!))
      .expect(200)).body;
    await criarCenario(usuarios[0].id);
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
    if (!prisma) return;
    const animais = await prisma.animal.findMany({ where: { numeroRegistroNormalizado: { startsWith: prefix.toLowerCase() } }, select: { id: true } });
    const animalIds = animais.map(({ id }) => id);
    const adocoes = await prisma.adocao.findMany({ where: { animalId: { in: animalIds } }, select: { id: true } });
    await prisma.devolucao.deleteMany({ where: { adocaoId: { in: adocoes.map(({ id }) => id) } } });
    await prisma.adocao.deleteMany({ where: { id: { in: adocoes.map(({ id }) => id) } } });
    await prisma.animal.deleteMany({ where: { id: { in: animalIds } } });
    await prisma.baia.deleteMany({ where: { codigoNormalizado: { startsWith: prefix } } });
    const usuarios = await prisma.usuario.findMany({ where: { email: { endsWith: emailSuffix } }, select: { id: true } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios.map(({ id }) => id) } } });
    await prisma.tutor.deleteMany({ where: { cpf: { startsWith: stamp.slice(-8) } } });
    await prisma.$disconnect();
  });

  it("exige autenticação e entrega as mesmas métricas aos quatro perfis", async () => {
    await request(app.getHttpServer()).get("/dashboard").expect(401);
    const respostas = await Promise.all(perfis.map((perfil) =>
      request(app.getHttpServer()).get("/dashboard").set(auth(tokens.get(perfil)!)).expect(200),
    ));

    for (const resposta of respostas) {
      expect(resposta.body.plantel).toEqual({
        animaisAtivos: baseline.plantel.animaisAtivos + 4,
        animaisAlojados: baseline.plantel.animaisAlojados + 1,
        disponiveisAdocao: baseline.plantel.disponiveisAdocao + 1,
      });
      expect(resposta.body.acompanhamentoClinico).toEqual({
        emTratamento: baseline.acompanhamentoClinico.emTratamento + 1,
        emQuarentena: baseline.acompanhamentoClinico.emQuarentena + 1,
      });
      expect(resposta.body.pendencias.castracoesAgendadas).toBe(baseline.pendencias.castracoesAgendadas + 1);
      expect(resposta.body.ocupacao.baiasAtivas).toHaveLength(baseline.ocupacao.baiasAtivas.length + 2);
      expect(resposta.body.ocupacao.baiasAtivas).toEqual(expect.arrayContaining([
        expect.objectContaining({ codigo: `${prefix}-ATIVA`, ocupantes: 1, capacidade: 2 }),
        expect.objectContaining({ codigo: `${prefix}-VAZIA`, ocupantes: 0, capacidade: 3 }),
      ]));
      expect(resposta.body.ocupacao.irregulares).toEqual({
        animalAtivoEmBaiaNaoAtiva: baseline.ocupacao.irregulares.animalAtivoEmBaiaNaoAtiva + 1,
        animalTerminalAlocado: baseline.ocupacao.irregulares.animalTerminalAlocado + 1,
      });
      expect(resposta.body.adocoes.mesAtual.total).toBe(baseline.adocoes.mesAtual.total + 2);
      expect(resposta.body.adocoes.mesAnterior.total).toBe(baseline.adocoes.mesAnterior.total + 1);
      expect(resposta.body.adocoes.variacaoAbsoluta).toBe(baseline.adocoes.variacaoAbsoluta + 1);
      expect(resposta.body.adocoes.variacaoPercentual).toBe(
        ((resposta.body.adocoes.mesAtual.total - resposta.body.adocoes.mesAnterior.total) / resposta.body.adocoes.mesAnterior.total) * 100,
      );
    }
    expect(respostas[0].body.plantel).toEqual(respostas[1].body.plantel);
    expect(respostas[0].body.pendencias.vacinas.estado).toBe("futura_implementacao");
  });

  async function criarCenario(usuarioId: number) {
    const baiaAtiva = await criarBaia("ATIVA", "ativa", 2);
    await criarBaia("VAZIA", "ativa", 3);
    const baiaIrregular = await criarBaia("INATIVA", "interditada", 2);
    const saudavel = await criarAnimal("SAUDAVEL", "saudavel", baiaAtiva.id);
    const tratamento = await criarAnimal("TRATAMENTO", "em_tratamento", null);
    const disponivel = await criarAnimal("DISPONIVEL", "saudavel", null);
    await criarAnimal("QUARENTENA", "em_quarentena_observacao", baiaIrregular.id);
    const adotado = await criarAnimal("ADOTADO", "adotado", null);
    await criarAnimal("OBITO", "obito", baiaIrregular.id);

    const castracaoBase = { usuarioId, dataHoraPlanejada: new Date() };
    await prisma.castracaoAnimal.create({ data: { animalId: saudavel.id, tipo: "procedimento", estado: "agendada", ...castracaoBase } });
    await prisma.castracaoAnimal.create({ data: { animalId: saudavel.id, tipo: "avaliacao", estado: "nao_castrado", dataAvaliacao: new Date(), usuarioId } });
    await prisma.castracaoAnimal.create({ data: { animalId: saudavel.id, tipo: "procedimento", estado: "cancelada", motivoCancelamento: "Teste", ...castracaoBase } });
    await prisma.castracaoAnimal.create({ data: { animalId: saudavel.id, tipo: "procedimento", estado: "realizada", dataEfetiva: new Date(), ...castracaoBase } });

    const tutor = await prisma.tutor.create({
      data: {
        nome: `Tutor ${stamp}`, cpf: `${stamp.slice(-8)}-1`, telefone: "11999999999", tipoDocumento: "RG", numeroDocumento: `${prefix}-RG`,
        cep: "01001000", logradouro: "Rua A", numero: "1", bairro: "Centro", cidade: "São Paulo", uf: "SP",
      },
    });
    const atual = inicioMes(0);
    const anterior = inicioMes(-1);
    const adocao = (animalId: number, adotadaEm: Date) => prisma.adocao.create({ data: {
      animalId, tutorId: tutor.id, consentiuTratamento: true, consentiuAcompanhamento: true,
      caminhoAssinatura: `${prefix}.webp`, nomeArquivoAssinatura: "assinatura.webp", mimeTypeAssinatura: "image/webp", tamanhoAssinatura: 1,
      adotadaEm, adotadaPorId: usuarioId,
    } });
    const devolvida = await adocao(adotado.id, new Date(atual.getTime() + 60 * 60 * 1000));
    await prisma.devolucao.create({ data: { adocaoId: devolvida.id, motivo: "Teste integrado", situacaoRetorno: "saudavel", recebidaPorId: usuarioId } });
    await adocao(saudavel.id, new Date(atual.getTime() + 2 * 60 * 60 * 1000));
    await adocao(tratamento.id, new Date(anterior.getTime() + 2 * 60 * 60 * 1000));
    expect(disponivel.situacao).toBe("saudavel");
  }

  async function criarAnimal(nome: string, situacao: "saudavel" | "em_tratamento" | "em_quarentena_observacao" | "adotado" | "obito", baiaId: number | null) {
    sequence += 1;
    return prisma.animal.create({ data: { nome, numeroRegistro: `${prefix}-${nome}-${sequence}`, numeroRegistroNormalizado: `${prefix}-${nome}-${sequence}`.toLowerCase(), especie: "cao", situacao, baiaId } });
  }

  async function criarBaia(codigo: string, estado: "ativa" | "interditada", capacidade: number) {
    return prisma.baia.create({ data: { codigo: `${prefix}-${codigo}`, codigoNormalizado: `${prefix}-${codigo}`, setor: "canil", tipo: "coletiva", capacidade, estado } });
  }

  function inicioMes(deslocamento: number) {
    const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
    const ano = Number(partes.find((parte) => parte.type === "year")!.value);
    const mes = Number(partes.find((parte) => parte.type === "month")!.value) - 1 + deslocamento;
    return new Date(Date.UTC(ano, mes, 1, 3));
  }
});

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}
