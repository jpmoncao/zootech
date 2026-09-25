import { existsSync, readFileSync } from "node:fs";
import { rm, stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PerfilAcesso, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import sharp from "sharp";
import request from "supertest";
import { AppModule } from "../app.module";

loadLocalEnv(resolve(__dirname, "../../.env"));

const EMAIL_SUFFIX = "@animais-test.gov.br";
const SENHA = "senha-teste-123";
const STAMP = String(Date.now()).slice(-8);
const MEDIA_ROOT = resolve(tmpdir(), `zootech-animais-${STAMP}`);
const PERFIS: PerfilAcesso[] = ["coordenacao", "veterinario", "agente", "recepcao"];

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

describe("animais", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let seq = 0;
  let racaCaoId: number;
  let racaGatoId: number;
  const usuarios = new Map<PerfilAcesso, { id: number; cpf: string }>();
  const tokens = new Map<PerfilAcesso, string>();

  beforeAll(async () => {
    await assertDatabaseReachable();
    process.env.JWT_SECRET ??= "test-only-jwt-secret";
    process.env.ZOOTECH_MEDIA_ROOT = MEDIA_ROOT;

    prisma = new PrismaClient();
    await cleanup(prisma);

    racaCaoId = (await prisma.racaAnimal.create({
      data: {
        especie: "cao",
        nome: `SRD Cao ${STAMP}`,
        nomeNormalizado: `srd cao ${STAMP}`,
        tipo: "srd",
        catalogoPadrao: false,
      },
    })).id;
    racaGatoId = (await prisma.racaAnimal.create({
      data: {
        especie: "gato",
        nome: `SRD Gato ${STAMP}`,
        nomeNormalizado: `srd gato ${STAMP}`,
        tipo: "srd",
        catalogoPadrao: false,
      },
    })).id;

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
    await rm(MEDIA_ROOT, { recursive: true, force: true });
  });

  it("exige autenticação e não expõe exclusão física", async () => {
    await request(app.getHttpServer()).get("/animais").expect(401);
    await request(app.getHttpServer()).post("/animais").send(nextAnimal()).expect(401);

    const animal = await criarAnimal(tokens.get("coordenacao")!);
    await request(app.getHttpServer())
      .delete(`/animais/${animal.id}`)
      .set(auth(tokens.get("coordenacao")!))
      .expect(404);

    await request(app.getHttpServer())
      .get(`/animais/${animal.id}`)
      .set(auth(tokens.get("coordenacao")!))
      .expect(200);
  });

  it("permite que os quatro perfis consultem, criem e editem animais operacionais", async () => {
    for (const perfil of PERFIS) {
      const token = tokens.get(perfil)!;
      const criado = await request(app.getHttpServer())
        .post("/animais")
        .set(auth(token))
        .send(nextAnimal({ nome: `Animal ${perfil}` }))
        .expect(201);

      expect(criado.body.criadoPorId).toBe(usuarios.get(perfil)!.id);
      expect(criado.body.alertas.map((alerta: { tipo: string }) => alerta.tipo)).toEqual(
        expect.arrayContaining(["sem_baia", "castracao_nao_informada"]),
      );

      await request(app.getHttpServer())
        .get("/animais")
        .set(auth(token))
        .expect(200);

      const editado = await request(app.getHttpServer())
        .patch(`/animais/${criado.body.id}`)
        .set(auth(token))
        .send({ corPelagem: `Caramelo ${perfil}`, castrado: "nao" })
        .expect(200);

      expect(editado.body.corPelagem).toBe(`Caramelo ${perfil}`);
      expect(editado.body.castrado).toBe("nao");
    }
  });

  it("recusa número de registro duplicado sem diferenciar caixa e espaços", async () => {
    const token = tokens.get("coordenacao")!;
    const numeroRegistro = `ANI-${STAMP}-DUP`;
    await request(app.getHttpServer())
      .post("/animais")
      .set(auth(token))
      .send(nextAnimal({ numeroRegistro }))
      .expect(201);

    await request(app.getHttpServer())
      .post("/animais")
      .set(auth(token))
      .send(nextAnimal({ numeroRegistro: `  ${numeroRegistro.toLocaleLowerCase("pt-BR")}  ` }))
      .expect(409);
  });

  it("valida espécie da raça e duplicidade normalizada na inclusão rápida", async () => {
    const token = tokens.get("coordenacao")!;

    await request(app.getHttpServer())
      .post("/animais")
      .set(auth(token))
      .send(nextAnimal({ especie: "cao", racaId: racaGatoId }))
      .expect(400);

    const nome = `Raça Única ${STAMP}`;
    await request(app.getHttpServer())
      .post("/animais/racas")
      .set(auth(token))
      .send({ especie: "cao", nome })
      .expect(201);

    await request(app.getHttpServer())
      .post("/animais/racas")
      .set(auth(token))
      .send({ especie: "cao", nome: `  ${nome.toLocaleLowerCase("pt-BR")}  ` })
      .expect(409);
  });

  it("cria animal mínimo, lista ocultando terminais por padrão e mostra detalhe", async () => {
    const token = tokens.get("agente")!;
    const criado = await request(app.getHttpServer())
      .post("/animais")
      .set(auth(token))
      .send({
        nome: `Mínimo ${STAMP}`,
        numeroRegistro: `ANI-${STAMP}-MIN`,
        especie: "cao",
        dataAcolhimento: "2026-09-20T12:00:00.000Z",
      })
      .expect(201);

    expect(criado.body.sexo).toBe("nao_informado");
    expect(criado.body.situacao).toBe("em_tratamento");
    expect(criado.body.racaId).toBeNull();

    const obito = await criarAnimal(token, { numeroRegistro: `ANI-${STAMP}-OBITO` });
    await request(app.getHttpServer())
      .patch(`/animais/${obito.id}`)
      .set(auth(token))
      .send({ situacao: "obito" })
      .expect(200);

    const listaPadrao = await request(app.getHttpServer())
      .get("/animais")
      .query({ busca: `ANI-${STAMP}` })
      .set(auth(token))
      .expect(200);

    expect(listaPadrao.body.items.map((animal: { id: number }) => animal.id)).not.toContain(obito.id);

    const listaComTerminais = await request(app.getHttpServer())
      .get("/animais")
      .query({ busca: `ANI-${STAMP}`, incluirTerminais: true })
      .set(auth(token))
      .expect(200);

    expect(listaComTerminais.body.items.map((animal: { id: number }) => animal.id)).toContain(obito.id);

    await request(app.getHttpServer())
      .get(`/animais/${criado.body.id}`)
      .set(auth(token))
      .expect(200);
  });

  it("grava observações, pesagens, eventos e timeline com autoria sem sobrescrever pesagens", async () => {
    const token = tokens.get("veterinario")!;
    const userId = usuarios.get("veterinario")!.id;
    const animal = await criarAnimal(token);

    const obs = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/observacoes`)
      .set(auth(token))
      .send({ texto: "Animal alerta durante manejo." })
      .expect(201);

    expect(obs.body.usuarioId).toBe(userId);

    await request(app.getHttpServer())
      .patch(`/animais/${animal.id}/observacoes/${obs.body.id}`)
      .set(auth(token))
      .send({ texto: "Tentativa de edição" })
      .expect(404);

    const primeira = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/pesagens`)
      .set(auth(token))
      .send({ valorKg: 8.25, observacao: "Entrada" })
      .expect(201);
    const segunda = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/pesagens`)
      .set(auth(token))
      .send({ valorKg: 8.9 })
      .expect(201);

    expect(primeira.body.valorKg).toBe("8.25");
    expect(segunda.body.valorKg).toBe("8.9");

    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/eventos`)
      .set(auth(token))
      .send({ tipo: "exame", resumo: "Exame clínico inicial", dados: { resultado: "sem alterações" } })
      .expect(201);

    const detalhe = await request(app.getHttpServer())
      .get(`/animais/${animal.id}`)
      .set(auth(token))
      .expect(200);

    expect(detalhe.body.pesoAtualKg).toBe("8.9");
    expect(detalhe.body.pesagens.map((pesagem: { id: number }) => pesagem.id)).toEqual(
      expect.arrayContaining([primeira.body.id, segunda.body.id]),
    );
    expect(detalhe.body.observacoes.map((observacao: { id: number }) => observacao.id)).toContain(obs.body.id);

    const timeline = await request(app.getHttpServer())
      .get(`/animais/${animal.id}/timeline`)
      .set(auth(token))
      .expect(200);

    expect(timeline.body.map((evento: { tipo: string }) => evento.tipo)).toEqual(
      expect.arrayContaining(["criacao", "observacao", "pesagem", "exame"]),
    );
    expect(timeline.body[0].id).toBeGreaterThan(timeline.body[timeline.body.length - 1].id);

    const auditoria = await prisma.auditoriaEvento.findMany({
      where: {
        dados: { path: ["entidadeId"], equals: String(animal.id) },
        usuarioId: userId,
      },
    });
    expect(auditoria.map((evento) => evento.tipo)).toEqual(
      expect.arrayContaining(["animal_observacao_registrada", "animal_pesagem_registrada", "animal_exame_registrado"]),
    );
  });

  it("bloqueia mutações em situação terminal e permite revogação auditada só para coordenação", async () => {
    const tokenCoord = tokens.get("coordenacao")!;
    const tokenAgente = tokens.get("agente")!;
    const animal = await criarAnimal(tokenCoord);

    const obito = await request(app.getHttpServer())
      .patch(`/animais/${animal.id}`)
      .set(auth(tokenCoord))
      .send({ situacao: "obito" })
      .expect(200);

    expect(obito.body.somenteLeitura).toBe(true);

    await request(app.getHttpServer())
      .patch(`/animais/${animal.id}`)
      .set(auth(tokenCoord))
      .send({ nome: "Não deve alterar" })
      .expect(409);
    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/observacoes`)
      .set(auth(tokenCoord))
      .send({ texto: "Não deve gravar" })
      .expect(409);
    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/pesagens`)
      .set(auth(tokenCoord))
      .send({ valorKg: 10 })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/revogar-situacao`)
      .set(auth(tokenAgente))
      .send({ situacao: "saudavel", motivo: "Correção de lançamento" })
      .expect(403);

    const revogado = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/revogar-situacao`)
      .set(auth(tokenCoord))
      .send({ situacao: "saudavel", motivo: "Correção de lançamento" })
      .expect(201);

    expect(revogado.body.situacao).toBe("saudavel");
    expect(revogado.body.somenteLeitura).toBe(false);

    const auditoria = await prisma.auditoriaEvento.findFirst({
      where: {
        tipo: "animal_situacao_terminal_revogada",
        dados: { path: ["entidadeId"], equals: String(animal.id) },
      },
    });
    expect(auditoria).not.toBeNull();
  });

  it("aloca, transfere e retira animal atualizando ocupantes reais das baias", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token);
    const origem = await criarBaia("ALOCA-ORIGEM", { capacidade: 2 });
    const destino = await criarBaia("ALOCA-DESTINO", { capacidade: 2 });

    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/alocacao`)
      .set(auth(token))
      .send({})
      .expect(400);

    const alocado = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/alocacao`)
      .set(auth(token))
      .send({ baiaId: origem.id, observacao: "Entrada na baia" })
      .expect(201);

    expect(alocado.body.baiaId).toBe(origem.id);
    expect(alocado.body.alertas.map((alerta: { tipo: string }) => alerta.tipo)).not.toContain("sem_baia");

    const baiaOrigem = await request(app.getHttpServer())
      .get(`/baias/${origem.id}`)
      .set(auth(token))
      .expect(200);

    expect(baiaOrigem.body.ocupacao).toBe(1);
    expect(baiaOrigem.body.vagasDisponiveis).toBe(1);
    expect(baiaOrigem.body.ocupantes.map((ocupante: { id: number }) => ocupante.id)).toContain(animal.id);

    const transferido = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/alocacao`)
      .set(auth(token))
      .send({ baiaId: destino.id })
      .expect(201);

    expect(transferido.body.baiaId).toBe(destino.id);

    const origemVazia = await request(app.getHttpServer())
      .get(`/baias/${origem.id}`)
      .set(auth(token))
      .expect(200);

    expect(origemVazia.body.ocupacao).toBe(0);

    const retirado = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/alocacao`)
      .set(auth(token))
      .send({ baiaId: null })
      .expect(201);

    expect(retirado.body.baiaId).toBeNull();
    expect(retirado.body.alertas.map((alerta: { tipo: string }) => alerta.tipo)).toContain("sem_baia");

    const timeline = await request(app.getHttpServer())
      .get(`/animais/${animal.id}/timeline`)
      .set(auth(token))
      .expect(200);

    expect(timeline.body.filter((evento: { tipo: string }) => evento.tipo === "mudanca_baia")).toHaveLength(3);
  });

  it("recusa alocação em baia cheia, indisponível ou incompatível com isolamento", async () => {
    const token = tokens.get("coordenacao")!;
    const primeiro = await criarAnimal(token);
    const segundo = await criarAnimal(token);
    const baiaCheia = await criarBaia("CHEIA", { capacidade: 1 });
    const inativa = await criarBaia("INATIVA", { estado: "inativa" });
    const exclusiva = await criarBaia("ISOLAMENTO", { exclusivaIsolamento: true });

    await request(app.getHttpServer())
      .post(`/animais/${primeiro.id}/alocacao`)
      .set(auth(token))
      .send({ baiaId: baiaCheia.id })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/animais/${segundo.id}/alocacao`)
      .set(auth(token))
      .send({ baiaId: baiaCheia.id })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/animais/${segundo.id}/alocacao`)
      .set(auth(token))
      .send({ baiaId: inativa.id })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/animais/${segundo.id}/alocacao`)
      .set(auth(token))
      .send({ baiaId: exclusiva.id })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/animais/${segundo.id}`)
      .set(auth(token))
      .send({ emIsolamento: true })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/animais/${segundo.id}/alocacao`)
      .set(auth(token))
      .send({ baiaId: exclusiva.id })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/animais/${segundo.id}`)
      .set(auth(token))
      .send({ emIsolamento: false })
      .expect(409);
  });

  it("serializa disputa pela última vaga da baia", async () => {
    const token = tokens.get("coordenacao")!;
    const um = await criarAnimal(token);
    const dois = await criarAnimal(token);
    const baia = await criarBaia("CONCORRENCIA", { capacidade: 1 });

    const respostas = await Promise.all([
      request(app.getHttpServer()).post(`/animais/${um.id}/alocacao`).set(auth(token)).send({ baiaId: baia.id }),
      request(app.getHttpServer()).post(`/animais/${dois.id}/alocacao`).set(auth(token)).send({ baiaId: baia.id }),
    ]);

    expect(respostas.map((response) => response.status).sort()).toEqual([201, 409]);

    const detalhe = await request(app.getHttpServer())
      .get(`/baias/${baia.id}`)
      .set(auth(token))
      .expect(200);

    expect(detalhe.body.ocupacao).toBe(1);
    expect(detalhe.body.ocupantes).toHaveLength(1);
  });

  it("processa upload autenticado de fotos, comprime quadrado e serve por rota controlada", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token);
    const jpeg = await imagemTeste("jpeg", 1600, 1600);
    const grande = await imagemGrandePng();

    const foto = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/fotos`)
      .set(auth(token))
      .attach("foto", jpeg, { filename: "entrada.jpg", contentType: "image/jpeg" })
      .expect(201);

    expect(foto.body.mimeType).toBe("image/webp");
    expect(foto.body.largura).toBe(1200);
    expect(foto.body.altura).toBe(1200);
    expect(foto.body.tamanhoBytes).toBeLessThanOrEqual(5 * 1024 * 1024);
    expect(foto.body.url).toBe(`/animais/${animal.id}/fotos/${foto.body.id}/arquivo`);
    expect(foto.body.caminhoAbsoluto).toBeUndefined();
    expect(foto.body.identificacao).toBe(true);

    const fotoPersistida = await prisma.fotoAnimal.findUniqueOrThrow({ where: { id: foto.body.id } });
    expect(fotoPersistida.caminhoAbsoluto).toBe(`animais/${animal.id}/${fotoPersistida.nomeArquivo}`);
    await expect(stat(resolve(MEDIA_ROOT, fotoPersistida.caminhoAbsoluto))).resolves.toBeTruthy();

    const arquivo = await request(app.getHttpServer())
      .get(foto.body.url)
      .set(auth(token))
      .expect(200);

    expect(arquivo.headers["content-type"]).toContain("image/webp");

    const fotoGrande = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/fotos`)
      .set(auth(token))
      .attach("foto", grande, { filename: "grande.png", contentType: "image/png" })
      .expect(201);

    expect(grande.byteLength).toBeGreaterThan(5 * 1024 * 1024);
    expect(fotoGrande.body.largura).toBe(1200);
    expect(fotoGrande.body.altura).toBe(1200);
    expect(fotoGrande.body.tamanhoBytes).toBeLessThanOrEqual(5 * 1024 * 1024);
  }, 30000);

  it("rejeita foto que não está recortada em quadrado", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token);
    const jpeg = await imagemTeste("jpeg", 1600, 900);

    const resposta = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/fotos`)
      .set(auth(token))
      .attach("foto", jpeg, { filename: "entrada.jpg", contentType: "image/jpeg" })
      .expect(400);

    expect(String(resposta.body.message)).toMatch(/quadrado/i);
  });

  it("rejeita formato inválido, bloqueia 11ª foto e serializa colisão concorrente", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token);
    const png = await imagemTeste("png", 300, 300);

    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/fotos`)
      .set(auth(token))
      .attach("foto", Buffer.from("não é imagem"), { filename: "fake.txt", contentType: "text/plain" })
      .expect(400);

    for (let index = 0; index < 9; index += 1) {
      await request(app.getHttpServer())
        .post(`/animais/${animal.id}/fotos`)
        .set(auth(token))
        .attach("foto", png, { filename: `foto-${index}.png`, contentType: "image/png" })
        .expect(201);
    }

    const respostas = await Promise.all([
      request(app.getHttpServer())
        .post(`/animais/${animal.id}/fotos`)
        .set(auth(token))
        .attach("foto", png, { filename: "foto-10.png", contentType: "image/png" }),
      request(app.getHttpServer())
        .post(`/animais/${animal.id}/fotos`)
        .set(auth(token))
        .attach("foto", png, { filename: "foto-11.png", contentType: "image/png" }),
    ]);

    expect(respostas.map((response) => response.status).sort()).toEqual([201, 409]);

    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/fotos`)
      .set(auth(token))
      .attach("foto", png, { filename: "foto-extra.png", contentType: "image/png" })
      .expect(409);

    const fotos = await prisma.fotoAnimal.findMany({ where: { animalId: animal.id } });
    expect(fotos).toHaveLength(10);
  });

  it("remove somente a foto escolhida, limpa arquivo órfão e bloqueia path traversal persistido", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token);
    const webp = await imagemTeste("webp", 640, 640);

    const criada = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/fotos`)
      .set(auth(token))
      .attach("foto", webp, { filename: "foto.webp", contentType: "image/webp" })
      .expect(201);

    const fotoNoBanco = await prisma.fotoAnimal.findUniqueOrThrow({ where: { id: criada.body.id } });
    expect(fotoNoBanco.caminhoAbsoluto).toMatch(/^animais\/\d+\/.+\.webp$/);
    await expect(stat(resolve(MEDIA_ROOT, fotoNoBanco.caminhoAbsoluto))).resolves.toBeTruthy();

    await request(app.getHttpServer())
      .delete(`/animais/${animal.id}/fotos/${criada.body.id}`)
      .set(auth(token))
      .expect(200);

    await expect(stat(resolve(MEDIA_ROOT, fotoNoBanco.caminhoAbsoluto))).rejects.toMatchObject({ code: "ENOENT" });

    const traversal = await prisma.fotoAnimal.create({
      data: {
        animalId: animal.id,
        caminhoAbsoluto: resolve(MEDIA_ROOT, "..", `escape-${STAMP}.webp`),
        nomeArquivo: "escape.webp",
        mimeType: "image/webp",
        tamanhoBytes: 1,
        largura: 1,
        altura: 1,
      },
    });

    await request(app.getHttpServer())
      .get(`/animais/${animal.id}/fotos/${traversal.id}/arquivo`)
      .set(auth(token))
      .expect(400);
  });

  async function criarAnimal(token: string, overrides: Partial<ReturnType<typeof nextAnimal>> = {}) {
    const response = await request(app.getHttpServer())
      .post("/animais")
      .set(auth(token))
      .send(nextAnimal(overrides))
      .expect(201);
    return response.body as { id: number; numeroRegistro: string };
  }

  async function criarBaia(
    prefix: string,
    overrides: Partial<{
      capacidade: number;
      estado: "ativa" | "inativa" | "interditada" | "em_higienizacao";
      exclusivaIsolamento: boolean;
    }> = {},
  ) {
    seq += 1;
    return prisma.baia.create({
      data: {
        codigo: `ANI-${STAMP}-${prefix}-${seq}`,
        codigoNormalizado: `ANI-${STAMP}-${prefix}-${seq}`.toLocaleUpperCase("pt-BR"),
        setor: "canil",
        tipo: "coletiva",
        capacidade: overrides.capacidade ?? 2,
        estado: overrides.estado ?? "ativa",
        exclusivaIsolamento: overrides.exclusivaIsolamento ?? false,
      },
    });
  }

  function nextAnimal(overrides: Partial<{
    nome: string;
    numeroRegistro: string;
    especie: "cao" | "gato";
    racaId: number;
    sexo: "macho" | "femea" | "nao_informado";
    dataAcolhimento: string;
  }> = {}) {
    seq += 1;
    const especie = overrides.especie ?? "cao";
    return {
      nome: overrides.nome ?? `Animal Teste ${STAMP}-${seq}`,
      numeroRegistro: overrides.numeroRegistro ?? `ANI-${STAMP}-${seq}`,
      especie,
      racaId: overrides.racaId ?? (especie === "cao" ? racaCaoId : racaGatoId),
      sexo: overrides.sexo ?? "nao_informado",
      dataAcolhimento: overrides.dataAcolhimento ?? "2026-09-20T12:00:00.000Z",
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

async function imagemTeste(format: "jpeg" | "png" | "webp", width: number, height: number) {
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 80, g: 120, b: 160 },
    },
  });
  if (format === "jpeg") return image.jpeg({ quality: 92 }).toBuffer();
  if (format === "png") return image.png().toBuffer();
  return image.webp({ quality: 90 }).toBuffer();
}

