import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PerfilAcesso, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../app.module";
import { addDias, formatDataCivil, hojeCivil } from "./datas";

loadLocalEnv(resolve(__dirname, "../../.env"));

const EMAIL_SUFFIX = "@aplicacoes-test.gov.br";
const SENHA = "senha-teste-123";
const STAMP = String(Date.now()).slice(-8);
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

// Data civil relativa a hoje, no mesmo fuso que o serviço usa.
function dia(offset: number): string {
  return formatDataCivil(addDias(hojeCivil(), offset))!;
}

type Resposta = { aplicacao: any; protocolo: any; avisos?: any[]; agendamentoReaberto?: boolean }; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("vacinação: protocolos e aplicações", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let seq = 0;
  const usuarios = new Map<PerfilAcesso, { id: number; cpf: string }>();
  const tokens = new Map<PerfilAcesso, string>();
  let v3: number; // 3 doses, intervalo 21, revacinação 365, cão
  let vUnica: number; // 1 dose, sem revacinação, cão
  let vIdade: number; // 1 dose, revacinação 365, idade mínima 12 semanas, cão e gato
  let vGato: number; // só gato
  let vInativa: number;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está definido.");
    process.env.JWT_SECRET ??= "test-only-jwt-secret";
    prisma = new PrismaClient();
    await cleanup(prisma);

    for (const perfil of PERFIS) usuarios.set(perfil, await createUsuario(prisma, perfil));

    v3 = await criarVacina({ nome: "v3", totalDoses: 3, intervaloDosesDias: 21, revacinacaoDias: 365 });
    vUnica = await criarVacina({ nome: "unica", totalDoses: 1 });
    vIdade = await criarVacina({
      nome: "idade",
      totalDoses: 1,
      revacinacaoDias: 365,
      idadeMinimaSemanas: 12,
      especies: ["cao", "gato"],
    });
    vGato = await criarVacina({ nome: "gato", totalDoses: 1, especies: ["gato"] });
    vInativa = await criarVacina({ nome: "inativa", totalDoses: 1, ativa: false });

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

  it("exige autenticação, libera a consulta e restringe a escrita conforme o perfil", async () => {
    const animal = await novoAnimal();
    const { aplicacao, protocolo } = await aplicar(animal, v3, -30);

    const http = () => request(app.getHttpServer());
    const rotas = [
      () => http().get(`/animais/${animal}/vacinacao`),
      () => http().post(`/animais/${animal}/vacinacao/aplicacoes`).send(corpo(v3, -1)),
      () => http().patch(`/animais/${animal}/vacinacao/aplicacoes/${aplicacao.id}`).send({ observacao: "x" }),
      () => http().post(`/animais/${animal}/vacinacao/aplicacoes/${aplicacao.id}/anular`).send({ motivo: "x" }),
      () => http().post(`/animais/${animal}/vacinacao/protocolos/${protocolo.id}/interromper`).send({ motivo: "x" }),
      () => http().post(`/animais/${animal}/vacinacao/protocolos/${protocolo.id}/retomar`),
      () => http().get("/vacinacao/aplicacoes?lote=x"),
    ];
    for (const rota of rotas) await rota().expect(401);

    for (const perfil of PERFIS) {
      await http().get(`/animais/${animal}/vacinacao`).set(auth(perfil)).expect(200);
      await http().get("/vacinacao/aplicacoes?lote=qualquer").set(auth(perfil)).expect(200);
    }

    for (const perfil of ["agente", "recepcao"] as PerfilAcesso[]) {
      await http().post(`/animais/${animal}/vacinacao/aplicacoes`).set(auth(perfil)).send(corpo(v3, -1)).expect(403);
      await http().patch(`/animais/${animal}/vacinacao/aplicacoes/${aplicacao.id}`).set(auth(perfil)).send({ observacao: "x" }).expect(403);
      await http().post(`/animais/${animal}/vacinacao/aplicacoes/${aplicacao.id}/anular`).set(auth(perfil)).send({ motivo: "x" }).expect(403);
      await http().post(`/animais/${animal}/vacinacao/protocolos/${protocolo.id}/interromper`).set(auth(perfil)).send({ motivo: "x" }).expect(403);
      await http().post(`/animais/${animal}/vacinacao/protocolos/${protocolo.id}/retomar`).set(auth(perfil)).expect(403);
    }
    // Anular é exclusivo da Coordenação: nem o veterinário.
    await http().post(`/animais/${animal}/vacinacao/aplicacoes/${aplicacao.id}/anular`).set(auth("veterinario")).send({ motivo: "x" }).expect(403);

    await http().delete(`/animais/${animal}/vacinacao/aplicacoes/${aplicacao.id}`).set(auth("coordenacao")).expect(404);
    expect(await prisma.aplicacaoVacina.count({ where: { animalId: animal, anuladaEm: null } })).toBe(1);
    await http().get("/animais/999999999/vacinacao").set(auth("agente")).expect(404);
  });

  it("recusa vacina de outra espécie, inativa ou inexistente sem criar protocolo nem aplicação", async () => {
    const animal = await novoAnimal();

    const especie = await tentar(animal, corpo(vGato, -1), "veterinario").expect(409);
    expect(especie.body.codigo).toBe("especie_incompativel");
    expect(especie.body.message).toMatch(/gato/);
    expect(especie.body.message).toMatch(/cão/);

    const inativa = await tentar(animal, corpo(vInativa, -1), "veterinario").expect(409);
    expect(inativa.body.codigo).toBe("vacina_inativa");

    await tentar(animal, corpo(999999999, -1), "veterinario").expect(404);
    await tentar(999999999, corpo(v3, -1), "veterinario").expect(404);

    expect(await prisma.protocoloVacinal.count({ where: { animalId: animal } })).toBe(0);
    expect(await prisma.aplicacaoVacina.count({ where: { animalId: animal } })).toBe(0);
  });

  it("registra a primeira dose criando o protocolo, o evento da timeline e a auditoria", async () => {
    const animal = await novoAnimal();
    const r = await aplicar(animal, v3, -30, { aplicadoPor: "  Dra.   Ana " }, "veterinario");

    expect(r.aplicacao.numeroDose).toBe(1);
    expect(r.aplicacao.registradoPor.id).toBe(usuarios.get("veterinario")!.id);
    expect(r.aplicacao.aplicadoPor).toBe("Dra. Ana");
    expect(r.aplicacao.aplicadaAdiantada).toBe(false);
    expect(r.protocolo).toMatchObject({
      status: "em_andamento",
      dosesPrevistas: 3,
      dosesAplicadas: 1,
      dosesFaltantes: 2,
      proximoNumeroDose: 2,
      dataUltimaAplicacao: dia(-30),
      dataMinimaProximaDose: dia(-9),
      dataProximaDose: dia(-9),
      diasAvisoProximaDose: 7,
    });
    expect(r.avisos).toEqual([]);

    const eventos = await prisma.eventoAnimal.findMany({ where: { animalId: animal, tipo: "aplicacao_vacina" } });
    expect(eventos).toHaveLength(1);
    expect(eventos[0].usuarioId).toBe(usuarios.get("veterinario")!.id);
    expect((eventos[0].dados as { numeroDose: number }).numeroDose).toBe(1);

    const auditorias = await prisma.auditoriaEvento.findMany({
      where: { tipo: "aplicacao_vacina_registrada", usuarioId: usuarios.get("veterinario")!.id },
    });
    const dela = auditorias.find((a) => (a.dados as { entidadeId?: string }).entidadeId === String(r.aplicacao.id));
    expect((dela?.dados as { entidade: string; animalId: number }).entidade).toBe("aplicacao_vacina");
    expect((dela?.dados as { animalId: number }).animalId).toBe(animal);

    const timeline = await request(app.getHttpServer()).get(`/animais/${animal}/timeline`).set(auth("agente")).expect(200);
    expect(JSON.stringify(timeline.body)).toContain("aplicacao_vacina");
  });

  it("recusa dose já registrada, divergente e a mesma vacina no mesmo dia", async () => {
    const animal = await novoAnimal();
    await aplicar(animal, v3, -30);

    const jaRegistrada = await tentar(animal, corpo(v3, -1, { numeroDoseEsperada: 1 }), "veterinario").expect(409);
    expect(jaRegistrada.body.codigo).toBe("dose_ja_registrada");

    const divergente = await tentar(animal, corpo(v3, -1, { numeroDoseEsperada: 3 }), "veterinario").expect(409);
    expect(divergente.body.codigo).toBe("dose_divergente");
    expect(divergente.body.numeroDoseAtual).toBe(2);

    const mesmoDia = await tentar(animal, corpo(v3, -30), "veterinario").expect(409);
    expect(mesmoDia.body.codigo).toBe("duplicidade_mesmo_dia");

    expect(await prisma.aplicacaoVacina.count({ where: { animalId: animal } })).toBe(1);
  });

  it("avisa a dose adiantada, exige confirmação e motivo e grava a decisão", async () => {
    const animal = await novoAnimal();
    await aplicar(animal, v3, -5);

    const semNada = await tentar(animal, corpo(v3, 0), "veterinario").expect(409);
    expect(semNada.body).toMatchObject({
      codigo: "aplicacao_adiantada",
      dataMinimaProximaDose: dia(16),
      diasAntecipacao: 16,
      dataUltimaAplicacao: dia(-5),
      intervaloDias: 21,
      reforco: false,
    });
    await tentar(animal, corpo(v3, 0, { confirmaAdiantada: true }), "veterinario").expect(409);
    await tentar(animal, corpo(v3, 0, { confirmaAdiantada: true, motivoAdiantada: "   " }), "veterinario").expect(409);
    await tentar(animal, corpo(v3, 0, { confirmaAdiantada: false, motivoAdiantada: "risco de surto" }), "veterinario").expect(409);
    expect(await prisma.aplicacaoVacina.count({ where: { animalId: animal } })).toBe(1);

    const ok = await aplicar(animal, v3, 0, { confirmaAdiantada: true, motivoAdiantada: " surto   no canil " }, "veterinario");
    expect(ok.aplicacao).toMatchObject({
      numeroDose: 2,
      aplicadaAdiantada: true,
      motivoAdiantada: "surto no canil",
      diasAntecipacao: 16,
    });
    const evento = await prisma.eventoAnimal.findFirstOrThrow({
      where: { animalId: animal, tipo: "aplicacao_vacina" },
      orderBy: { id: "desc" },
    });
    expect(evento.dados).toMatchObject({ aplicadaAdiantada: true, diasAntecipacao: 16, motivoAdiantada: "surto no canil" });

    // A marcação não é editável, nem por campo extra na edição.
    await request(app.getHttpServer())
      .patch(`/animais/${animal}/vacinacao/aplicacoes/${ok.aplicacao.id}`)
      .set(auth("coordenacao"))
      .send({ aplicadaAdiantada: false, motivoAdiantada: "outro", diasAntecipacao: 0, numeroDose: 9 })
      .expect(200);
    const depois = await prisma.aplicacaoVacina.findUniqueOrThrow({ where: { id: ok.aplicacao.id } });
    expect(depois).toMatchObject({ aplicadaAdiantada: true, motivoAdiantada: "surto no canil", diasAntecipacao: 16, numeroDose: 2 });
  });

  it("não marca como adiantada uma dose dentro do intervalo, mesmo com confirmação enviada", async () => {
    const animal = await novoAnimal();
    await aplicar(animal, v3, -30);
    const r = await aplicar(animal, v3, -5, { confirmaAdiantada: true, motivoAdiantada: "desnecessário" });
    expect(r.aplicacao.aplicadaAdiantada).toBe(false);
    expect(r.aplicacao.motivoAdiantada).toBeNull();
    expect(r.aplicacao.diasAntecipacao).toBeNull();
  });

  it("conclui o esquema, calcula a revacinação e trata o reforço adiantado com o mesmo aviso", async () => {
    const animal = await novoAnimal();
    await aplicar(animal, v3, -60);
    await aplicar(animal, v3, -35);
    const terceira = await aplicar(animal, v3, -10);

    expect(terceira.protocolo).toMatchObject({
      status: "concluido",
      dosesAplicadas: 3,
      dosesFaltantes: 0,
      dataMinimaProximaDose: dia(355),
      dataProximaDose: dia(355),
    });

    const adiantado = await tentar(animal, corpo(v3, 0), "coordenacao").expect(409);
    expect(adiantado.body).toMatchObject({ codigo: "aplicacao_adiantada", reforco: true, intervaloDias: 365 });

    const reforco = await aplicar(animal, v3, 0, { confirmaAdiantada: true, motivoAdiantada: "exposição" });
    expect(reforco.aplicacao.numeroDose).toBe(4);
    expect(reforco.aplicacao.aplicadaAdiantada).toBe(true);
    // O reforço não reabre o esquema inicial.
    expect(reforco.protocolo).toMatchObject({ status: "concluido", dosesAplicadas: 4, dosesFaltantes: 0, proximoNumeroDose: 5 });
  });

  it("recusa nova dose quando o esquema concluiu e a vacina não tem revacinação", async () => {
    const animal = await novoAnimal();
    const primeira = await aplicar(animal, vUnica, -10);
    expect(primeira.protocolo).toMatchObject({ status: "concluido", dosesFaltantes: 0, dataProximaDose: null, dataMinimaProximaDose: null });

    const recusada = await tentar(animal, corpo(vUnica, 0), "veterinario").expect(409);
    expect(recusada.body.codigo).toBe("esquema_concluido");
    expect(await prisma.aplicacaoVacina.count({ where: { animalId: animal } })).toBe(1);
  });

  it("recusa data futura ou inválida e trata o registro retroativo", async () => {
    const animal = await novoAnimal();

    const futura = await tentar(animal, corpo(v3, 1), "veterinario").expect(409);
    expect(futura.body.codigo).toBe("data_futura");
    await tentar(animal, { ...corpo(v3, 0), dataAplicacao: "2026-02-31" }, "veterinario").expect(400);
    await tentar(animal, { ...corpo(v3, 0), dataAplicacao: "31/12/2026" }, "veterinario").expect(400);
    await tentar(animal, { ...corpo(v3, 0), lote: "   " }, "veterinario").expect(400);

    // Acolhimento em dia(-120): antes disso só como retroativo, com observação.
    const semIndicador = await tentar(animal, corpo(v3, -200), "veterinario").expect(409);
    expect(semIndicador.body).toMatchObject({ codigo: "retroativo_sem_indicador", motivos: ["anterior_ao_acolhimento"] });
    const semObservacao = await tentar(animal, corpo(v3, -200, { registroRetroativo: true }), "veterinario").expect(409);
    expect(semObservacao.body.codigo).toBe("retroativo_sem_observacao");

    const retro = await aplicar(animal, v3, -200, { registroRetroativo: true, observacao: "Carteira trazida pelo munícipe" });
    expect(retro.aplicacao.registroRetroativo).toBe(true);

    // Dose regular depois dela: não é retroativa nem adiantada.
    const regular = await aplicar(animal, v3, -10);
    expect(regular.aplicacao).toMatchObject({ numeroDose: 2, registroRetroativo: false, aplicadaAdiantada: false });

    // Antes da última dose registrada também exige o indicador.
    const antesDaUltima = await tentar(animal, corpo(v3, -50), "veterinario").expect(409);
    expect(antesDaUltima.body.motivos).toEqual(["anterior_a_ultima_aplicacao"]);
  });

  it("anula com motivo, recalcula o protocolo, mantém a dose visível e reocupa a lacuna", async () => {
    const animal = await novoAnimal();
    await aplicar(animal, v3, -60);
    const segunda = await aplicar(animal, v3, -35);
    await aplicar(animal, v3, -10);
    const url = `/animais/${animal}/vacinacao/aplicacoes/${segunda.aplicacao.id}/anular`;

    await request(app.getHttpServer()).post(url).set(auth("coordenacao")).send({}).expect(400);
    await request(app.getHttpServer()).post(url).set(auth("coordenacao")).send({ motivo: "   " }).expect(400);

    const anulada = await request(app.getHttpServer()).post(url).set(auth("coordenacao")).send({ motivo: "  Lançada   no animal errado " }).expect(201);
    const corpoAnulada = anulada.body as Resposta;
    expect(corpoAnulada.aplicacao).toMatchObject({ anulada: true, motivoAnulacao: "Lançada no animal errado" });
    expect(corpoAnulada.aplicacao.anuladaPor.id).toBe(usuarios.get("coordenacao")!.id);
    expect(corpoAnulada.protocolo).toMatchObject({ status: "em_andamento", dosesAplicadas: 2, dosesFaltantes: 1, proximoNumeroDose: 2 });
    // A dose anulada continua visível, marcada.
    expect(corpoAnulada.protocolo.aplicacoes).toHaveLength(3);
    expect(corpoAnulada.protocolo.aplicacoes.filter((a: { anulada: boolean }) => a.anulada)).toHaveLength(1);

    expect(await prisma.eventoAnimal.count({ where: { animalId: animal, tipo: "anulacao_aplicacao_vacina" } })).toBe(1);
    const auditorias = await prisma.auditoriaEvento.findMany({ where: { tipo: "aplicacao_vacina_anulada" } });
    expect(auditorias.some((a) => (a.dados as { entidadeId?: string }).entidadeId === String(segunda.aplicacao.id))).toBe(true);

    const denovo = await request(app.getHttpServer()).post(url).set(auth("coordenacao")).send({ motivo: "x" }).expect(409);
    expect(denovo.body.codigo).toBe("aplicacao_ja_anulada");

    // Nova dose reocupa a lacuna (dose 2) em vez de colidir com a dose 3.
    const nova = await aplicar(animal, v3, -3, { numeroDoseEsperada: 2, confirmaAdiantada: true, motivoAdiantada: "refazer" });
    expect(nova.aplicacao.numeroDose).toBe(2);
    expect(nova.protocolo).toMatchObject({ status: "concluido", dosesAplicadas: 3 });
  });

  it("anular a última dose reabre o esquema e recalcula a próxima dose", async () => {
    const animal = await novoAnimal();
    await aplicar(animal, v3, -60);
    await aplicar(animal, v3, -35);
    const terceira = await aplicar(animal, v3, -10);
    expect(terceira.protocolo.status).toBe("concluido");

    const r = await request(app.getHttpServer())
      .post(`/animais/${animal}/vacinacao/aplicacoes/${terceira.aplicacao.id}/anular`)
      .set(auth("coordenacao"))
      .send({ motivo: "duplicada" })
      .expect(201);
    expect((r.body as Resposta).protocolo).toMatchObject({
      status: "em_andamento",
      dosesAplicadas: 2,
      dosesFaltantes: 1,
      dataUltimaAplicacao: dia(-35),
      dataMinimaProximaDose: dia(-14),
      dataProximaDose: dia(-14),
    });
  });

  it("reabre o agendamento baixado pela aplicação anulada, exceto se já existe outro em aberto", async () => {
    const coord = usuarios.get("coordenacao")!.id;
    const agendar = (animalId: number, protocoloId: number, status: "agendado" | "aplicado", numero: number, aplicacaoId?: number) =>
      prisma.agendamentoVacinacao.create({
        data: {
          animalId,
          vacinaId: v3,
          protocoloId,
          numeroDosePrevista: numero,
          dataHoraPrevista: new Date(`${dia(-2)}T12:00:00.000Z`),
          status,
          aplicacaoId: aplicacaoId ?? null,
          criadoPorId: coord,
        },
      });

    const a = await novoAnimal();
    const dose = await aplicar(a, v3, -30);
    const baixado = await agendar(a, dose.protocolo.id, "aplicado", 1, dose.aplicacao.id);
    expect(dose.protocolo.agendamentoEmAberto).toBeNull();

    const r = await request(app.getHttpServer())
      .post(`/animais/${a}/vacinacao/aplicacoes/${dose.aplicacao.id}/anular`)
      .set(auth("coordenacao"))
      .send({ motivo: "erro de lote" })
      .expect(201);
    expect((r.body as Resposta).agendamentoReaberto).toBe(true);
    const reaberto = await prisma.agendamentoVacinacao.findUniqueOrThrow({ where: { id: baixado.id } });
    expect(reaberto).toMatchObject({ status: "agendado", aplicacaoId: null });
    expect(reaberto.dataHoraPrevista.toISOString()).toBe(`${dia(-2)}T12:00:00.000Z`);
    expect(await prisma.eventoAnimal.count({ where: { animalId: a, tipo: "reabertura_agendamento_vacina" } })).toBe(1);
    expect((r.body as Resposta).protocolo.agendamentoEmAberto).toMatchObject({ id: baixado.id });

    const b = await novoAnimal();
    await aplicar(b, v3, -60);
    const segunda = await aplicar(b, v3, -30);
    const antigo = await agendar(b, segunda.protocolo.id, "aplicado", 2, segunda.aplicacao.id);
    const outro = await agendar(b, segunda.protocolo.id, "agendado", 3);
    const r2 = await request(app.getHttpServer())
      .post(`/animais/${b}/vacinacao/aplicacoes/${segunda.aplicacao.id}/anular`)
      .set(auth("coordenacao"))
      .send({ motivo: "erro" })
      .expect(201);
    expect((r2.body as Resposta).agendamentoReaberto).toBe(false);
    expect((await prisma.agendamentoVacinacao.findUniqueOrThrow({ where: { id: antigo.id } })).status).toBe("aplicado");
    expect((await prisma.agendamentoVacinacao.findUniqueOrThrow({ where: { id: outro.id } })).status).toBe("agendado");
  });

  it("interrompe e retoma o protocolo, bloqueando aplicação enquanto interrompido", async () => {
    const animal = await novoAnimal();
    const dose = await aplicar(animal, v3, -30);
    const base = `/animais/${animal}/vacinacao/protocolos/${dose.protocolo.id}`;

    await request(app.getHttpServer()).post(`${base}/interromper`).set(auth("veterinario")).send({}).expect(400);
    const parado = await request(app.getHttpServer()).post(`${base}/interromper`).set(auth("veterinario")).send({ motivo: "contraindicação clínica" }).expect(201);
    expect(parado.body).toMatchObject({ status: "interrompido", motivoInterrupcao: "contraindicação clínica" });
    expect(parado.body.interrompidoPor.id).toBe(usuarios.get("veterinario")!.id);

    const bloqueada = await tentar(animal, corpo(v3, -5), "veterinario").expect(409);
    expect(bloqueada.body.codigo).toBe("protocolo_interrompido");
    await request(app.getHttpServer()).post(`${base}/interromper`).set(auth("veterinario")).send({ motivo: "x" }).expect(409);

    const retomado = await request(app.getHttpServer()).post(`${base}/retomar`).set(auth("veterinario")).expect(201);
    expect(retomado.body).toMatchObject({ status: "em_andamento", motivoInterrupcao: null, interrompidoPor: null });
    await request(app.getHttpServer()).post(`${base}/retomar`).set(auth("veterinario")).expect(409);
    await aplicar(animal, v3, -5);

    expect(await prisma.eventoAnimal.count({ where: { animalId: animal, tipo: "interrupcao_protocolo_vacinal" } })).toBe(1);
    expect(await prisma.eventoAnimal.count({ where: { animalId: animal, tipo: "retomada_protocolo_vacinal" } })).toBe(1);

    const concluido = await aplicar(animal, vUnica, -10);
    await request(app.getHttpServer())
      .post(`/animais/${animal}/vacinacao/protocolos/${concluido.protocolo.id}/interromper`)
      .set(auth("veterinario"))
      .send({ motivo: "x" })
      .expect(409);
  });

  it("edita só campos não estruturais, com evento, auditoria e sem alterar o intervalo mínimo", async () => {
    const animal = await novoAnimal();
    const dose = await aplicar(animal, v3, -30, { lote: "LOTE-ORIGINAL" });
    const url = `/animais/${animal}/vacinacao/aplicacoes/${dose.aplicacao.id}`;

    await request(app.getHttpServer()).patch(url).set(auth("veterinario")).send({ lote: "   " }).expect(400);
    const r = await request(app.getHttpServer())
      .patch(url)
      .set(auth("veterinario"))
      .send({ lote: "  lote   novo ", validadeLote: dia(200), observacao: "Anotação", aplicadoPor: "Dr. Beto", dataProximaDose: dia(50) })
      .expect(200);
    const editada = r.body as Resposta;
    expect(editada.aplicacao).toMatchObject({
      lote: "lote novo",
      validadeLote: dia(200),
      observacao: "Anotação",
      aplicadoPor: "Dr. Beto",
      dataProximaDose: dia(50),
      dataProximaDoseCalculada: dia(-9),
    });
    expect(editada.protocolo.dataProximaDose).toBe(dia(50));
    expect(editada.protocolo.dataMinimaProximaDose).toBe(dia(-9));
    expect((await prisma.aplicacaoVacina.findUniqueOrThrow({ where: { id: dose.aplicacao.id } })).loteNormalizado).toBe("lote novo");

    const evento = await prisma.eventoAnimal.findFirstOrThrow({ where: { animalId: animal, tipo: "edicao_aplicacao_vacina" } });
    expect((evento.dados as { mudancas: Record<string, unknown> }).mudancas).toHaveProperty("lote");
    const auditorias = await prisma.auditoriaEvento.findMany({ where: { tipo: "aplicacao_vacina_editada" } });
    expect(auditorias.some((a) => (a.dados as { entidadeId?: string }).entidadeId === String(dose.aplicacao.id))).toBe(true);

    // Repetir os mesmos valores não gera novo evento.
    await request(app.getHttpServer()).patch(url).set(auth("veterinario")).send({ lote: "lote novo", observacao: "Anotação" }).expect(200);
    expect(await prisma.eventoAnimal.count({ where: { animalId: animal, tipo: "edicao_aplicacao_vacina" } })).toBe(1);

    // Limpar a próxima dose editada.
    const limpa = await request(app.getHttpServer()).patch(url).set(auth("coordenacao")).send({ dataProximaDose: null }).expect(200);
    expect((limpa.body as Resposta).protocolo.dataProximaDose).toBeNull();

    // Aplicação anulada não é editável.
    await request(app.getHttpServer()).post(`${url}/anular`).set(auth("coordenacao")).send({ motivo: "x" }).expect(201);
    const anulada = await request(app.getHttpServer()).patch(url).set(auth("coordenacao")).send({ observacao: "y" }).expect(409);
    expect(anulada.body.codigo).toBe("aplicacao_anulada");
  });

  it("mantém animal em situação terminal somente para consulta", async () => {
    const animal = await novoAnimal();
    const dose = await aplicar(animal, v3, -30);
    await prisma.animal.update({ where: { id: animal }, data: { situacao: "obito" } });

    const registro = await tentar(animal, corpo(v3, -1), "coordenacao").expect(409);
    expect(registro.body.codigo).toBe("animal_terminal");
    const url = `/animais/${animal}/vacinacao`;
    await request(app.getHttpServer()).patch(`${url}/aplicacoes/${dose.aplicacao.id}`).set(auth("coordenacao")).send({ observacao: "x" }).expect(409);
    await request(app.getHttpServer()).post(`${url}/aplicacoes/${dose.aplicacao.id}/anular`).set(auth("coordenacao")).send({ motivo: "x" }).expect(409);
    await request(app.getHttpServer()).post(`${url}/protocolos/${dose.protocolo.id}/interromper`).set(auth("coordenacao")).send({ motivo: "x" }).expect(409);

    const leitura = await request(app.getHttpServer()).get(url).set(auth("recepcao")).expect(200);
    expect(leitura.body).toMatchObject({ situacao: "obito", somenteLeitura: true });
    expect(leitura.body.protocolos).toHaveLength(1);
    expect(await prisma.aplicacaoVacina.count({ where: { animalId: animal, anuladaEm: null } })).toBe(1);
  });

  it("consulta por lote com normalização, incluindo aplicações anuladas e paginação", async () => {
    const lote = `LT${STAMP}`;
    const a1 = await novoAnimal();
    const a2 = await novoAnimal();
    const a3 = await novoAnimal();
    await aplicar(a1, v3, -30, { lote: `  ${lote.toLowerCase()}  ` });
    await aplicar(a2, v3, -30, { lote: lote.toUpperCase() });
    const anulada = await aplicar(a3, vUnica, -30, { lote });
    await request(app.getHttpServer())
      .post(`/animais/${a3}/vacinacao/aplicacoes/${anulada.aplicacao.id}/anular`)
      .set(auth("coordenacao"))
      .send({ motivo: "erro" })
      .expect(201);
    await aplicar(await novoAnimal(), v3, -30, { lote: `${lote}-OUTRO` });

    const todas = await request(app.getHttpServer()).get(`/vacinacao/aplicacoes?lote=${encodeURIComponent(`  ${lote}  `)}`).set(auth("agente")).expect(200);
    expect(todas.body.total).toBe(3);
    const animais = todas.body.items.map((i: { animal: { id: number } }) => i.animal.id).sort();
    expect(animais).toEqual([a1, a2, a3].sort());
    const item = todas.body.items.find((i: { animal: { id: number } }) => i.animal.id === a3);
    expect(item).toMatchObject({ anulada: true, numeroDose: 1, dataAplicacao: dia(-30) });
    expect(item.vacina.nome).toContain("unica");

    const filtrada = await request(app.getHttpServer()).get(`/vacinacao/aplicacoes?lote=${lote}&vacinaId=${v3}`).set(auth("agente")).expect(200);
    expect(filtrada.body.total).toBe(2);
    const pagina = await request(app.getHttpServer()).get(`/vacinacao/aplicacoes?lote=${lote}&limite=2&pagina=2`).set(auth("agente")).expect(200);
    expect(pagina.body).toMatchObject({ total: 3, pagina: 2, limite: 2 });
    expect(pagina.body.items).toHaveLength(1);

    await request(app.getHttpServer()).get("/vacinacao/aplicacoes").set(auth("agente")).expect(400);
    await request(app.getHttpServer()).get("/vacinacao/aplicacoes?lote=%20%20%20").set(auth("agente")).expect(400);
  });

  it("avisa, sem recusar, quando o animal é mais novo que a idade mínima da vacina", async () => {
    const novo = await novoAnimal({ dataNascimento: new Date(`${dia(-57)}T00:00:00.000Z`) });
    const r = await aplicar(novo, vIdade, -1);
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos![0]).toMatchObject({ codigo: "idade_minima", idadeSemanas: 8, idadeMinimaSemanas: 12, idadeAproximada: false });

    const estimado = await novoAnimal({ idadeEstimadaQuantidade: 2, idadeEstimadaUnidade: "meses" });
    const e = await aplicar(estimado, vIdade, -1);
    expect(e.avisos![0]).toMatchObject({ codigo: "idade_minima", idadeAproximada: true });

    const adulto = await novoAnimal({ dataNascimento: new Date(`${dia(-400)}T00:00:00.000Z`) });
    expect((await aplicar(adulto, vIdade, -1)).avisos).toEqual([]);
    expect((await aplicar(await novoAnimal(), vIdade, -1)).avisos).toEqual([]);
  });

  it("resolve a concorrência pela mesma dose: uma grava, a outra recebe conflito, sem erro 500", async () => {
    for (let rodada = 0; rodada < 3; rodada += 1) {
      const animal = await novoAnimal();
      const disparos = await Promise.all(
        [0, 1].map(() => tentar(animal, corpo(v3, -1), rodada % 2 === 0 ? "veterinario" : "coordenacao")),
      );
      expect(disparos.map((d) => d.status).sort()).toEqual([201, 409]);
      expect(disparos.find((d) => d.status === 409)!.body.codigo).toMatch(/^(conflito_concorrencia|duplicidade_mesmo_dia)$/);
      expect(await prisma.aplicacaoVacina.count({ where: { animalId: animal, anuladaEm: null } })).toBe(1);
      expect(await prisma.protocoloVacinal.count({ where: { animalId: animal } })).toBe(1);
    }
  });

  it("o índice único parcial responde pelo mesmo conflito quando o serviço é contornado", async () => {
    const animal = await novoAnimal();
    const dose = await aplicar(animal, v3, -30);
    const duplicada = prisma.aplicacaoVacina.create({
      data: {
        animalId: animal,
        vacinaId: v3,
        protocoloId: dose.protocolo.id,
        numeroDose: 1,
        dataAplicacao: new Date(`${dia(-20)}T00:00:00.000Z`),
        lote: "X",
        loteNormalizado: "x",
      },
    });
    await expect(duplicada).rejects.toMatchObject({ code: "P2002" });
  });

  function corpo(vacinaId: number, offset: number, extra: Record<string, unknown> = {}) {
    seq += 1;
    return { vacinaId, dataAplicacao: dia(offset), lote: `L-${STAMP}-${seq}`, ...extra };
  }

  function tentar(animalId: number, body: Record<string, unknown>, perfil: PerfilAcesso = "veterinario") {
    return request(app.getHttpServer())
      .post(`/animais/${animalId}/vacinacao/aplicacoes`)
      .set(auth(perfil))
      .send(body);
  }

  async function aplicar(
    animalId: number,
    vacinaId: number,
    offset: number,
    extra: Record<string, unknown> = {},
    perfil: PerfilAcesso = "veterinario",
  ): Promise<Resposta> {
    const resposta = await tentar(animalId, corpo(vacinaId, offset, extra), perfil);
    if (resposta.status !== 201) {
      throw new Error(`Esperava 201 ao aplicar (${offset}), veio ${resposta.status}: ${JSON.stringify(resposta.body)}`);
    }
    return resposta.body as Resposta;
  }

  async function novoAnimal(
    extra: Partial<{
      especie: "cao" | "gato";
      dataNascimento: Date;
      idadeEstimadaQuantidade: number;
      idadeEstimadaUnidade: "dias" | "meses" | "anos";
    }> = {},
  ) {
    seq += 1;
    const animal = await prisma.animal.create({
      data: {
        nome: `Animal Vacina ${seq}`,
        numeroRegistro: `APL-${STAMP}-${seq}`,
        numeroRegistroNormalizado: `apl-${STAMP}-${seq}`,
        especie: extra.especie ?? "cao",
        dataAcolhimento: new Date(`${dia(-120)}T00:00:00.000Z`),
        dataNascimento: extra.dataNascimento ?? null,
        idadeEstimadaQuantidade: extra.idadeEstimadaQuantidade ?? null,
        idadeEstimadaUnidade: extra.idadeEstimadaUnidade ?? null,
      },
    });
    return animal.id;
  }

  async function criarVacina(dados: {
    nome: string;
    totalDoses: number;
    intervaloDosesDias?: number;
    revacinacaoDias?: number;
    idadeMinimaSemanas?: number;
    especies?: ("cao" | "gato")[];
    ativa?: boolean;
  }) {
    const nome = `${dados.nome} apl ${STAMP}`;
    const vacina = await prisma.vacina.create({
      data: {
        nome,
        nomeNormalizado: nome.toLocaleLowerCase("pt-BR"),
        especies: dados.especies ?? ["cao"],
        totalDoses: dados.totalDoses,
        intervaloDosesDias: dados.intervaloDosesDias ?? null,
        revacinacaoDias: dados.revacinacaoDias ?? null,
        idadeMinimaSemanas: dados.idadeMinimaSemanas ?? null,
        ativa: dados.ativa ?? true,
      },
    });
    return vacina.id;
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
  const cpf = `4${STAMP}${String(index).padStart(2, "0")}`.slice(0, 11);
  const usuario = await prisma.usuario.create({
    data: {
      nome: `Usuário Aplicações ${perfil}`,
      email: `${perfil}-${STAMP}${EMAIL_SUFFIX}`,
      senhaHash,
      cpf,
      perfilAcesso: perfil,
      ativo: true,
      funcionario: {
        create: {
          matricula: `P${STAMP.slice(0, 5)}${index}`,
          cargo: perfil,
          crmv: perfil === "veterinario" || perfil === "coordenacao" ? "12345" : null,
        },
      },
    },
  });
  return { id: usuario.id, cpf };
}

async function cleanup(prisma: PrismaClient) {
  await prisma.animal.deleteMany({ where: { numeroRegistroNormalizado: { startsWith: `apl-${STAMP}` } } });
  await prisma.vacina.deleteMany({ where: { nomeNormalizado: { contains: `apl ${STAMP}` } } });

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
