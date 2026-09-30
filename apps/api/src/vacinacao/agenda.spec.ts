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

const EMAIL_SUFFIX = "@agenda-test.gov.br";
const SENHA = "senha-teste-123";
const STAMP = String(Date.now()).slice(-8);
const PERFIS: PerfilAcesso[] = ["coordenacao", "veterinario", "agente", "recepcao"];
const CLINICOS: PerfilAcesso[] = ["coordenacao", "veterinario"];
const SEM_ESCRITA: PerfilAcesso[] = ["agente", "recepcao"];

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

function dia(offset: number): string {
  return formatDataCivil(addDias(hojeCivil(), offset))!;
}

// Instante previsto do agendamento, relativo a agora.
function instante(horasDeAgora: number): string {
  return new Date(Date.now() + horasDeAgora * 3_600_000).toISOString();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Agendamento = any;
type Aviso = { codigo: string; [dado: string]: unknown };
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("vacinação: agenda", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let seq = 0;
  const usuarios = new Map<PerfilAcesso, { id: number; cpf: string }>();
  const tokens = new Map<PerfilAcesso, string>();
  let v3: number;
  let vUnica: number;
  let vGato: number;
  let vInativa: number;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está definido.");
    process.env.JWT_SECRET ??= "test-only-jwt-secret";
    prisma = new PrismaClient();
    await cleanup(prisma);

    for (const perfil of PERFIS) usuarios.set(perfil, await createUsuario(prisma, perfil));

    v3 = await criarVacina({ nome: "v3", totalDoses: 3, intervaloDosesDias: 21, revacinacaoDias: 365 });
    vUnica = await criarVacina({ nome: "unica", totalDoses: 1 });
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

  it("exige autenticação, libera a consulta e restringe a operação ao clínico", async () => {
    const animal = await novoAnimal();
    const agendamento = await agendar(animal, v3, 24);
    const http = () => request(app.getHttpServer());
    const base = `/vacinacao/agendamentos/${agendamento.id}`;

    await http().get("/vacinacao/agenda").expect(401);
    await http().get(base).expect(401);
    await http().post("/vacinacao/agendamentos").send({ animalId: animal, vacinaId: v3, dataHoraPrevista: instante(48) }).expect(401);
    await http().patch(base).send({ dataHoraPrevista: instante(48) }).expect(401);
    await http().post(`${base}/cancelar`).send({ motivo: "x" }).expect(401);
    await http().post(`${base}/falta`).expect(401);
    await http().post(`${base}/baixa`).send(baixaBody()).expect(401);

    for (const perfil of PERFIS) {
      await http().get("/vacinacao/agenda").set(auth(perfil)).expect(200);
      await http().get(base).set(auth(perfil)).expect(200);
    }

    for (const perfil of SEM_ESCRITA) {
      await http().post("/vacinacao/agendamentos").set(auth(perfil)).send({ animalId: animal, vacinaId: vUnica, dataHoraPrevista: instante(48) }).expect(403);
      await http().patch(base).set(auth(perfil)).send({ dataHoraPrevista: instante(48) }).expect(403);
      await http().post(`${base}/cancelar`).set(auth(perfil)).send({ motivo: "x" }).expect(403);
      await http().post(`${base}/falta`).set(auth(perfil)).expect(403);
      await http().post(`${base}/baixa`).set(auth(perfil)).send(baixaBody()).expect(403);
    }

    await http().delete(base).set(auth("coordenacao")).expect(404);
    await http().get("/vacinacao/agendamentos/999999999").set(auth("agente")).expect(404);
    expect((await prisma.agendamentoVacinacao.findUniqueOrThrow({ where: { id: agendamento.id } })).status).toBe("agendado");
  });

  it("cria o agendamento com a dose prevista correta, criando o protocolo quando não existe", async () => {
    const animal = await novoAnimal();
    expect(await prisma.protocoloVacinal.count({ where: { animalId: animal } })).toBe(0);

    const primeiro = await agendar(animal, v3, 24, { responsavelId: usuarios.get("veterinario")!.id, observacao: "  sala   2 " });
    expect(primeiro).toMatchObject({
      status: "agendado",
      numeroDosePrevista: 1,
      dosesPrevistas: 3,
      atrasado: false,
      observacao: "sala 2",
    });
    expect(primeiro.responsavel.id).toBe(usuarios.get("veterinario")!.id);
    expect(primeiro.criadoPor.id).toBe(usuarios.get("coordenacao")!.id);
    expect(primeiro.animal.id).toBe(animal);
    expect(await prisma.protocoloVacinal.count({ where: { animalId: animal, vacinaId: v3 } })).toBe(1);

    const evento = await prisma.eventoAnimal.findFirstOrThrow({ where: { animalId: animal, tipo: "criacao_agendamento_vacina" } });
    expect((evento.dados as { numeroDosePrevista: number }).numeroDosePrevista).toBe(1);
    const auditorias = await prisma.auditoriaEvento.findMany({ where: { tipo: "agendamento_vacinacao_criado" } });
    expect(auditorias.some((a) => (a.dados as { entidadeId?: string }).entidadeId === String(primeiro.id))).toBe(true);

    // Com uma dose já aplicada, o próximo agendamento prevê a dose seguinte.
    const outro = await novoAnimal();
    await aplicar(outro, v3, -30);
    expect((await agendar(outro, v3, 24)).numeroDosePrevista).toBe(2);
  });

  it("recusa criação incompatível: espécie, vacina inativa, animal terminal, protocolo interrompido e responsável inválido", async () => {
    const animal = await novoAnimal();

    expect((await tentarAgendar({ animalId: animal, vacinaId: vGato, dataHoraPrevista: instante(24) }).expect(409)).body.codigo).toBe("especie_incompativel");
    expect((await tentarAgendar({ animalId: animal, vacinaId: vInativa, dataHoraPrevista: instante(24) }).expect(409)).body.codigo).toBe("vacina_inativa");
    await tentarAgendar({ animalId: animal, vacinaId: 999999999, dataHoraPrevista: instante(24) }).expect(404);
    await tentarAgendar({ animalId: 999999999, vacinaId: v3, dataHoraPrevista: instante(24) }).expect(404);
    await tentarAgendar({ animalId: animal, vacinaId: v3, dataHoraPrevista: "amanhã" }).expect(400);
    await tentarAgendar({ animalId: animal, vacinaId: v3, dataHoraPrevista: instante(24), responsavelId: 999999999 }).expect(400);

    const dose = await aplicar(animal, v3, -30);
    await request(app.getHttpServer())
      .post(`/animais/${animal}/vacinacao/protocolos/${dose.protocolo.id}/interromper`)
      .set(auth("veterinario"))
      .send({ motivo: "contraindicação" })
      .expect(201);
    expect((await tentarAgendar({ animalId: animal, vacinaId: v3, dataHoraPrevista: instante(24) }).expect(409)).body.codigo).toBe("protocolo_interrompido");

    const terminal = await novoAnimal();
    await prisma.animal.update({ where: { id: terminal }, data: { situacao: "obito" } });
    expect((await tentarAgendar({ animalId: terminal, vacinaId: v3, dataHoraPrevista: instante(24) }).expect(409)).body.codigo).toBe("animal_terminal");

    expect(await prisma.agendamentoVacinacao.count({ where: { animalId: { in: [animal, terminal] } } })).toBe(0);
  });

  it("recusa um segundo agendamento em aberto do mesmo par e aponta o existente", async () => {
    const animal = await novoAnimal();
    const aberto = await agendar(animal, v3, 24);

    const conflito = await tentarAgendar({ animalId: animal, vacinaId: v3, dataHoraPrevista: instante(72) }).expect(409);
    expect(conflito.body).toMatchObject({ codigo: "agendamento_em_aberto", agendamentoId: aberto.id });
    expect(conflito.body.message).toMatch(/[Rr]emarque/);

    // Outra vacina para o mesmo animal é permitida.
    await agendar(animal, vUnica, 24);
    expect(await prisma.agendamentoVacinacao.count({ where: { animalId: animal, status: "agendado" } })).toBe(2);

    // Depois de um estado final, o par volta a aceitar agendamento novo.
    await request(app.getHttpServer()).post(`/vacinacao/agendamentos/${aberto.id}/cancelar`).set(auth("veterinario")).send({ motivo: "tutor desmarcou" }).expect(201);
    const novo = await agendar(animal, v3, 96);
    expect(novo.id).not.toBe(aberto.id);
  });

  it("avisa sem bloquear quando a data prevista fura o intervalo ou o esquema já fechou", async () => {
    const comIntervalo = await novoAnimal();
    await aplicar(comIntervalo, v3, -1);
    const criado = await request(app.getHttpServer())
      .post("/vacinacao/agendamentos")
      .set(auth("veterinario"))
      .send({ animalId: comIntervalo, vacinaId: v3, dataHoraPrevista: instante(24) })
      .expect(201);
    expect(criado.body.agendamento.status).toBe("agendado");
    const avisos = criado.body.avisos as Aviso[];
    expect(avisos.map((a) => a.codigo)).toContain("data_antes_do_intervalo");
    expect(avisos[0].dataMinimaProximaDose).toBe(dia(20));

    const fechado = await novoAnimal();
    await aplicar(fechado, vUnica, -10);
    const semRevacinacao = await request(app.getHttpServer())
      .post("/vacinacao/agendamentos")
      .set(auth("veterinario"))
      .send({ animalId: fechado, vacinaId: vUnica, dataHoraPrevista: instante(24) })
      .expect(201);
    expect((semRevacinacao.body.avisos as Aviso[]).map((a) => a.codigo)).toContain("esquema_concluido");

    // O aviso não vira permissão: a baixa recusa mesmo assim.
    const baixa = await request(app.getHttpServer())
      .post(`/vacinacao/agendamentos/${semRevacinacao.body.agendamento.id}/baixa`)
      .set(auth("veterinario"))
      .send(baixaBody())
      .expect(409);
    expect(baixa.body.codigo).toBe("esquema_concluido");
  });

  it("remarca mantendo o estado agendado e registrando a data anterior", async () => {
    const animal = await novoAnimal();
    const agendamento = await agendar(animal, v3, 24);
    const nova = instante(120);

    await request(app.getHttpServer()).patch(`/vacinacao/agendamentos/${agendamento.id}`).set(auth("veterinario")).send({}).expect(400);
    const remarcado = await request(app.getHttpServer())
      .patch(`/vacinacao/agendamentos/${agendamento.id}`)
      .set(auth("veterinario"))
      .send({ dataHoraPrevista: nova, responsavelId: usuarios.get("coordenacao")!.id, motivo: "sala ocupada" })
      .expect(200);

    expect(remarcado.body.status).toBe("agendado");
    expect(new Date(remarcado.body.dataHoraPrevista).toISOString()).toBe(nova);
    expect(remarcado.body.responsavel.id).toBe(usuarios.get("coordenacao")!.id);

    const evento = await prisma.eventoAnimal.findFirstOrThrow({ where: { animalId: animal, tipo: "remarcacao_agendamento_vacina" } });
    expect(evento.dados).toMatchObject({
      dataHoraAnterior: new Date(agendamento.dataHoraPrevista).toISOString(),
      dataHoraPrevista: nova,
      motivo: "sala ocupada",
    });
    expect(evento.usuarioId).toBe(usuarios.get("veterinario")!.id);

    // Animal e vacina não mudam pela remarcação: a whitelist descarta.
    await request(app.getHttpServer())
      .patch(`/vacinacao/agendamentos/${agendamento.id}`)
      .set(auth("veterinario"))
      .send({ dataHoraPrevista: nova, animalId: 999999999, vacinaId: vUnica, status: "cancelado" })
      .expect(200);
    const intacto = await prisma.agendamentoVacinacao.findUniqueOrThrow({ where: { id: agendamento.id } });
    expect(intacto).toMatchObject({ animalId: animal, vacinaId: v3, status: "agendado" });

    // Responsável pode ser removido.
    const semResponsavel = await request(app.getHttpServer())
      .patch(`/vacinacao/agendamentos/${agendamento.id}`)
      .set(auth("coordenacao"))
      .send({ dataHoraPrevista: nova, responsavelId: null })
      .expect(200);
    expect(semResponsavel.body.responsavel).toBeNull();
  });

  it("cancela com motivo obrigatório e marca falta", async () => {
    const animal = await novoAnimal();
    const paraCancelar = await agendar(animal, v3, 24);
    const url = `/vacinacao/agendamentos/${paraCancelar.id}`;

    await request(app.getHttpServer()).post(`${url}/cancelar`).set(auth("veterinario")).send({}).expect(400);
    await request(app.getHttpServer()).post(`${url}/cancelar`).set(auth("veterinario")).send({ motivo: "   " }).expect(400);
    const cancelado = await request(app.getHttpServer()).post(`${url}/cancelar`).set(auth("veterinario")).send({ motivo: "  tutor   desmarcou " }).expect(201);
    expect(cancelado.body).toMatchObject({ status: "cancelado", motivoCancelamento: "tutor desmarcou", atrasado: false });
    expect(await prisma.eventoAnimal.count({ where: { animalId: animal, tipo: "cancelamento_agendamento_vacina" } })).toBe(1);

    const outroAnimal = await novoAnimal();
    const paraFalta = await agendar(outroAnimal, v3, -24);
    const faltou = await request(app.getHttpServer()).post(`/vacinacao/agendamentos/${paraFalta.id}/falta`).set(auth("coordenacao")).expect(201);
    expect(faltou.body).toMatchObject({ status: "faltou", atrasado: false });
    expect(await prisma.eventoAnimal.count({ where: { animalId: outroAnimal, tipo: "falta_agendamento_vacina" } })).toBe(1);
    const auditorias = await prisma.auditoriaEvento.findMany({ where: { tipo: "agendamento_vacinacao_falta" } });
    expect(auditorias.some((a) => (a.dados as { entidadeId?: string }).entidadeId === String(paraFalta.id))).toBe(true);
  });

  it("trata estados finais como finais, em qualquer operação", async () => {
    const animal = await novoAnimal();
    const agendamento = await agendar(animal, v3, 24);
    const url = `/vacinacao/agendamentos/${agendamento.id}`;
    await request(app.getHttpServer()).post(`${url}/falta`).set(auth("veterinario")).expect(201);

    for (const chamada of [
      () => request(app.getHttpServer()).patch(url).set(auth("veterinario")).send({ dataHoraPrevista: instante(48) }),
      () => request(app.getHttpServer()).post(`${url}/cancelar`).set(auth("veterinario")).send({ motivo: "x" }),
      () => request(app.getHttpServer()).post(`${url}/falta`).set(auth("veterinario")),
      () => request(app.getHttpServer()).post(`${url}/baixa`).set(auth("veterinario")).send(baixaBody()),
    ]) {
      const resposta = await chamada().expect(409);
      expect(resposta.body).toMatchObject({ codigo: "agendamento_finalizado", status: "faltou" });
    }
    expect((await prisma.agendamentoVacinacao.findUniqueOrThrow({ where: { id: agendamento.id } })).status).toBe("faltou");
  });

  it("dá baixa criando a aplicação e fechando o agendamento na mesma transação", async () => {
    const animal = await novoAnimal();
    const agendamento = await agendar(animal, v3, -2, { observacao: "trazer focinheira" });

    const r = await request(app.getHttpServer())
      .post(`/vacinacao/agendamentos/${agendamento.id}/baixa`)
      .set(auth("veterinario"))
      .send({ dataAplicacao: dia(0), lote: `LT-${STAMP}-baixa`, aplicadoPor: "Dra. Ana" })
      .expect(201);

    expect(r.body.agendamento).toMatchObject({ status: "aplicado", atrasado: false });
    expect(r.body.agendamento.aplicacao.id).toBe(r.body.aplicacao.id);
    expect(r.body.aplicacao).toMatchObject({ numeroDose: 1, dataAplicacao: dia(0), aplicadoPor: "Dra. Ana" });
    // A observação do agendamento entra na aplicação quando a baixa não informa outra.
    expect(r.body.aplicacao.observacao).toBe("trazer focinheira");
    expect(r.body.protocolo).toMatchObject({ dosesAplicadas: 1, dosesFaltantes: 2 });
    expect(r.body.aplicacao.registradoPor.id).toBe(usuarios.get("veterinario")!.id);

    expect(await prisma.eventoAnimal.count({ where: { animalId: animal, tipo: "aplicacao_vacina" } })).toBe(1);
    const auditorias = await prisma.auditoriaEvento.findMany({ where: { tipo: "agendamento_vacinacao_baixado" } });
    expect(auditorias.some((a) => (a.dados as { entidadeId?: string }).entidadeId === String(agendamento.id))).toBe(true);
  });

  it("na baixa exige confirmação de dose adiantada e não grava nada quando recusa", async () => {
    const animal = await novoAnimal();
    await aplicar(animal, v3, -5);
    const agendamento = await agendar(animal, v3, 1);
    const url = `/vacinacao/agendamentos/${agendamento.id}/baixa`;

    const recusada = await request(app.getHttpServer()).post(url).set(auth("veterinario")).send(baixaBody()).expect(409);
    expect(recusada.body).toMatchObject({ codigo: "aplicacao_adiantada", diasAntecipacao: 16 });

    // A transação inteira volta atrás: nem aplicação, nem mudança de estado.
    expect(await prisma.aplicacaoVacina.count({ where: { animalId: animal } })).toBe(1);
    expect((await prisma.agendamentoVacinacao.findUniqueOrThrow({ where: { id: agendamento.id } })).status).toBe("agendado");

    const ok = await request(app.getHttpServer())
      .post(url)
      .set(auth("veterinario"))
      .send({ ...baixaBody(), confirmaAdiantada: true, motivoAdiantada: "surto no canil" })
      .expect(201);
    expect(ok.body.aplicacao).toMatchObject({ aplicadaAdiantada: true, motivoAdiantada: "surto no canil", diasAntecipacao: 16 });
    expect(ok.body.agendamento.status).toBe("aplicado");
  });

  it("permite baixar agendamento de vacina inativada, mas não criar outro", async () => {
    const animal = await novoAnimal();
    const vacina = await criarVacina({ nome: `desativavel-${++seq}`, totalDoses: 3, intervaloDosesDias: 21 });
    const agendamento = await agendar(animal, vacina, 2);
    await prisma.vacina.update({ where: { id: vacina }, data: { ativa: false } });

    const baixado = await request(app.getHttpServer())
      .post(`/vacinacao/agendamentos/${agendamento.id}/baixa`)
      .set(auth("veterinario"))
      .send(baixaBody())
      .expect(201);
    expect(baixado.body.agendamento.status).toBe("aplicado");
    expect(baixado.body.aplicacao.numeroDose).toBe(1);

    expect((await tentarAgendar({ animalId: animal, vacinaId: vacina, dataHoraPrevista: instante(48) }).expect(409)).body.codigo).toBe("vacina_inativa");
    // Registro direto também continua recusado.
    const direto = await request(app.getHttpServer())
      .post(`/animais/${animal}/vacinacao/aplicacoes`)
      .set(auth("veterinario"))
      .send({ vacinaId: vacina, dataAplicacao: dia(0), lote: "X" })
      .expect(409);
    expect(direto.body.codigo).toBe("vacina_inativa");
  });

  it("reabre o agendamento quando a aplicação que o baixou é anulada", async () => {
    const animal = await novoAnimal();
    const agendamento = await agendar(animal, v3, -1);
    const baixa = await request(app.getHttpServer())
      .post(`/vacinacao/agendamentos/${agendamento.id}/baixa`)
      .set(auth("veterinario"))
      .send(baixaBody())
      .expect(201);

    const anulada = await request(app.getHttpServer())
      .post(`/animais/${animal}/vacinacao/aplicacoes/${baixa.body.aplicacao.id}/anular`)
      .set(auth("coordenacao"))
      .send({ motivo: "lote errado" })
      .expect(201);
    expect(anulada.body.agendamentoReaberto).toBe(true);

    const reaberto = await request(app.getHttpServer()).get(`/vacinacao/agendamentos/${agendamento.id}`).set(auth("agente")).expect(200);
    expect(reaberto.body).toMatchObject({ status: "agendado", atrasado: true, aplicacao: null });
    expect(new Date(reaberto.body.dataHoraPrevista).toISOString()).toBe(new Date(agendamento.dataHoraPrevista).toISOString());

    // Reaberto volta a ser operável, e pode ser baixado de novo.
    const rebaixa = await request(app.getHttpServer())
      .post(`/vacinacao/agendamentos/${agendamento.id}/baixa`)
      .set(auth("veterinario"))
      .send(baixaBody())
      .expect(201);
    expect(rebaixa.body.aplicacao.numeroDose).toBe(1);
    expect(rebaixa.body.protocolo.dosesAplicadas).toBe(1);
  });

  it("deriva atrasado, conta o total e ordena os atrasados no topo", async () => {
    const marca = `atraso${STAMP}`;
    const [a1, a2, a3] = [await novoAnimal({ marca }), await novoAnimal({ marca }), await novoAnimal({ marca })];
    const antigo = await agendar(a1, v3, -48);
    const recente = await agendar(a2, v3, -2);
    const futuro = await agendar(a3, v3, 72);

    const agenda = await request(app.getHttpServer()).get(`/vacinacao/agenda?busca=${marca}`).set(auth("recepcao")).expect(200);
    const ids = agenda.body.items.map((i: Agendamento) => i.id);
    expect(ids.indexOf(antigo.id)).toBeLessThan(ids.indexOf(recente.id));
    expect(ids.indexOf(recente.id)).toBeLessThan(ids.indexOf(futuro.id));
    expect(agenda.body.atrasados).toBe(2);
    expect(agenda.body.items.find((i: Agendamento) => i.id === antigo.id).atrasado).toBe(true);
    expect(agenda.body.items.find((i: Agendamento) => i.id === futuro.id).atrasado).toBe(false);

    const soAtrasados = await request(app.getHttpServer()).get(`/vacinacao/agenda?busca=${marca}&atrasados=true`).set(auth("recepcao")).expect(200);
    expect(soAtrasados.body.items.map((i: Agendamento) => i.id).sort()).toEqual([antigo.id, recente.id].sort());

    // Estado final nunca é atrasado, mesmo com data no passado.
    await request(app.getHttpServer()).post(`/vacinacao/agendamentos/${antigo.id}/falta`).set(auth("veterinario")).expect(201);
    const depois = await request(app.getHttpServer()).get(`/vacinacao/agenda?busca=${marca}`).set(auth("recepcao")).expect(200);
    expect(depois.body.atrasados).toBe(1);
    expect(depois.body.items.find((i: Agendamento) => i.id === antigo.id).atrasado).toBe(false);
  });

  it("filtra por período, vacina, espécie, responsável, estado e busca, com paginação", async () => {
    const marca = `filtro${STAMP}`;
    const cao = await novoAnimal({ marca });
    const gato = await novoAnimal({ especie: "gato", marca });
    const semanaQueVem = await agendar(cao, v3, 24 * 7, { responsavelId: usuarios.get("veterinario")!.id });
    const outraVacina = await agendar(cao, vUnica, 24 * 8);
    const doGato = await agendar(gato, vGato, 24 * 9);

    const url = (qs: string) => `/vacinacao/agenda?busca=${marca}&${qs}`;
    const ids = async (qs: string) =>
      (await request(app.getHttpServer()).get(url(qs)).set(auth("agente")).expect(200)).body.items.map((i: Agendamento) => i.id);

    expect(await ids(`vacinaId=${v3}`)).toEqual([semanaQueVem.id]);
    expect(await ids("especie=gato")).toEqual([doGato.id]);
    expect(await ids(`responsavelId=${usuarios.get("veterinario")!.id}`)).toEqual([semanaQueVem.id]);
    expect(await ids("status=agendado")).toEqual(expect.arrayContaining([semanaQueVem.id, outraVacina.id, doGato.id]));
    expect(await ids("status=cancelado")).toEqual([]);
    expect(await ids(`de=${instante(24 * 8 - 1)}`)).toEqual(expect.arrayContaining([outraVacina.id, doGato.id]));
    expect(await ids(`de=${instante(24 * 8 - 1)}`)).not.toContain(semanaQueVem.id);
    expect(await ids(`ate=${instante(24 * 8 + 1)}`)).not.toContain(doGato.id);

    const porNome = await request(app.getHttpServer())
      .get(`/vacinacao/agenda?busca=${encodeURIComponent((await prisma.animal.findUniqueOrThrow({ where: { id: gato } })).nome)}`)
      .set(auth("agente"))
      .expect(200);
    expect(porNome.body.items.map((i: Agendamento) => i.id)).toEqual([doGato.id]);

    const pagina = await request(app.getHttpServer()).get(url("limite=2&pagina=2")).set(auth("agente")).expect(200);
    expect(pagina.body).toMatchObject({ pagina: 2, limite: 2 });
    expect(pagina.body.items.length).toBeLessThanOrEqual(2);

    await request(app.getHttpServer()).get(url(`de=${instante(48)}&ate=${instante(24)}`)).set(auth("agente")).expect(400);
    await request(app.getHttpServer()).get(url("status=inventado")).set(auth("agente")).expect(400);
    await request(app.getHttpServer()).get(url("especie=cavalo")).set(auth("agente")).expect(400);
  });

  it("esconde animal em situação terminal da agenda operacional e bloqueia operá-lo", async () => {
    const marca = `terminal${STAMP}`;
    const animal = await novoAnimal({ marca });
    const agendamento = await agendar(animal, v3, 24);
    await prisma.animal.update({ where: { id: animal }, data: { situacao: "adotado" } });

    const padrao = await request(app.getHttpServer()).get(`/vacinacao/agenda?busca=${marca}`).set(auth("agente")).expect(200);
    expect(padrao.body.items.map((i: Agendamento) => i.id)).not.toContain(agendamento.id);

    const comFiltro = await request(app.getHttpServer()).get(`/vacinacao/agenda?busca=${marca}&incluirTerminais=true`).set(auth("agente")).expect(200);
    expect(comFiltro.body.items.map((i: Agendamento) => i.id)).toContain(agendamento.id);

    // Continua consultável pelo id, mas nenhuma operação é aceita.
    await request(app.getHttpServer()).get(`/vacinacao/agendamentos/${agendamento.id}`).set(auth("agente")).expect(200);
    const url = `/vacinacao/agendamentos/${agendamento.id}`;
    for (const chamada of [
      () => request(app.getHttpServer()).patch(url).set(auth("coordenacao")).send({ dataHoraPrevista: instante(48) }),
      () => request(app.getHttpServer()).post(`${url}/cancelar`).set(auth("coordenacao")).send({ motivo: "x" }),
      () => request(app.getHttpServer()).post(`${url}/baixa`).set(auth("coordenacao")).send(baixaBody()),
    ]) {
      expect((await chamada().expect(409)).body.codigo).toBe("animal_terminal");
    }
    expect((await prisma.agendamentoVacinacao.findUniqueOrThrow({ where: { id: agendamento.id } })).status).toBe("agendado");
  });

  it("resolve a concorrência: só um agendamento em aberto por par, e só uma baixa", async () => {
    for (let rodada = 0; rodada < 3; rodada += 1) {
      const animal = await novoAnimal();
      const corpo = { animalId: animal, vacinaId: v3, dataHoraPrevista: instante(24) };
      const criacoes = await Promise.all(CLINICOS.map((perfil) => tentarAgendar(corpo, perfil)));
      expect(criacoes.map((c) => c.status).sort()).toEqual([201, 409]);
      expect(criacoes.find((c) => c.status === 409)!.body.codigo).toMatch(/^(agendamento_em_aberto|conflito_concorrencia)$/);
      expect(await prisma.agendamentoVacinacao.count({ where: { animalId: animal, status: "agendado" } })).toBe(1);

      const agendamento = await prisma.agendamentoVacinacao.findFirstOrThrow({ where: { animalId: animal } });
      const body = baixaBody();
      const baixas = await Promise.all(
        CLINICOS.map((perfil) =>
          request(app.getHttpServer()).post(`/vacinacao/agendamentos/${agendamento.id}/baixa`).set(auth(perfil)).send(body),
        ),
      );
      expect(baixas.filter((b) => b.status === 201)).toHaveLength(1);
      expect(baixas.filter((b) => b.status === 409)).toHaveLength(1);
      expect(await prisma.aplicacaoVacina.count({ where: { animalId: animal, anuladaEm: null } })).toBe(1);
    }
  });

  function baixaBody(extra: Record<string, unknown> = {}) {
    seq += 1;
    return { dataAplicacao: dia(0), lote: `LT-${STAMP}-${seq}`, ...extra };
  }

  function tentarAgendar(body: Record<string, unknown>, perfil: PerfilAcesso = "coordenacao") {
    return request(app.getHttpServer()).post("/vacinacao/agendamentos").set(auth(perfil)).send(body);
  }

  async function agendar(
    animalId: number,
    vacinaId: number,
    horas: number,
    extra: Record<string, unknown> = {},
    perfil: PerfilAcesso = "coordenacao",
  ): Promise<Agendamento> {
    const resposta = await tentarAgendar({ animalId, vacinaId, dataHoraPrevista: instante(horas), ...extra }, perfil);
    if (resposta.status !== 201) {
      throw new Error(`Esperava 201 ao agendar, veio ${resposta.status}: ${JSON.stringify(resposta.body)}`);
    }
    return resposta.body.agendamento as Agendamento;
  }

  async function aplicar(animalId: number, vacinaId: number, offset: number) {
    seq += 1;
    const resposta = await request(app.getHttpServer())
      .post(`/animais/${animalId}/vacinacao/aplicacoes`)
      .set(auth("veterinario"))
      .send({ vacinaId, dataAplicacao: dia(offset), lote: `LA-${STAMP}-${seq}` });
    if (resposta.status !== 201) {
      throw new Error(`Esperava 201 ao aplicar, veio ${resposta.status}: ${JSON.stringify(resposta.body)}`);
    }
    return resposta.body as { aplicacao: Agendamento; protocolo: Agendamento };
  }

  // `marca` isola os animais de um teste: a busca por nome não alcança os dos outros casos.
  async function novoAnimal(extra: Partial<{ especie: "cao" | "gato"; marca: string }> = {}) {
    seq += 1;
    const animal = await prisma.animal.create({
      data: {
        nome: `Animal Agenda ${extra.marca ?? STAMP}-${seq}`,
        numeroRegistro: `AGD-${STAMP}-${seq}`,
        numeroRegistroNormalizado: `agd-${STAMP}-${seq}`,
        especie: extra.especie ?? "cao",
        dataAcolhimento: new Date(`${dia(-120)}T00:00:00.000Z`),
      },
    });
    return animal.id;
  }

  async function criarVacina(dados: {
    nome: string;
    totalDoses: number;
    intervaloDosesDias?: number;
    revacinacaoDias?: number;
    especies?: ("cao" | "gato")[];
    ativa?: boolean;
  }) {
    const nome = `${dados.nome} agd ${STAMP}`;
    const vacina = await prisma.vacina.create({
      data: {
        nome,
        nomeNormalizado: nome.toLocaleLowerCase("pt-BR"),
        especies: dados.especies ?? ["cao"],
        totalDoses: dados.totalDoses,
        intervaloDosesDias: dados.intervaloDosesDias ?? null,
        revacinacaoDias: dados.revacinacaoDias ?? null,
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
  const cpf = `3${STAMP}${String(index).padStart(2, "0")}`.slice(0, 11);
  const usuario = await prisma.usuario.create({
    data: {
      nome: `Usuário Agenda ${perfil}`,
      email: `${perfil}-${STAMP}${EMAIL_SUFFIX}`,
      senhaHash,
      cpf,
      perfilAcesso: perfil,
      ativo: true,
      funcionario: {
        create: {
          matricula: `G${STAMP.slice(0, 5)}${index}`,
          cargo: perfil,
          crmv: perfil === "veterinario" || perfil === "coordenacao" ? "12345" : null,
        },
      },
    },
  });
  return { id: usuario.id, cpf };
}

async function cleanup(prisma: PrismaClient) {
  await prisma.animal.deleteMany({ where: { numeroRegistroNormalizado: { startsWith: `agd-${STAMP}` } } });
  await prisma.vacina.deleteMany({ where: { nomeNormalizado: { contains: `agd ${STAMP}` } } });

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