async function imagemGrandePng() {
  const width = 1600;
  const height = 1600;
  return sharp(randomBytes(width * height * 3), { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

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
  const cpf = `7${STAMP}${String(index).padStart(2, "0")}`.slice(0, 11);
  const usuario = await prisma.usuario.create({
    data: {
      nome: `Usuário Animais ${perfil}`,
      email: `${perfil}-${STAMP}${EMAIL_SUFFIX}`,
      senhaHash,
      cpf,
      perfilAcesso: perfil,
      ativo: true,
      funcionario: {
        create: {
          matricula: `A${STAMP.slice(0, 5)}${index}`,
          cargo: perfil,
          crmv: perfil === "veterinario" || perfil === "coordenacao" ? "12345" : null,
        },
      },
    },
  });
  return { id: usuario.id, cpf };
}

async function cleanup(prisma: PrismaClient) {
  await prisma.animal.deleteMany({
    where: { numeroRegistroNormalizado: { startsWith: `ani-${STAMP}` } },
  });
  await prisma.racaAnimal.deleteMany({
    where: { nomeNormalizado: { contains: STAMP.toLocaleLowerCase("pt-BR") } },
  });
  await prisma.baia.deleteMany({
    where: { codigoNormalizado: { startsWith: `ANI-${STAMP}` } },
  });

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
}
