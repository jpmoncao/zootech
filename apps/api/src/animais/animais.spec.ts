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
import { addDias, formatDataCivil, hojeCivil } from "../vacinacao/datas";
import { AnimaisService } from "./animais.service";

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
        expect.arrayContaining(["sem_baia"]),
      );

      await request(app.getHttpServer())
        .get("/animais")
        .set(auth(token))
        .expect(200);

      const editado = await request(app.getHttpServer())
        .patch(`/animais/${criado.body.id}`)
        .set(auth(token))
        .send({ corPelagem: `Caramelo ${perfil}` })
        .expect(200);

      expect(editado.body.corPelagem).toBe(`Caramelo ${perfil}`);
      expect(editado.body.estadoCastracao).toBe("nao_informado");
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

  it("filtra por período de adoção e preserva ciclos históricos devolvidos", async () => {
    const token = tokens.get("coordenacao")!;
    const devolvido = await criarAnimal(token, { nome: `Histórico ${STAMP}` });
    const foraDoPeriodo = await criarAnimal(token, { nome: `Fora ${STAMP}` });
    const tutor = await prisma.tutor.create({
      data: {
        nome: `Tutor filtro ${STAMP}`, cpf: `9876543${STAMP.slice(-4)}`, telefone: "11999999999",
        tipoDocumento: "RG", numeroDocumento: `RG-FILTRO-${STAMP}`, cep: "01001000", logradouro: "Rua A",
        numero: "10", bairro: "Centro", cidade: "São Paulo", uf: "SP",
      },
    });
    const adocao = await prisma.adocao.create({
      data: {
        animalId: devolvido.id, tutorId: tutor.id, consentiuTratamento: true, consentiuAcompanhamento: true,
        caminhoAssinatura: "adocoes/teste.webp", nomeArquivoAssinatura: "teste.webp", mimeTypeAssinatura: "image/webp", tamanhoAssinatura: 1,
        adotadaEm: new Date("2026-09-10T15:00:00.000Z"),
      },
    });
    await prisma.devolucao.create({
      data: { adocaoId: adocao.id, motivo: "Retorno de teste", situacaoRetorno: "saudavel", recebidaPorId: usuarios.get("coordenacao")!.id },
    });
    await prisma.adocao.create({
      data: {
        animalId: foraDoPeriodo.id, tutorId: tutor.id, consentiuTratamento: true, consentiuAcompanhamento: true,
        caminhoAssinatura: "adocoes/teste-fora.webp", nomeArquivoAssinatura: "teste-fora.webp", mimeTypeAssinatura: "image/webp", tamanhoAssinatura: 1,
        adotadaEm: new Date("2026-08-31T23:00:00.000Z"),
      },
    });

    const lista = await request(app.getHttpServer())
      .get("/animais")
      .query({ adotadaDe: "2026-09-01", adotadaAte: "2026-09-30" })
      .set(auth(token))
      .expect(200);

    expect(lista.body.items.map((animal: { id: number }) => animal.id)).toContain(devolvido.id);
    expect(lista.body.items.map((animal: { id: number }) => animal.id)).not.toContain(foraDoPeriodo.id);
    await request(app.getHttpServer())
      .get("/animais")
      .query({ adotadaDe: "2026-10-01", adotadaAte: "2026-09-01" })
      .set(auth(token))
      .expect(400);
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

  it("bloqueia revogação manual da adoção e expõe os ciclos sem conteúdo de assinatura", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token, { nome: `Adoção ${STAMP}` });
    const tutor = await prisma.tutor.create({
      data: {
        nome: `Tutor ${STAMP}`, cpf: `1234567${STAMP.slice(-4)}`, telefone: "11999999999",
        tipoDocumento: "RG", numeroDocumento: `RG-${STAMP}`, cep: "01001000", logradouro: "Rua A",
        numero: "10", bairro: "Centro", cidade: "São Paulo", uf: "SP",
      },
    });
    const assinatura = await imagemAssinaturaTeste();

    const resposta = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/adocoes`)
      .set(auth(token))
      .field("tutorId", String(tutor.id))
      .field("consentiuTratamento", "true")
      .field("consentiuAcompanhamento", "true")
      .attach("assinatura", assinatura, { filename: "assinatura.png", contentType: "image/png" })
      .expect(201);

    const detalhe = await request(app.getHttpServer())
      .get(`/animais/${animal.id}`)
      .set(auth(token))
      .expect(200);

    expect(detalhe.body.situacao).toBe("adotado");
    expect(detalhe.body.alertas.map((alerta: { tipo: string }) => alerta.tipo)).not.toContain("sem_baia");
    expect(detalhe.body.adocoes).toHaveLength(1);
    expect(detalhe.body.adocoes[0]).toMatchObject({
      id: resposta.body.id,
      tutor: { id: tutor.id },
      consentiuTratamento: true,
      consentiuAcompanhamento: true,
      assinaturaUrl: `/animais/${animal.id}/adocoes/assinatura/${resposta.body.id}`,
      devolucao: null,
    });
    expect(JSON.stringify(detalhe.body)).not.toContain("caminhoAssinatura");
    expect(JSON.stringify(detalhe.body)).not.toContain("tamanhoAssinatura");

    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/revogar-situacao`)
      .set(auth(token))
      .send({ situacao: "saudavel", motivo: "Correção" })
      .expect(409);
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

  it("opera castrações para os quatro perfis e grava timeline/auditoria com autoria", async () => {
    for (const perfil of PERFIS) {
      const token = tokens.get(perfil)!;
      const userId = usuarios.get(perfil)!.id;
      const animal = await criarAnimal(token);

      await request(app.getHttpServer())
        .get(`/animais/${animal.id}/castracoes`)
        .expect(401);

      const avaliacao = await request(app.getHttpServer())
        .post(`/animais/${animal.id}/castracoes/avaliacoes`)
        .set(auth(token))
        .send({ observacao: `Avaliação ${perfil}` })
        .expect(201);

      expect(avaliacao.body.estado).toBe("nao_castrado");
      expect(avaliacao.body.usuarioId).toBe(userId);
      const aposAvaliacao = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(token)).expect(200);
      expect(aposAvaliacao.body.estadoCastracao).toBe("nao_castrado");
      expect(aposAvaliacao.body.castracoes[0].usuario.id).toBe(userId);

      const dataHoraPlanejada = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const agendamento = await request(app.getHttpServer())
        .post(`/animais/${animal.id}/castracoes/agendamentos`)
        .set(auth(token))
        .send({ dataHoraPlanejada, observacao: `Agenda ${perfil}` })
        .expect(201);

      expect(agendamento.body.estado).toBe("agendada");
      expect(agendamento.body.usuarioId).toBe(userId);
      const aposAgenda = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(token)).expect(200);
      expect(aposAgenda.body.estadoCastracao).toBe("agendada");

      const novaData = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
      const reagendado = await request(app.getHttpServer())
        .patch(`/animais/${animal.id}/castracoes/${agendamento.body.id}/reagendar`)
        .set(auth(token))
        .send({ dataHoraPlanejada: novaData })
        .expect(200);

      expect(reagendado.body.dataHoraPlanejada).toBe(novaData);

      const concluido = await request(app.getHttpServer())
        .patch(`/animais/${animal.id}/castracoes/${agendamento.body.id}/concluir`)
        .set(auth(token))
        .send({ dataEfetiva: "2026-09-25", dataEfetivaTemHora: false, observacao: "Concluída" })
        .expect(200);

      expect(concluido.body.estado).toBe("realizada");
      expect(concluido.body.dataEfetivaTemHora).toBe(false);

      const detalhe = await request(app.getHttpServer())
        .get(`/animais/${animal.id}`)
        .set(auth(token))
        .expect(200);

      expect(detalhe.body.estadoCastracao).toBe("realizada");
      expect(detalhe.body.castracoes.map((castracao: { id: number }) => castracao.id)).toContain(concluido.body.id);

      const timeline = await request(app.getHttpServer())
        .get(`/animais/${animal.id}/timeline`)
        .set(auth(token))
        .expect(200);

      expect(timeline.body.map((evento: { tipo: string }) => evento.tipo)).toContain("castracao");

      const auditoria = await prisma.auditoriaEvento.findMany({
        where: {
          tipo: "animal_castracao_alterada",
          usuarioId: userId,
          dados: { path: ["entidadeId"], equals: String(animal.id) },
        },
      });
      expect(auditoria.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("preserva cancelamentos, permite nova tentativa e bloqueia duplicidades de castração", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token);

    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/castracoes/agendamentos`)
      .set(auth(token))
      .send({ dataHoraPlanejada: "2020-01-01T10:00:00.000Z" })
      .expect(400);

    const primeiraData = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();
    const primeiro = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/castracoes/agendamentos`)
      .set(auth(token))
      .send({ dataHoraPlanejada: primeiraData })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/castracoes/agendamentos`)
      .set(auth(token))
      .send({ dataHoraPlanejada: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/animais/${animal.id}/castracoes/${primeiro.body.id}/cancelar`)
      .set(auth(token))
      .send({ motivo: "Tutor indisponível" })
      .expect(200);
    const aposCancelamento = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(token)).expect(200);
    expect(aposCancelamento.body.estadoCastracao).toBe("cancelada");
    expect(aposCancelamento.body.castracoes[0].motivoCancelamento).toBe("Tutor indisponível");

    const segundo = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/castracoes/agendamentos`)
      .set(auth(token))
      .send({ dataHoraPlanejada: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString() })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/animais/${animal.id}/castracoes/${primeiro.body.id}/concluir`)
      .set(auth(token))
      .send({ dataEfetiva: "2026-09-25" })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/animais/${animal.id}/castracoes/${segundo.body.id}/concluir`)
      .set(auth(token))
      .send({ dataEfetiva: "2026-09-25T13:30:00.000Z" })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/castracoes/legado-realizado`)
      .set(auth(token))
      .send({})
      .expect(409);

    const registros = await request(app.getHttpServer())
      .get(`/animais/${animal.id}/castracoes`)
      .set(auth(token))
      .expect(200);

    expect(registros.body.map((registro: { estado: string }) => registro.estado)).toEqual(
      expect.arrayContaining(["cancelada", "realizada"]),
    );
  });

  it("expõe registro realizado legado sem inventar data na lista e na ficha", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token);
    const legado = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/castracoes/legado-realizado`)
      .set(auth(token))
      .send({ observacao: "Procedimento anterior ao sistema" })
      .expect(201);
    expect(legado.body.dataEfetiva).toBeNull();

    const detalhe = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(token)).expect(200);
    expect(detalhe.body.estadoCastracao).toBe("realizada");
    expect(detalhe.body.castracoes[0]).toMatchObject({ origem: "legada", dataEfetiva: null, observacao: "Procedimento anterior ao sistema" });

    const lista = await request(app.getHttpServer()).get("/animais")
      .query({ busca: animal.numeroRegistro }).set(auth(token)).expect(200);
    expect(lista.body.items[0].estadoCastracao).toBe("realizada");
  });

  it("lista agenda global com busca, período, ordenação e paginação", async () => {
    const token = tokens.get("recepcao")!;
    const primeiro = await criarAnimal(token);
    const segundo = await criarAnimal(token);
    const dia = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000);
    const maisCedo = new Date(dia);
    maisCedo.setUTCHours(10, 0, 0, 0);
    const maisTarde = new Date(dia);
    maisTarde.setUTCHours(14, 0, 0, 0);
    await request(app.getHttpServer()).post(`/animais/${primeiro.id}/castracoes/agendamentos`)
      .set(auth(token)).send({ dataHoraPlanejada: maisTarde.toISOString() }).expect(201);
    await request(app.getHttpServer()).post(`/animais/${segundo.id}/castracoes/agendamentos`)
      .set(auth(token)).send({ dataHoraPlanejada: maisCedo.toISOString() }).expect(201);

    await request(app.getHttpServer()).get("/animais/castracoes").expect(401);
    const agenda = await request(app.getHttpServer()).get("/animais/castracoes")
      .query({ estado: "agendada", de: maisCedo.toISOString().slice(0, 10), ate: maisCedo.toISOString().slice(0, 10) })
      .set(auth(token)).expect(200);
    const posicoes = agenda.body.itens.map((item: { id: number; dataHoraPlanejada: string }) => ({ id: item.id, date: item.dataHoraPlanejada }));
    expect(posicoes.findIndex((item: { date: string }) => item.date === maisCedo.toISOString()))
      .toBeLessThan(posicoes.findIndex((item: { date: string }) => item.date === maisTarde.toISOString()));

    const filtrada = await request(app.getHttpServer()).get("/animais/castracoes")
      .query({ busca: segundo.numeroRegistro, estado: "agendada", pagina: 1, limite: 1 })
      .set(auth(token)).expect(200);
    expect(filtrada.body.total).toBe(1);
    expect(filtrada.body.itens[0].animal.id).toBe(segundo.id);
    await request(app.getHttpServer()).get("/animais/castracoes")
      .query({ de: "2026-09-26", ate: "2026-09-25" }).set(auth(token)).expect(400);
  });

  it("bloqueia mutações de castração em animal terminal, mas permite cancelar agendamento existente", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token);
    const agendamento = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/castracoes/agendamentos`)
      .set(auth(token))
      .send({ dataHoraPlanejada: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/animais/${animal.id}`)
      .set(auth(token))
      .send({ situacao: "obito" })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/castracoes/agendamentos`)
      .set(auth(token))
      .send({ dataHoraPlanejada: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString() })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/animais/${animal.id}/castracoes/${agendamento.body.id}/reagendar`)
      .set(auth(token))
      .send({ dataHoraPlanejada: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/animais/${animal.id}/castracoes/${agendamento.body.id}/concluir`)
      .set(auth(token))
      .send({ dataEfetiva: "2026-09-25" })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/animais/${animal.id}/castracoes/${agendamento.body.id}/cancelar`)
      .set(auth(token))
      .send({ motivo: "Animal em óbito" })
      .expect(200);
  });

  it("reverte a castração quando a auditoria falha na mesma transação", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token);
    const spy = jest
      .spyOn(AnimaisService.prototype as unknown as { createAudit: (...args: unknown[]) => Promise<void> }, "createAudit")
      .mockImplementation(async (...args: unknown[]) => {
        if (args[3] === "animal_castracao_alterada") throw new Error("falha simulada de auditoria");
      });

    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/castracoes/agendamentos`)
      .set(auth(token))
      .send({ dataHoraPlanejada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
      .expect(500);

    spy.mockRestore();

    const registros = await prisma.castracaoAnimal.findMany({ where: { animalId: animal.id } });
    const eventos = await prisma.eventoAnimal.findMany({ where: { animalId: animal.id, tipo: "castracao" } });
    expect(registros).toHaveLength(0);
    expect(eventos).toHaveLength(0);
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

  it("grava e limpa o início da observação antirrábica, reiniciando ao recolocar", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token);
    expect((await prisma.animal.findUniqueOrThrow({ where: { id: animal.id } })).observacaoAntirrabicaInicioEm).toBeNull();

    const entrou = await patchAnimal(animal.id, token, { situacao: "em_observacao_antirrabica" });
    expect(entrou.body.situacao).toBe("em_observacao_antirrabica");
    expect(entrou.body.observacaoAntirrabica).toMatchObject({
      periodoDias: 10,
      diasDecorridos: 0,
      diasRestantes: 10,
      vencida: false,
    });
    expect((await prisma.animal.findUniqueOrThrow({ where: { id: animal.id } })).observacaoAntirrabicaInicioEm).not.toBeNull();

    // Todos os perfis podem colocar e tirar o animal da situação.
    const saiu = await patchAnimal(animal.id, tokens.get("agente")!, { situacao: "em_tratamento" });
    expect(saiu.body.observacaoAntirrabica).toBeNull();
    expect((await prisma.animal.findUniqueOrThrow({ where: { id: animal.id } })).observacaoAntirrabicaInicioEm).toBeNull();

    await prisma.animal.update({
      where: { id: animal.id },
      data: { situacao: "em_observacao_antirrabica", observacaoAntirrabicaInicioEm: diasAtras(4) },
    });
    const revisita = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(token)).expect(200);
    expect(revisita.body.observacaoAntirrabica).toMatchObject({ diasDecorridos: 4, diasRestantes: 6, vencida: false });

    // Recolocar reinicia a contagem; o período anterior fica no histórico, não no campo.
    await patchAnimal(animal.id, token, { situacao: "saudavel" });
    await patchAnimal(animal.id, token, { situacao: "em_observacao_antirrabica" });
    const reiniciado = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(token)).expect(200);
    expect(reiniciado.body.observacaoAntirrabica.diasDecorridos).toBe(0);

    const eventos = await prisma.eventoAnimal.findMany({ where: { animalId: animal.id, tipo: "mudanca_situacao" } });
    expect(eventos.length).toBeGreaterThanOrEqual(3);
  });

  it("marca a observação antirrábica como vencida depois de 10 dias", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimal(token);
    await prisma.animal.update({
      where: { id: animal.id },
      data: { situacao: "em_observacao_antirrabica", observacaoAntirrabicaInicioEm: diasAtras(13) },
    });

    const ficha = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(token)).expect(200);
    expect(ficha.body.observacaoAntirrabica).toMatchObject({
      diasDecorridos: 13,
      diasRestantes: 0,
      vencida: true,
      periodoDias: 10,
    });

    // No décimo dia já está vencida: o período terminou.
    await prisma.animal.update({ where: { id: animal.id }, data: { observacaoAntirrabicaInicioEm: diasAtras(10) } });
    const noDia10 = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(token)).expect(200);
    expect(noDia10.body.observacaoAntirrabica).toMatchObject({ diasDecorridos: 10, diasRestantes: 0, vencida: true });

    await prisma.animal.update({ where: { id: animal.id }, data: { observacaoAntirrabicaInicioEm: diasAtras(9) } });
    const noDia9 = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(token)).expect(200);
    expect(noDia9.body.observacaoAntirrabica).toMatchObject({ diasRestantes: 1, vencida: false });
  });

  it("encerra a observação antirrábica exigindo conclusão escrita e nova situação", async () => {
    const token = tokens.get("recepcao")!;
    const animal = await criarAnimal(token);
    const url = `/animais/${animal.id}/encerrar-observacao-antirrabica`;

    // Fora da situação, não há o que encerrar.
    const foraDaSituacao = await request(app.getHttpServer())
      .post(url)
      .set(auth(token))
      .send({ observacaoFinal: "x", situacao: "saudavel" })
      .expect(409);
    expect(foraDaSituacao.body.message).toMatch(/observação antirrábica/i);

    await prisma.animal.update({
      where: { id: animal.id },
      data: { situacao: "em_observacao_antirrabica", observacaoAntirrabicaInicioEm: diasAtras(12) },
    });

    for (const corpo of [
      {},
      { observacaoFinal: "sem sinais" },
      { situacao: "saudavel" },
      { observacaoFinal: "   ", situacao: "saudavel" },
      { observacaoFinal: "sem sinais", situacao: "adotado" },
      { observacaoFinal: "sem sinais", situacao: "em_observacao_antirrabica" },
    ]) {
      await request(app.getHttpServer()).post(url).set(auth(token)).send(corpo).expect(400);
    }
    expect((await prisma.animal.findUniqueOrThrow({ where: { id: animal.id } })).situacao).toBe("em_observacao_antirrabica");

    const encerrado = await request(app.getHttpServer())
      .post(url)
      .set(auth(token))
      .send({ observacaoFinal: "  Sem   sinais neurologicos em 10 dias. ", situacao: "saudavel" })
      .expect(201);

    expect(encerrado.body.situacao).toBe("saudavel");
    expect(encerrado.body.observacaoAntirrabica).toBeNull();
    expect(encerrado.body.observacoes[0].texto).toBe("Sem sinais neurologicos em 10 dias.");
    expect((await prisma.animal.findUniqueOrThrow({ where: { id: animal.id } })).observacaoAntirrabicaInicioEm).toBeNull();

    const evento = await prisma.eventoAnimal.findFirstOrThrow({
      where: { animalId: animal.id, tipo: "encerramento_observacao_antirrabica" },
    });
    expect(evento.dados).toMatchObject({
      situacaoAnterior: "em_observacao_antirrabica",
      situacaoNova: "saudavel",
      diasDecorridos: 12,
      periodoDias: 10,
      antecipado: false,
    });
    expect(evento.usuarioId).toBe(usuarios.get("recepcao")!.id);

    const auditoria = await prisma.auditoriaEvento.findFirstOrThrow({
      where: { tipo: "animal_observacao_antirrabica_encerrada", usuarioId: usuarios.get("recepcao")!.id },
    });
    expect((auditoria.dados as { entidadeId: string }).entidadeId).toBe(String(animal.id));

    // Encerrar duas vezes não é possível.
    await request(app.getHttpServer()).post(url).set(auth(token)).send({ observacaoFinal: "y", situacao: "saudavel" }).expect(409);
  });

  it("marca como antecipado o encerramento dentro dos 10 dias e aceita óbito como desfecho", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimal(token);
    await prisma.animal.update({
      where: { id: animal.id },
      data: { situacao: "em_observacao_antirrabica", observacaoAntirrabicaInicioEm: diasAtras(3) },
    });

    const encerrado = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/encerrar-observacao-antirrabica`)
      .set(auth(token))
      .send({ observacaoFinal: "Evoluiu para obito no terceiro dia.", situacao: "obito" })
      .expect(201);
    expect(encerrado.body.situacao).toBe("obito");
    expect(encerrado.body.somenteLeitura).toBe(true);

    const evento = await prisma.eventoAnimal.findFirstOrThrow({
      where: { animalId: animal.id, tipo: "encerramento_observacao_antirrabica" },
    });
    expect(evento.dados).toMatchObject({ diasDecorridos: 3, antecipado: true, situacaoNova: "obito" });
    expect(evento.resumo).toMatch(/antecipada/);
  });

  it("bloqueia encerrar observação de animal em situação terminal", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token);
    await prisma.animal.update({
      where: { id: animal.id },
      data: { situacao: "obito", observacaoAntirrabicaInicioEm: diasAtras(5) },
    });
    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/encerrar-observacao-antirrabica`)
      .set(auth(token))
      .send({ observacaoFinal: "x", situacao: "saudavel" })
      .expect(409);
  });

  it("limpa o período quando a coordenação revoga situação terminal e reinicia se voltar para a observação", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token);
    await prisma.animal.update({
      where: { id: animal.id },
      data: { situacao: "obito", observacaoAntirrabicaInicioEm: diasAtras(5) },
    });

    const revogado = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/revogar-situacao`)
      .set(auth(token))
      .send({ situacao: "saudavel", motivo: "lancado no animal errado" })
      .expect(201);
    expect(revogado.body.situacao).toBe("saudavel");
    expect((await prisma.animal.findUniqueOrThrow({ where: { id: animal.id } })).observacaoAntirrabicaInicioEm).toBeNull();

    // Revogar direto para a observação antirrábica reinicia a contagem.
    await prisma.animal.update({ where: { id: animal.id }, data: { situacao: "adotado" } });
    const paraObservacao = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/revogar-situacao`)
      .set(auth(token))
      .send({ situacao: "em_observacao_antirrabica", motivo: "adocao lancada por engano" })
      .expect(201);
    expect(paraObservacao.body.observacaoAntirrabica).toMatchObject({ diasDecorridos: 0, vencida: false });
  });

  it("registra reação adversa ligada à aplicação, por qualquer perfil autenticado", async () => {
    const animal = await criarAnimal(tokens.get("coordenacao")!);
    const aplicacaoId = await aplicarVacina(animal.id);

    const evento = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/eventos`)
      .set(auth(tokens.get("agente")!))
      .send({
        tipo: "reacao_adversa",
        resumo: "Inchaco no local e prostracao",
        gravidadeReacao: "moderada",
        desfechoReacao: "em_acompanhamento",
        aplicacaoVacinaId: aplicacaoId,
      })
      .expect(201);

    expect(evento.body).toMatchObject({
      tipo: "reacao_adversa",
      gravidadeReacao: "moderada",
      desfechoReacao: "em_acompanhamento",
      aplicacaoVacinaId: aplicacaoId,
      eventoOrigemId: null,
    });
    expect(evento.body.usuarioId).toBe(usuarios.get("agente")!.id);

    const ficha = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(tokens.get("recepcao")!)).expect(200);
    expect(ficha.body.reacoesAdversas).toHaveLength(1);
    expect(ficha.body.reacoesAdversas[0]).toMatchObject({
      id: evento.body.id,
      gravidade: "moderada",
      desfecho: "em_acompanhamento",
      emAcompanhamento: true,
      aplicacaoVacinaId: aplicacaoId,
      atualizacoes: [],
    });

    const auditoria = await prisma.auditoriaEvento.findFirstOrThrow({
      where: { tipo: "animal_reacao_adversa_registrado", usuarioId: usuarios.get("agente")!.id },
    });
    expect(auditoria.dados).toMatchObject({ gravidadeReacao: "moderada", atualizacaoDeDesfecho: false });
  });

  it("aceita reação adversa sem aplicação e recusa aplicação de outro animal", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimal(token);
    const outro = await criarAnimal(token);
    const doOutro = await aplicarVacina(outro.id);

    const semAplicacao = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/eventos`)
      .set(auth(token))
      .send({ tipo: "reacao_adversa", resumo: "Vomito", gravidadeReacao: "leve", desfechoReacao: "resolvida" })
      .expect(201);
    expect(semAplicacao.body.aplicacaoVacinaId).toBeNull();

    for (const aplicacaoVacinaId of [doOutro, 999999999]) {
      await request(app.getHttpServer())
        .post(`/animais/${animal.id}/eventos`)
        .set(auth(token))
        .send({
          tipo: "reacao_adversa",
          resumo: "x",
          gravidadeReacao: "leve",
          desfechoReacao: "resolvida",
          aplicacaoVacinaId,
        })
        .expect(400);
    }
  });

  it("atualiza o desfecho por evento novo, mantendo a cadeia e o histórico", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimal(token);
    const aplicacaoId = await aplicarVacina(animal.id);

    const raiz = await reacao(animal.id, token, {
      resumo: "Apatia",
      gravidadeReacao: "grave",
      desfechoReacao: "em_acompanhamento",
      aplicacaoVacinaId: aplicacaoId,
    });

    const atualizacao = await reacao(animal.id, token, {
      resumo: "Melhorou com suporte",
      gravidadeReacao: "moderada",
      desfechoReacao: "resolvida_com_sequela",
      eventoOrigemId: raiz.id,
    });
    expect(atualizacao.eventoOrigemId).toBe(raiz.id);
    // A atualização herda a aplicação da raiz sem precisar repetir.
    expect(atualizacao.aplicacaoVacinaId).toBe(aplicacaoId);

    // Apontar para a atualização resolve para a raiz: a cadeia fica com um nível só.
    const terceira = await reacao(animal.id, token, {
      resumo: "Alta",
      gravidadeReacao: "leve",
      desfechoReacao: "resolvida",
      eventoOrigemId: atualizacao.id,
    });
    expect(terceira.eventoOrigemId).toBe(raiz.id);

    const ficha = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(token)).expect(200);
    expect(ficha.body.reacoesAdversas).toHaveLength(1);
    const corrente = ficha.body.reacoesAdversas[0];
    expect(corrente).toMatchObject({
      id: raiz.id,
      gravidade: "leve",
      desfecho: "resolvida",
      emAcompanhamento: false,
      resumo: "Apatia",
    });
    expect(corrente.atualizacoes.map((a: { id: number }) => a.id)).toEqual([atualizacao.id, terceira.id]);
    // Nada foi apagado: os três eventos seguem na timeline.
    expect(await prisma.eventoAnimal.count({ where: { animalId: animal.id, tipo: "reacao_adversa" } })).toBe(3);
  });

  it("recusa origem que não é reação adversa deste animal", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token);
    const outro = await criarAnimal(token);
    const doOutro = await reacao(outro.id, token, {
      resumo: "x",
      gravidadeReacao: "leve",
      desfechoReacao: "resolvida",
    });
    const exame = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/eventos`)
      .set(auth(token))
      .send({ tipo: "exame", resumo: "Hemograma" })
      .expect(201);

    for (const eventoOrigemId of [doOutro.id, exame.body.id, 999999999]) {
      await request(app.getHttpServer())
        .post(`/animais/${animal.id}/eventos`)
        .set(auth(token))
        .send({
          tipo: "reacao_adversa",
          resumo: "x",
          gravidadeReacao: "leve",
          desfechoReacao: "resolvida",
          eventoOrigemId,
        })
        .expect(400);
    }
  });

  it("exige gravidade e desfecho na reação e proíbe esses campos nos outros eventos", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimal(token);

    for (const corpo of [
      { tipo: "reacao_adversa", resumo: "x" },
      { tipo: "reacao_adversa", resumo: "x", gravidadeReacao: "leve" },
      { tipo: "reacao_adversa", resumo: "x", desfechoReacao: "resolvida" },
      { tipo: "reacao_adversa", resumo: "x", gravidadeReacao: "gravissima", desfechoReacao: "resolvida" },
      { tipo: "reacao_adversa", resumo: "x", gravidadeReacao: "leve", desfechoReacao: "inventado" },
      { tipo: "reacao_adversa", resumo: "   ", gravidadeReacao: "leve", desfechoReacao: "resolvida" },
      { tipo: "exame", resumo: "x", gravidadeReacao: "leve", desfechoReacao: "resolvida" },
      { tipo: "diagnostico", resumo: "x", aplicacaoVacinaId: 1 },
      { tipo: "exame", resumo: "x", eventoOrigemId: 1 },
    ]) {
      await request(app.getHttpServer()).post(`/animais/${animal.id}/eventos`).set(auth(token)).send(corpo).expect(400);
    }

    // Evento comum continua funcionando e não ganha campos de reação.
    const exame = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/eventos`)
      .set(auth(token))
      .send({ tipo: "exame", resumo: "Hemograma normal" })
      .expect(201);
    expect(exame.body.gravidadeReacao).toBeNull();
    expect(exame.body.desfechoReacao).toBeNull();
    const ficha = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(token)).expect(200);
    expect(ficha.body.reacoesAdversas).toEqual([]);
  });

  it("preserva a reação adversa quando a aplicação que a originou é anulada", async () => {
    const animal = await criarAnimal(tokens.get("coordenacao")!);
    const aplicacaoId = await aplicarVacina(animal.id);
    const evento = await reacao(animal.id, tokens.get("veterinario")!, {
      resumo: "Edema facial",
      gravidadeReacao: "grave",
      desfechoReacao: "em_acompanhamento",
      aplicacaoVacinaId: aplicacaoId,
    });

    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/vacinacao/aplicacoes/${aplicacaoId}/anular`)
      .set(auth(tokens.get("coordenacao")!))
      .send({ motivo: "lote trocado" })
      .expect(201);

    const ficha = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(tokens.get("agente")!)).expect(200);
    expect(ficha.body.reacoesAdversas).toHaveLength(1);
    expect(ficha.body.reacoesAdversas[0]).toMatchObject({ id: evento.id, aplicacaoVacinaId: aplicacaoId, gravidade: "grave" });
    expect((await prisma.eventoAnimal.findUniqueOrThrow({ where: { id: evento.id } })).aplicacaoVacinaId).toBe(aplicacaoId);
  });

  it("bloqueia registrar reação adversa em animal em situação terminal", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimal(token);
    await prisma.animal.update({ where: { id: animal.id }, data: { situacao: "obito" } });
    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/eventos`)
      .set(auth(token))
      .send({ tipo: "reacao_adversa", resumo: "x", gravidadeReacao: "leve", desfechoReacao: "resolvida" })
      .expect(409);
  });

  it("alerta animal sem nenhuma vacina registrada e para de alertar depois da primeira dose", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimalAntigo(token);

    expect(await tiposDeAlerta(animal.id, token)).toContain("sem_vacinacao_registrada");
    await aplicarVacina(animal.id, { totalDoses: 3, intervaloDosesDias: 21 });
    const depois = await tiposDeAlerta(animal.id, token);
    expect(depois).not.toContain("sem_vacinacao_registrada");
    expect(depois).toContain("esquema_vacinal_incompleto");
  });

  it("informa doses aplicadas, previstas e faltantes no alerta de esquema incompleto", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimalAntigo(token);
    const vacina = await criarVacina({ totalDoses: 3, intervaloDosesDias: 21 });

    await aplicar(animal.id, vacina.id, -60);
    expect(await mensagemDoAlerta(animal.id, token, "esquema_vacinal_incompleto")).toBe(
      `${vacina.nome}: 1 de 3 doses, faltam 2.`,
    );

    await aplicar(animal.id, vacina.id, -30);
    expect(await mensagemDoAlerta(animal.id, token, "esquema_vacinal_incompleto")).toBe(
      `${vacina.nome}: 2 de 3 doses, falta 1.`,
    );

    await aplicar(animal.id, vacina.id, -5);
    expect(await tiposDeAlerta(animal.id, token)).not.toContain("esquema_vacinal_incompleto");
  });

  it("alerta dose vencida com os dias de atraso", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimalAntigo(token);
    const vacina = await criarVacina({ totalDoses: 3, intervaloDosesDias: 21 });
    // Aplicada há 25 dias, intervalo de 21: venceu há 4.
    await aplicar(animal.id, vacina.id, -25);

    expect(await mensagemDoAlerta(animal.id, token, "dose_vencida")).toBe(`${vacina.nome}: dose venceu há 4 dias.`);
    expect(await tiposDeAlerta(animal.id, token)).not.toContain("dose_a_vencer");

    // Segunda vacina vencida há 1 dia: agora há dois alertas deste tipo, um por protocolo.
    const umDia = await criarVacina({ totalDoses: 3, intervaloDosesDias: 21 });
    await aplicar(animal.id, umDia.id, -22);
    expect(await mensagensDeAlerta(animal.id, token, "dose_vencida")).toEqual(
      expect.arrayContaining([`${vacina.nome}: dose venceu há 4 dias.`, `${umDia.nome}: dose venceu há 1 dia.`]),
    );
  });

  it("respeita a janela de aviso de cada vacina, e a janela 0 desliga o aviso antecipado", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimalAntigo(token);

    // Próxima dose em 20 dias: só a de janela 30 avisa.
    const janela7 = await criarVacina({ totalDoses: 3, intervaloDosesDias: 21, diasAvisoProximaDose: 7 });
    const janela30 = await criarVacina({ totalDoses: 3, intervaloDosesDias: 21, diasAvisoProximaDose: 30 });
    await aplicar(animal.id, janela7.id, -1);
    await aplicar(animal.id, janela30.id, -1);

    const mensagens = await mensagensDeAlerta(animal.id, token, "dose_a_vencer");
    expect(mensagens).toEqual([`${janela30.nome}: dose vence em 20 dias.`]);

    // Janela 0 nunca avisa antes, só quando vence.
    const semAviso = await criarVacina({ totalDoses: 3, intervaloDosesDias: 21, diasAvisoProximaDose: 0 });
    const outro = await criarAnimalAntigo(token);
    await aplicar(outro.id, semAviso.id, -20);
    expect(await tiposDeAlerta(outro.id, token)).not.toContain("dose_a_vencer");
    // Editar só `dataProximaDose` (e não a calculada) é o que faz a data da equipe valer.
    await prisma.aplicacaoVacina.updateMany({
      where: { animalId: outro.id, vacinaId: semAviso.id },
      data: { dataProximaDose: diaCivil(-1) },
    });
    const vencida = await mensagensDeAlerta(outro.id, token, "dose_vencida");
    expect(vencida).toEqual([`${semAviso.nome}: dose venceu há 1 dia.`]);
    expect(await tiposDeAlerta(outro.id, token)).not.toContain("dose_a_vencer");
  });

  it("usa a janela atual do catálogo, não a do momento em que o protocolo nasceu", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimalAntigo(token);
    const vacina = await criarVacina({ totalDoses: 3, intervaloDosesDias: 21, diasAvisoProximaDose: 7 });
    await aplicar(animal.id, vacina.id, -1);
    expect(await tiposDeAlerta(animal.id, token)).not.toContain("dose_a_vencer");

    await request(app.getHttpServer())
      .patch(`/vacinas/${vacina.id}`)
      .set(auth(tokens.get("coordenacao")!))
      .send({ diasAvisoProximaDose: 30 })
      .expect(200);

    expect(await tiposDeAlerta(animal.id, token)).toContain("dose_a_vencer");
  });

  it("avisa vacina obrigatória pendente só para a espécie certa e para de avisar depois da dose", async () => {
    const token = tokens.get("veterinario")!;
    const obrigatoriaCao = await criarVacina({ totalDoses: 1, obrigatoria: true, especies: ["cao"] });
    const cao = await criarAnimalAntigo(token);
    const gato = await criarAnimalAntigo(token, { especie: "gato", racaId: racaGatoId });

    // A antirrábica do seed também é obrigatória, então há mais de um alerta deste tipo.
    expect(await mensagensDeAlerta(cao.id, token, "vacina_obrigatoria_pendente")).toContain(
      `${obrigatoriaCao.nome} é obrigatória e não tem nenhuma dose registrada.`,
    );
    expect(await mensagensDeAlerta(gato.id, token, "vacina_obrigatoria_pendente")).not.toContain(
      `${obrigatoriaCao.nome} é obrigatória e não tem nenhuma dose registrada.`,
    );

    await aplicar(cao.id, obrigatoriaCao.id, -1);
    expect(await mensagensDeAlerta(cao.id, token, "vacina_obrigatoria_pendente")).not.toContain(
      `${obrigatoriaCao.nome} é obrigatória e não tem nenhuma dose registrada.`,
    );

    // Vacina obrigatória inativada deixa de cobrar.
    const outra = await criarVacina({ totalDoses: 1, obrigatoria: true, especies: ["cao"] });
    const semDose = await criarAnimalAntigo(token);
    expect(await mensagensDeAlerta(semDose.id, token, "vacina_obrigatoria_pendente")).toContain(
      `${outra.nome} é obrigatória e não tem nenhuma dose registrada.`,
    );
    await request(app.getHttpServer())
      .post(`/vacinas/${outra.id}/inativar`)
      .set(auth(tokens.get("coordenacao")!))
      .expect(201);
    expect(await mensagensDeAlerta(semDose.id, token, "vacina_obrigatoria_pendente")).not.toContain(
      `${outra.nome} é obrigatória e não tem nenhuma dose registrada.`,
    );
  });

  it("troca os alertas de dose por protocolo interrompido e volta atrás ao retomar", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimalAntigo(token);
    const vacina = await criarVacina({ totalDoses: 3, intervaloDosesDias: 21 });
    await aplicar(animal.id, vacina.id, -25);
    expect(await tiposDeAlerta(animal.id, token)).toEqual(expect.arrayContaining(["dose_vencida", "esquema_vacinal_incompleto"]));

    const protocolo = await prisma.protocoloVacinal.findFirstOrThrow({ where: { animalId: animal.id, vacinaId: vacina.id } });
    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/vacinacao/protocolos/${protocolo.id}/interromper`)
      .set(auth(token))
      .send({ motivo: "contraindicacao clinica" })
      .expect(201);

    const interrompido = await tiposDeAlerta(animal.id, token);
    expect(interrompido).toContain("protocolo_vacinal_interrompido");
    expect(interrompido).not.toContain("dose_vencida");
    expect(interrompido).not.toContain("esquema_vacinal_incompleto");
    expect(await mensagemDoAlerta(animal.id, token, "protocolo_vacinal_interrompido")).toBe(
      `${vacina.nome}: protocolo interrompido (contraindicacao clinica).`,
    );

    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/vacinacao/protocolos/${protocolo.id}/retomar`)
      .set(auth(token))
      .expect(201);
    const retomado = await tiposDeAlerta(animal.id, token);
    expect(retomado).not.toContain("protocolo_vacinal_interrompido");
    expect(retomado).toContain("dose_vencida");
  });

  it("alerta a observação antirrábica em curso com os dias restantes e depois como vencida", async () => {
    const token = tokens.get("agente")!;
    const animal = await criarAnimalAntigo(tokens.get("coordenacao")!);

    await patchAnimal(animal.id, token, { situacao: "em_observacao_antirrabica" });
    expect(await mensagemDoAlerta(animal.id, token, "observacao_antirrabica_em_curso")).toMatch(/faltam 10 dias/);

    await prisma.animal.update({ where: { id: animal.id }, data: { observacaoAntirrabicaInicioEm: diasAtras(9) } });
    expect(await mensagemDoAlerta(animal.id, token, "observacao_antirrabica_em_curso")).toMatch(/falta 1 dia/);

    await prisma.animal.update({ where: { id: animal.id }, data: { observacaoAntirrabicaInicioEm: diasAtras(10) } });
    const noPrazo = await tiposDeAlerta(animal.id, token);
    expect(noPrazo).toContain("observacao_antirrabica_vencida");
    expect(noPrazo).not.toContain("observacao_antirrabica_em_curso");
    expect(await mensagemDoAlerta(animal.id, token, "observacao_antirrabica_vencida")).toMatch(/observação final/i);

    await prisma.animal.update({ where: { id: animal.id }, data: { observacaoAntirrabicaInicioEm: diasAtras(14) } });
    expect(await mensagemDoAlerta(animal.id, token, "observacao_antirrabica_vencida")).toMatch(/há 4 dias/);

    // Encerrar tira os dois alertas.
    await request(app.getHttpServer())
      .post(`/animais/${animal.id}/encerrar-observacao-antirrabica`)
      .set(auth(token))
      .send({ observacaoFinal: "Sem sinais.", situacao: "saudavel" })
      .expect(201);
    const encerrado = await tiposDeAlerta(animal.id, token);
    expect(encerrado).not.toContain("observacao_antirrabica_vencida");
    expect(encerrado).not.toContain("observacao_antirrabica_em_curso");
  });

  it("alerta reação adversa em acompanhamento e para quando a cadeia fecha o desfecho", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimalAntigo(token);
    const aplicacaoId = await aplicarVacina(animal.id);

    const raiz = await reacao(animal.id, token, {
      resumo: "Apatia",
      gravidadeReacao: "grave",
      desfechoReacao: "em_acompanhamento",
      aplicacaoVacinaId: aplicacaoId,
    });
    expect(await mensagemDoAlerta(animal.id, token, "reacao_adversa_em_acompanhamento")).toBe(
      "Reação adversa grave registrada hoje segue em acompanhamento.",
    );

    // O alerta segue o desfecho corrente da cadeia, não o do primeiro evento.
    await reacao(animal.id, token, {
      resumo: "Alta",
      gravidadeReacao: "leve",
      desfechoReacao: "resolvida",
      eventoOrigemId: raiz.id,
    });
    expect(await tiposDeAlerta(animal.id, token)).not.toContain("reacao_adversa_em_acompanhamento");

    // Reação nova reabre o alerta, e a contagem de dias usa a data do registro.
    const antiga = await reacao(animal.id, token, {
      resumo: "Edema",
      gravidadeReacao: "moderada",
      desfechoReacao: "em_acompanhamento",
    });
    await prisma.eventoAnimal.update({ where: { id: antiga.id }, data: { createdAt: diasAtras(3) } });
    expect(await mensagemDoAlerta(animal.id, token, "reacao_adversa_em_acompanhamento")).toBe(
      "Reação adversa moderada registrada há 3 dias segue em acompanhamento.",
    );
  });

  it("não gera alerta de vacinação, observação ou reação em animal em situação terminal", async () => {
    const token = tokens.get("coordenacao")!;
    const animal = await criarAnimalAntigo(token);
    const vacina = await criarVacina({ totalDoses: 3, intervaloDosesDias: 21, obrigatoria: true });
    await aplicar(animal.id, vacina.id, -30);
    await reacao(animal.id, token, { resumo: "x", gravidadeReacao: "leve", desfechoReacao: "em_acompanhamento" });
    await prisma.animal.update({
      where: { id: animal.id },
      data: { situacao: "em_observacao_antirrabica", observacaoAntirrabicaInicioEm: diasAtras(12) },
    });

    const operacional = await tiposDeAlerta(animal.id, token);
    expect(operacional).toEqual(expect.arrayContaining([
      "dose_vencida",
      "esquema_vacinal_incompleto",
      "observacao_antirrabica_vencida",
      "reacao_adversa_em_acompanhamento",
    ]));

    await prisma.animal.update({ where: { id: animal.id }, data: { situacao: "obito" } });
    const terminal = await tiposDeAlerta(animal.id, token);
    for (const tipo of [
      "dose_vencida",
      "esquema_vacinal_incompleto",
      "sem_vacinacao_registrada",
      "vacina_obrigatoria_pendente",
      "observacao_antirrabica_vencida",
      "observacao_antirrabica_em_curso",
      "reacao_adversa_em_acompanhamento",
      "protocolo_vacinal_interrompido",
    ]) {
      expect(terminal).not.toContain(tipo);
    }
    // As pendências de cadastro continuam.
    expect(terminal).toContain("sem_baia");
  });

  it("mostra os mesmos alertas na listagem e na ficha, e a listagem não devolve protocolos nem eventos", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimalAntigo(token);
    const vacina = await criarVacina({ totalDoses: 3, intervaloDosesDias: 21 });
    await aplicar(animal.id, vacina.id, -25);
    await reacao(animal.id, token, { resumo: "x", gravidadeReacao: "leve", desfechoReacao: "em_acompanhamento" });

    const lista = await request(app.getHttpServer())
      .get(`/animais?busca=${animal.numeroRegistro}`)
      .set(auth(token))
      .expect(200);
    const naLista = lista.body.items.find((item: { id: number }) => item.id === animal.id);
    const ficha = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(token)).expect(200);

    expect(naLista.alertas.map((a: { tipo: string }) => a.tipo).sort()).toEqual(
      ficha.body.alertas.map((a: { tipo: string }) => a.tipo).sort(),
    );
    // Os dados só de cálculo não viajam na resposta.
    expect(naLista.protocolosVacinais).toBeUndefined();
    expect(naLista.eventos).toBeUndefined();
    expect(ficha.body.protocolosVacinais).toBeUndefined();
    // A ficha continua com a timeline completa e as reações derivadas.
    expect(Array.isArray(ficha.body.eventos)).toBe(true);
    expect(ficha.body.eventos.length).toBeGreaterThan(1);
    expect(ficha.body.reacoesAdversas).toHaveLength(1);

    // O filtro de alertas da listagem enxerga os alertas de vacinação.
    const comAlertas = await request(app.getHttpServer())
      .get(`/animais?busca=${animal.numeroRegistro}&comAlertas=true`)
      .set(auth(token))
      .expect(200);
    expect(comAlertas.body.items.map((i: { id: number }) => i.id)).toContain(animal.id);
  });

  // Os cenários de alerta aplicam doses de até 60 dias atrás; o acolhimento precisa ser anterior a isso,
  // senão a API recusa como registro retroativo sem indicador.
  async function criarAnimalAntigo(token: string, overrides: Partial<ReturnType<typeof nextAnimal>> = {}) {
    return criarAnimal(token, { dataAcolhimento: "2026-01-10T12:00:00.000Z", ...overrides });
  }

  async function tiposDeAlerta(animalId: number, token: string): Promise<string[]> {
    const ficha = await request(app.getHttpServer()).get(`/animais/${animalId}`).set(auth(token)).expect(200);
    return (ficha.body.alertas as { tipo: string }[]).map((alerta) => alerta.tipo);
  }

  async function mensagensDeAlerta(animalId: number, token: string, tipo: string): Promise<string[]> {
    const ficha = await request(app.getHttpServer()).get(`/animais/${animalId}`).set(auth(token)).expect(200);
    return (ficha.body.alertas as { tipo: string; mensagem: string }[])
      .filter((alerta) => alerta.tipo === tipo)
      .map((alerta) => alerta.mensagem);
  }

  async function mensagemDoAlerta(animalId: number, token: string, tipo: string): Promise<string> {
    const encontradas = await mensagensDeAlerta(animalId, token, tipo);
    if (encontradas.length !== 1) {
      throw new Error(`Esperava exatamente 1 alerta "${tipo}", achei ${encontradas.length}: ${JSON.stringify(encontradas)}`);
    }
    return encontradas[0];
  }

  async function aplicarComLote(animalId: number, vacinaId: number, lote: string) {
    const response = await request(app.getHttpServer())
      .post(`/animais/${animalId}/vacinacao/aplicacoes`)
      .set(auth(tokens.get("veterinario")!))
      .send({ vacinaId, dataAplicacao: formatDataCivil(hojeCivil()), lote });
    if (response.status !== 201) {
      throw new Error(`Esperava 201 ao aplicar com lote, veio ${response.status}: ${JSON.stringify(response.body)}`);
    }
    return response.body.aplicacao.id as number;
  }

  function diaCivil(offset: number) {
    return new Date(`${formatDataCivil(addDias(hojeCivil(), offset))}T00:00:00.000Z`);
  }

  async function criarVacina(dados: {
    totalDoses: number;
    intervaloDosesDias?: number;
    revacinacaoDias?: number;
    diasAvisoProximaDose?: number;
    obrigatoria?: boolean;
    especies?: ("cao" | "gato")[];
  }) {
    seq += 1;
    const nome = `Alerta ${STAMP}-${seq}`;
    return prisma.vacina.create({
      data: {
        nome,
        nomeNormalizado: nome.toLocaleLowerCase("pt-BR"),
        especies: dados.especies ?? ["cao", "gato"],
        totalDoses: dados.totalDoses,
        intervaloDosesDias: dados.intervaloDosesDias ?? null,
        revacinacaoDias: dados.revacinacaoDias ?? null,
        diasAvisoProximaDose: dados.diasAvisoProximaDose ?? 7,
        obrigatoria: dados.obrigatoria ?? false,
      },
    });
  }

  async function aplicar(animalId: number, vacinaId: number, offsetDias: number) {
    seq += 1;
    const response = await request(app.getHttpServer())
      .post(`/animais/${animalId}/vacinacao/aplicacoes`)
      .set(auth(tokens.get("veterinario")!))
      .send({
        vacinaId,
        dataAplicacao: formatDataCivil(addDias(hojeCivil(), offsetDias)),
        lote: `LAL-${STAMP}-${seq}`,
        confirmaAdiantada: true,
        motivoAdiantada: "cenario de teste",
      });
    if (response.status !== 201) {
      throw new Error(`Esperava 201 ao aplicar, veio ${response.status}: ${JSON.stringify(response.body)}`);
    }
    return response.body.aplicacao.id as number;
  }

  it("informa na consulta por lote quais aplicações tiveram reação adversa, com o desfecho corrente", async () => {
    const token = tokens.get("veterinario")!;
    const vacina = await criarVacina({ totalDoses: 3, intervaloDosesDias: 21 });
    const lote = `LR${STAMP}`;
    const comReacao = await criarAnimalAntigo(token);
    const semReacao = await criarAnimalAntigo(token);

    const aplicacaoA = await aplicarComLote(comReacao.id, vacina.id, lote);
    await aplicarComLote(semReacao.id, vacina.id, lote);

    const raiz = await reacao(comReacao.id, token, {
      resumo: "Edema",
      gravidadeReacao: "grave",
      desfechoReacao: "em_acompanhamento",
      aplicacaoVacinaId: aplicacaoA,
    });

    const antes = await request(app.getHttpServer()).get(`/vacinacao/aplicacoes?lote=${lote}`).set(auth(token)).expect(200);
    const itemComReacao = antes.body.items.find((i: { animal: { id: number } }) => i.animal.id === comReacao.id);
    const itemSem = antes.body.items.find((i: { animal: { id: number } }) => i.animal.id === semReacao.id);
    expect(itemSem.reacoesAdversas).toEqual([]);
    expect(itemComReacao.reacoesAdversas).toEqual([
      { id: raiz.id, gravidade: "grave", desfecho: "em_acompanhamento", emAcompanhamento: true },
    ]);

    // O desfecho exibido é o corrente da cadeia, não o do primeiro evento.
    await reacao(comReacao.id, token, {
      resumo: "Alta",
      gravidadeReacao: "leve",
      desfechoReacao: "resolvida",
      eventoOrigemId: raiz.id,
    });
    const depois = await request(app.getHttpServer()).get(`/vacinacao/aplicacoes?lote=${lote}`).set(auth(token)).expect(200);
    const atualizado = depois.body.items.find((i: { animal: { id: number } }) => i.animal.id === comReacao.id);
    expect(atualizado.reacoesAdversas).toEqual([
      { id: raiz.id, gravidade: "leve", desfecho: "resolvida", emAcompanhamento: false },
    ]);
  });

  it("não muda a situação do animal quando o desfecho da reação é óbito", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimalAntigo(token);
    const aplicacaoId = await aplicarVacina(animal.id);

    await reacao(animal.id, token, {
      resumo: "Choque anafilático",
      gravidadeReacao: "grave",
      desfechoReacao: "obito",
      aplicacaoVacinaId: aplicacaoId,
    });

    // São registros independentes: a reação descreve o quadro, a situação é ação separada e explícita.
    const ficha = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(token)).expect(200);
    expect(ficha.body.situacao).toBe("em_tratamento");
    expect(ficha.body.somenteLeitura).toBe(false);
    expect(ficha.body.reacoesAdversas[0]).toMatchObject({ desfecho: "obito", emAcompanhamento: false });
  });

  it("não bloqueia vacinar animal em observação antirrábica, inclusive com a própria antirrábica", async () => {
    const token = tokens.get("veterinario")!;
    const animal = await criarAnimalAntigo(token);
    await patchAnimal(animal.id, token, { situacao: "em_observacao_antirrabica" });

    const antirrabica = await prisma.vacina.findFirstOrThrow({ where: { nomeNormalizado: "antirrábica" } });
    const resposta = await request(app.getHttpServer())
      .post(`/animais/${animal.id}/vacinacao/aplicacoes`)
      .set(auth(token))
      .send({ vacinaId: antirrabica.id, dataAplicacao: formatDataCivil(hojeCivil()), lote: `LAB-${STAMP}` });
    expect(resposta.status).toBe(201);

    // A situação não muda por causa da vacina.
    const ficha = await request(app.getHttpServer()).get(`/animais/${animal.id}`).set(auth(token)).expect(200);
    expect(ficha.body.situacao).toBe("em_observacao_antirrabica");

    // Outra vacina qualquer também passa.
    await aplicarVacina(animal.id);
  });

  function diasAtras(dias: number) {
    return new Date(Date.now() - dias * 86_400_000);
  }

  function patchAnimal(id: number, token: string, body: Record<string, unknown>) {
    return request(app.getHttpServer()).patch(`/animais/${id}`).set(auth(token)).send(body).expect(200);
  }

  async function reacao(animalId: number, token: string, body: Record<string, unknown>) {
    const response = await request(app.getHttpServer())
      .post(`/animais/${animalId}/eventos`)
      .set(auth(token))
      .send({ tipo: "reacao_adversa", ...body })
      .expect(201);
    return response.body as { id: number; eventoOrigemId: number | null; aplicacaoVacinaId: number | null };
  }

  // Aplica uma vacina criada só para este spec, para a reação ter a que se ligar.
  async function aplicarVacina(animalId: number, esquema: { totalDoses: number; intervaloDosesDias?: number } = { totalDoses: 3, intervaloDosesDias: 21 }) {
    const vacina = await criarVacina(esquema);
    return aplicar(animalId, vacina.id, 0);
  }

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

async function imagemAssinaturaTeste() {
  const { data, info } = await sharp({
    create: { width: 256, height: 128, channels: 3, background: "white" },
  }).raw().toBuffer({ resolveWithObject: true });
  for (let x = 20; x < 220; x += 1) {
    const y = Math.round(76 - 42 * Math.sin((x - 20) / 18) - 18 * Math.sin((x - 20) / 5));
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < info.width && py >= 0 && py < info.height) {
          const offset = (py * info.width + px) * info.channels;
          data[offset] = 0;
          data[offset + 1] = 0;
          data[offset + 2] = 0;
        }
      }
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
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
  const animais = await prisma.animal.findMany({
    where: { numeroRegistroNormalizado: { startsWith: `ani-${STAMP}` } },
    select: { id: true },
  });
  const animalIds = animais.map((animal) => animal.id);
  if (animalIds.length > 0) {
    const adocoes = await prisma.adocao.findMany({ where: { animalId: { in: animalIds } }, select: { id: true } });
    const adocaoIds = adocoes.map((adocao) => adocao.id);
    await prisma.devolucao.deleteMany({ where: { adocaoId: { in: adocaoIds } } });
    await prisma.adocao.deleteMany({ where: { id: { in: adocaoIds } } });
  }
  await prisma.animal.deleteMany({
    where: { numeroRegistroNormalizado: { startsWith: `ani-${STAMP}` } },
  });
  await prisma.vacina.deleteMany({
    where: { OR: [{ nomeNormalizado: { startsWith: `reacao ${STAMP}` } }, { nomeNormalizado: { startsWith: `alerta ${STAMP}` } }] },
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
