export type PerfilAcesso = "coordenacao" | "veterinario" | "agente" | "recepcao";

export type PublicUser = {
  id: number;
  nome: string;
  email: string;
  cpfMascarado: string;
  telefone: string | null;
  perfilAcesso: PerfilAcesso;
  matricula: string | null;
  cargo: string | null;
  crmv: string | null;
};

export type SolicitacaoCriada = {
  id: number;
  status: string;
  createdAt: string;
};

export type SetorBaia = "canil" | "gatil" | "quarentena";
export type TipoBaia = "coletiva" | "individual";
export type EstadoBaia = "ativa" | "inativa" | "interditada" | "em_higienizacao";

export type AcaoBaia =
  | "interditar"
  | "liberar"
  | "inativar"
  | "reativar"
  | "iniciar_higienizacao"
  | "concluir_higienizacao";

export type BaiaOcupante = {
  id: number;
  nome?: string;
  codigo?: string;
  especie?: string;
  emIsolamento?: boolean;
};

export type Baia = {
  id: number;
  codigo: string;
  codigoNormalizado: string;
  setor: SetorBaia;
  tipo: TipoBaia;
  capacidade: number;
  areaM2: string | number | null;
  possuiSolario: boolean;
  exclusivaIsolamento: boolean;
  estado: EstadoBaia;
  ultimaHigienizacaoEm: string | null;
  createdAt: string;
  updatedAt: string;
  ocupantes: BaiaOcupante[];
  ocupacao: number;
  vagasDisponiveis: number;
};

export type ListarBaiasFiltros = {
  setor?: SetorBaia;
  estado?: EstadoBaia;
  busca?: string;
};

export type CriarBaiaInput = {
  codigo: string;
  setor: SetorBaia;
  tipo: TipoBaia;
  capacidade: number;
  areaM2?: number;
  possuiSolario?: boolean;
  exclusivaIsolamento?: boolean;
};

export type AtualizarBaiaInput = Partial<CriarBaiaInput>;

export type AcaoBaiaInput = {
  observacao?: string;
};

export type BaiaHistoricoEvento = {
  id: number;
  tipo: string;
  dados: unknown;
  usuarioId: number | null;
  createdAt: string;
  usuario: Pick<PublicUser, "id" | "nome"> | null;
};

export type EspecieAnimal = "cao" | "gato";
export type TipoRacaAnimal = "catalogo" | "srd" | "outra" | "nao_informada" | "personalizada";
export type SexoAnimal = "macho" | "femea" | "nao_informado";
export type PorteAnimal = "pequeno" | "medio" | "grande" | "nao_informado";
export type SituacaoAnimal =
  | "em_tratamento"
  | "em_quarentena_observacao"
  | "em_observacao_antirrabica"
  | "saudavel"
  | "adotado"
  | "obito";
export type StatusCastracaoAnimal = "sim" | "nao" | "nao_informado";
export type UnidadeIdadeAnimal = "dias" | "meses" | "anos";
export type TipoEventoAnimal =
  | "criacao"
  | "edicao"
  | "acolhimento"
  | "mudanca_situacao"
  | "mudanca_baia"
  | "pesagem"
  | "observacao"
  | "foto"
  | "exame"
  | "diagnostico"
  | "revogacao_situacao_terminal"
  | "aplicacao_vacina"
  | "edicao_aplicacao_vacina"
  | "anulacao_aplicacao_vacina"
  | "interrupcao_protocolo_vacinal"
  | "retomada_protocolo_vacinal"
  | "criacao_agendamento_vacina"
  | "remarcacao_agendamento_vacina"
  | "cancelamento_agendamento_vacina"
  | "falta_agendamento_vacina"
  | "reabertura_agendamento_vacina"
  | "reacao_adversa"
  | "encerramento_observacao_antirrabica";

export type RacaAnimal = {
  id: number;
  especie: EspecieAnimal;
  nome: string;
  nomeNormalizado: string;
  tipo: TipoRacaAnimal;
  catalogoPadrao: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AnimalAlerta = {
  tipo: string;
  mensagem: string;
};

export type FotoAnimal = {
  id: number;
  animalId: number;
  nomeArquivo: string;
  mimeType: string;
  tamanhoBytes: number;
  largura: number;
  altura: number;
  identificacao: boolean;
  ordem: number;
  createdAt: string;
  url: string;
};

export type PesagemAnimal = {
  id: number;
  animalId: number;
  valorKg: string;
  observacao: string | null;
  usuarioId: number | null;
  createdAt: string;
  usuario?: Pick<PublicUser, "id" | "nome"> | null;
};

export type ObservacaoAnimal = {
  id: number;
  animalId: number;
  texto: string;
  usuarioId: number | null;
  observacaoOrigemId: number | null;
  createdAt: string;
  usuario?: Pick<PublicUser, "id" | "nome"> | null;
};

export type EventoAnimal = {
  id: number;
  animalId: number;
  tipo: TipoEventoAnimal;
  resumo: string;
  dados: unknown;
  usuarioId: number | null;
  createdAt: string;
  usuario?: Pick<PublicUser, "id" | "nome"> | null;
};

export type Animal = {
  id: number;
  nome: string;
  numeroRegistro: string;
  numeroRegistroNormalizado: string;
  especie: EspecieAnimal;
  racaId: number | null;
  sexo: SexoAnimal;
  porte: PorteAnimal;
  corPelagem: string | null;
  situacao: SituacaoAnimal;
  emIsolamento: boolean;
  castrado: StatusCastracaoAnimal;
  pesoAtualKg: string | null;
  dataAcolhimento: string | null;
  dataNascimento: string | null;
  idadeEstimadaQuantidade: number | null;
  idadeEstimadaUnidade: UnidadeIdadeAnimal | null;
  idadeAproximada: boolean;
  nasceuNoCcz: boolean;
  baiaId: number | null;
  criadoPorId: number | null;
  acolhidoPor: string | null;
  createdAt: string;
  updatedAt: string;
  raca: RacaAnimal | null;
  baia: Baia | null;
  criadoPor: Pick<PublicUser, "id" | "nome"> | null;
  fotos: FotoAnimal[];
  somenteLeitura: boolean;
  alertas: AnimalAlerta[];
  pesagens?: PesagemAnimal[];
  observacoes?: ObservacaoAnimal[];
  eventos?: EventoAnimal[];
  /** Só na ficha: reações com o desfecho corrente derivado da cadeia. */
  reacoesAdversas?: ReacaoAdversa[];
  /** Só na ficha, e só enquanto a situação é `em_observacao_antirrabica`. */
  observacaoAntirrabica?: ObservacaoAntirrabica | null;
};

export type ListarAnimaisFiltros = {
  busca?: string;
  especie?: EspecieAnimal;
  sexo?: SexoAnimal;
  porte?: PorteAnimal;
  situacao?: SituacaoAnimal;
  castrado?: StatusCastracaoAnimal;
  baiaId?: number;
  semBaia?: boolean;
  comAlertas?: boolean;
  incluirTerminais?: boolean;
  pagina?: number;
  limite?: number;
};

export type ListaAnimais = {
  items: Animal[];
  total: number;
  pagina: number;
  limite: number;
};

export type CriarAnimalInput = {
  nome: string;
  numeroRegistro: string;
  especie: EspecieAnimal;
  racaId?: number;
  sexo?: SexoAnimal;
  porte?: PorteAnimal;
  corPelagem?: string;
  situacao?: Exclude<SituacaoAnimal, "adotado">;
  emIsolamento?: boolean;
  castrado?: StatusCastracaoAnimal;
  pesoAtualKg?: number;
  dataAcolhimento?: string;
  dataNascimento?: string;
  idadeEstimadaQuantidade?: number;
  idadeEstimadaUnidade?: UnidadeIdadeAnimal;
  idadeAproximada?: boolean;
  nasceuNoCcz?: boolean;
  acolhidoPor?: string;
};

export type AtualizarAnimalInput = Partial<
  Omit<CriarAnimalInput, "racaId" | "corPelagem" | "pesoAtualKg" | "dataAcolhimento" | "dataNascimento" | "idadeEstimadaQuantidade" | "idadeEstimadaUnidade" | "acolhidoPor">
> & {
  racaId?: number | null;
  corPelagem?: string | null;
  pesoAtualKg?: number | null;
  dataAcolhimento?: string | null;
  dataNascimento?: string | null;
  idadeEstimadaQuantidade?: number | null;
  idadeEstimadaUnidade?: UnidadeIdadeAnimal | null;
  acolhidoPor?: string | null;
};

export type CriarRacaAnimalInput = {
  especie: EspecieAnimal;
  nome: string;
};

export type CriarObservacaoAnimalInput = {
  texto: string;
  observacaoOrigemId?: number;
};

export type CriarPesagemAnimalInput = {
  valorKg: number;
  observacao?: string;
};

export type CriarEventoAnimalInput = {
  tipo: Extract<TipoEventoAnimal, "exame" | "diagnostico">;
  resumo: string;
  dados?: Record<string, unknown>;
};

export type AlocarAnimalInput = {
  baiaId?: number | null;
  observacao?: string;
};

export type RevogarSituacaoAnimalInput = {
  situacao: Extract<SituacaoAnimal, "em_tratamento" | "em_quarentena_observacao" | "em_observacao_antirrabica" | "saudavel">;
  motivo: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let accessToken: string | null = null;
let currentUser: PublicUser | null = null;

export function getAccessToken() {
  return accessToken;
}

export function getCurrentUser() {
  return currentUser;
}

export function clearAccess() {
  accessToken = null;
  currentUser = null;
}

export type SolicitacaoPendente = {
  id: number;
  nome: string;
  cpfMascarado: string;
  matricula: string;
  email: string;
  funcaoPretendida: PerfilAcesso;
  crmv: string | null;
  status: string;
  createdAt: string;
};

export class ApiError extends Error {
  readonly status: number;
  /** Código estável das recusas de domínio (409). A interface decide por ele, não pelo texto. */
  readonly codigo: string | null;
  /** Campos extras da recusa, como `dataMinimaProximaDose` e `diasAntecipacao`. */
  readonly dados: Record<string, unknown>;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.status = status;
    const corpo = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    this.codigo = typeof corpo.codigo === "string" ? corpo.codigo : null;
    this.dados = corpo;
  }
}

export async function login(input: {
  identificador: string;
  senha: string;
  manterConectado: boolean;
}): Promise<PublicUser> {
  const body = await request<{ accessToken: string; usuario: PublicUser }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    { auth: false },
  );
  accessToken = body.accessToken;
  currentUser = body.usuario;
  return body.usuario;
}

export async function criarSolicitacao(input: {
  nome: string;
  cpf: string;
  matricula: string;
  email: string;
  funcaoPretendida: PerfilAcesso;
  crmv?: string;
  senha: string;
}): Promise<SolicitacaoCriada> {
  return request<SolicitacaoCriada>(
    "/auth/solicitacoes",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    { auth: false },
  );
}

export async function restoreSession(): Promise<PublicUser | null> {
  if (accessToken && currentUser) return currentUser;
  const ok = await refreshSession();
  return ok ? currentUser : null;
}

export function listarSolicitacoes(): Promise<SolicitacaoPendente[]> {
  return request<SolicitacaoPendente[]>("/auth/solicitacoes?status=pendente", {
    method: "GET",
  });
}

export function aceitarSolicitacao(
  id: number,
  input: { perfilAcesso: PerfilAcesso; crmv?: string },
): Promise<PublicUser> {
  return request<PublicUser>(`/auth/solicitacoes/${id}/aceitar`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function recusarSolicitacao(
  id: number,
  input: { motivo?: string },
): Promise<{ id: number; status: string; motivo: string | null }> {
  return request(`/auth/solicitacoes/${id}/recusar`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listarUsuarios(): Promise<PublicUser[]> {
  return request<PublicUser[]>("/usuarios", { method: "GET" });
}

export function atualizarPerfilUsuario(
  id: number,
  input: { perfilAcesso: PerfilAcesso; crmv?: string },
): Promise<PublicUser> {
  return request<PublicUser>(`/usuarios/${id}/perfil`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function carregarMe(): Promise<PublicUser> {
  const user = await request<PublicUser>("/auth/me", { method: "GET" });
  currentUser = user;
  return user;
}

export async function atualizarMe(input: {
  telefone?: string | null;
  email?: string;
}): Promise<PublicUser> {
  const user = await request<PublicUser>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  currentUser = user;
  return user;
}

export function alterarSenha(input: {
  senhaAtual: string;
  senhaNova: string;
}): Promise<{ ok: true }> {
  return request("/auth/me/senha", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listarBaias(filtros: ListarBaiasFiltros = {}): Promise<Baia[]> {
  const params = new URLSearchParams();
  if (filtros.setor) params.set("setor", filtros.setor);
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.busca?.trim()) params.set("busca", filtros.busca.trim());
  const query = params.toString();
  return request<Baia[]>(`/baias${query ? `?${query}` : ""}`, { method: "GET" });
}

export function obterBaia(id: number): Promise<Baia> {
  return request<Baia>(`/baias/${id}`, { method: "GET" });
}

export function criarBaia(input: CriarBaiaInput): Promise<Baia> {
  return request<Baia>("/baias", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function atualizarBaia(id: number, input: AtualizarBaiaInput): Promise<Baia> {
  return request<Baia>(`/baias/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function executarAcaoBaia(
  id: number,
  acao: AcaoBaia,
  input: AcaoBaiaInput = {},
): Promise<Baia> {
  return request<Baia>(`/baias/${id}/acoes/${acao}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listarHistoricoBaia(id: number): Promise<BaiaHistoricoEvento[]> {
  return request<BaiaHistoricoEvento[]>(`/baias/${id}/historico`, { method: "GET" });
}

export function listarAnimais(filtros: ListarAnimaisFiltros = {}): Promise<ListaAnimais> {
  const params = new URLSearchParams();
  if (filtros.busca?.trim()) params.set("busca", filtros.busca.trim());
  if (filtros.especie) params.set("especie", filtros.especie);
  if (filtros.sexo) params.set("sexo", filtros.sexo);
  if (filtros.porte) params.set("porte", filtros.porte);
  if (filtros.situacao) params.set("situacao", filtros.situacao);
  if (filtros.castrado) params.set("castrado", filtros.castrado);
  if (filtros.baiaId) params.set("baiaId", String(filtros.baiaId));
  if (filtros.semBaia) params.set("semBaia", "true");
  if (filtros.comAlertas) params.set("comAlertas", "true");
  if (filtros.incluirTerminais) params.set("incluirTerminais", "true");
  if (filtros.pagina) params.set("pagina", String(filtros.pagina));
  if (filtros.limite) params.set("limite", String(filtros.limite));
  const query = params.toString();
  return request<ListaAnimais>(`/animais${query ? `?${query}` : ""}`, { method: "GET" });
}

export function obterAnimal(id: number): Promise<Animal> {
  return request<Animal>(`/animais/${id}`, { method: "GET" });
}

export function criarAnimal(input: CriarAnimalInput): Promise<Animal> {
  return request<Animal>("/animais", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function atualizarAnimal(id: number, input: AtualizarAnimalInput): Promise<Animal> {
  return request<Animal>(`/animais/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function listarRacasAnimais(especie?: EspecieAnimal): Promise<RacaAnimal[]> {
  const query = especie ? `?especie=${encodeURIComponent(especie)}` : "";
  return request<RacaAnimal[]>(`/animais/racas${query}`, { method: "GET" });
}

export function criarRacaAnimal(input: CriarRacaAnimalInput): Promise<RacaAnimal> {
  return request<RacaAnimal>("/animais/racas", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listarTimelineAnimal(id: number): Promise<EventoAnimal[]> {
  return request<EventoAnimal[]>(`/animais/${id}/timeline`, { method: "GET" });
}

export function adicionarObservacaoAnimal(id: number, input: CriarObservacaoAnimalInput): Promise<ObservacaoAnimal> {
  return request<ObservacaoAnimal>(`/animais/${id}/observacoes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function adicionarPesagemAnimal(id: number, input: CriarPesagemAnimalInput): Promise<PesagemAnimal> {
  return request<PesagemAnimal>(`/animais/${id}/pesagens`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function registrarEventoAnimal(id: number, input: CriarEventoAnimalInput): Promise<EventoAnimal> {
  return request<EventoAnimal>(`/animais/${id}/eventos`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function alocarAnimal(id: number, input: AlocarAnimalInput): Promise<Animal> {
  return request<Animal>(`/animais/${id}/alocacao`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function adicionarFotoAnimal(id: number, foto: File): Promise<FotoAnimal> {
  const body = new FormData();
  body.set("foto", foto);
  return request<FotoAnimal>(`/animais/${id}/fotos`, {
    method: "POST",
    body,
  });
}

export function removerFotoAnimal(id: number, fotoId: number): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/animais/${id}/fotos/${fotoId}`, { method: "DELETE" });
}

export function revogarSituacaoAnimal(id: number, input: RevogarSituacaoAnimalInput): Promise<Animal> {
  return request<Animal>(`/animais/${id}/revogar-situacao`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/* Vacinação: catálogo, protocolos, aplicações e agenda. */

export type GravidadeReacaoAdversa = "leve" | "moderada" | "grave";
export type DesfechoReacaoAdversa = "em_acompanhamento" | "resolvida" | "resolvida_com_sequela" | "obito";
export type StatusProtocoloVacinal = "em_andamento" | "concluido" | "interrompido";
export type StatusAgendamentoVacinacao = "agendado" | "aplicado" | "faltou" | "cancelado";

export type Vacina = {
  id: number;
  nome: string;
  nomeNormalizado: string;
  especies: EspecieAnimal[];
  totalDoses: number;
  intervaloDosesDias: number | null;
  revacinacaoDias: number | null;
  /** Antecedência do alerta "dose a vencer". 0 desliga o aviso antecipado desta vacina. */
  diasAvisoProximaDose: number;
  idadeMinimaSemanas: number | null;
  fabricante: string | null;
  viaAplicacaoSugerida: string | null;
  obrigatoria: boolean;
  observacoes: string | null;
  ativa: boolean;
  createdAt: string;
  updatedAt: string;
  /** Só no detalhe e na edição: protocolos que seguem com o esquema anterior. */
  protocolosEmAndamento?: number;
  protocolosComEsquemaAnterior?: number;
};

export type AplicacaoVacina = {
  id: number;
  animalId: number;
  vacinaId: number;
  protocoloId: number;
  numeroDose: number;
  /** Data civil (AAAA-MM-DD), sem hora. */
  dataAplicacao: string;
  lote: string;
  validadeLote: string | null;
  viaAplicacao: string | null;
  observacao: string | null;
  aplicadoPor: string | null;
  registradoPor: Pick<PublicUser, "id" | "nome"> | null;
  registroRetroativo: boolean;
  aplicadaAdiantada: boolean;
  motivoAdiantada: string | null;
  diasAntecipacao: number | null;
  dataProximaDose: string | null;
  dataProximaDoseCalculada: string | null;
  prontuarioId: number | null;
  anulada: boolean;
  anuladaEm: string | null;
  anuladaPor: Pick<PublicUser, "id" | "nome"> | null;
  motivoAnulacao: string | null;
  agendamentoId: number | null;
  createdAt: string;
};

export type ProtocoloVacinal = {
  id: number;
  animalId: number;
  vacinaId: number;
  vacina: Pick<Vacina, "id" | "nome" | "especies" | "ativa" | "obrigatoria" | "idadeMinimaSemanas">;
  status: StatusProtocoloVacinal;
  dosesPrevistas: number;
  dosesAplicadas: number;
  dosesFaltantes: number;
  proximoNumeroDose: number;
  intervaloDosesDias: number | null;
  revacinacaoDias: number | null;
  diasAvisoProximaDose: number;
  dataUltimaAplicacao: string | null;
  /** Data a partir da qual a próxima dose é regular. É o que permite avisar antes do envio. */
  dataMinimaProximaDose: string | null;
  dataProximaDose: string | null;
  motivoInterrupcao: string | null;
  interrompidoEm: string | null;
  interrompidoPor: Pick<PublicUser, "id" | "nome"> | null;
  aplicacoes: AplicacaoVacina[];
  agendamentoEmAberto: {
    id: number;
    numeroDosePrevista: number;
    dataHoraPrevista: string;
    responsavel: Pick<PublicUser, "id" | "nome"> | null;
  } | null;
};

export type VacinacaoDoAnimal = {
  animalId: number;
  situacao: SituacaoAnimal;
  somenteLeitura: boolean;
  protocolos: ProtocoloVacinal[];
};

export type AvisoAplicacao = { codigo: string; message: string } & Record<string, unknown>;

export type RegistroAplicacaoResultado = {
  aplicacao: AplicacaoVacina;
  protocolo: ProtocoloVacinal;
  avisos: AvisoAplicacao[];
};

export type ReacaoAdversa = {
  id: number;
  registradoEm: string;
  registradoPor: Pick<PublicUser, "id" | "nome"> | null;
  resumo: string;
  aplicacaoVacinaId: number | null;
  gravidade: GravidadeReacaoAdversa;
  desfecho: DesfechoReacaoAdversa;
  emAcompanhamento: boolean;
  atualizacoes: {
    id: number;
    registradoEm: string;
    registradoPor: Pick<PublicUser, "id" | "nome"> | null;
    resumo: string;
    gravidade: GravidadeReacaoAdversa;
    desfecho: DesfechoReacaoAdversa;
  }[];
};

export type ObservacaoAntirrabica = {
  inicioEm: string;
  periodoDias: number;
  diasDecorridos: number;
  diasRestantes: number;
  encerraEm: string;
  vencida: boolean;
};

export type CriarVacinaInput = {
  nome: string;
  especies: EspecieAnimal[];
  totalDoses: number;
  intervaloDosesDias?: number | null;
  revacinacaoDias?: number | null;
  diasAvisoProximaDose?: number;
  idadeMinimaSemanas?: number | null;
  fabricante?: string | null;
  viaAplicacaoSugerida?: string | null;
  obrigatoria?: boolean;
  observacoes?: string | null;
};

export type AtualizarVacinaInput = Partial<CriarVacinaInput>;

export type RegistrarAplicacaoInput = {
  vacinaId: number;
  dataAplicacao: string;
  lote: string;
  validadeLote?: string | null;
  viaAplicacao?: string | null;
  observacao?: string | null;
  aplicadoPor?: string | null;
  registroRetroativo?: boolean;
  /** Confirmação explícita de dose adiantada. Sem ela e sem motivo, a API recusa com 409. */
  confirmaAdiantada?: boolean;
  motivoAdiantada?: string;
  dataProximaDose?: string | null;
  /** Dose que a tela mostrou. A API recusa se ela mudou no meio-tempo. */
  numeroDoseEsperada?: number;
};

export type EditarAplicacaoInput = {
  lote?: string;
  validadeLote?: string | null;
  viaAplicacao?: string | null;
  observacao?: string | null;
  aplicadoPor?: string | null;
  dataProximaDose?: string | null;
};

export type RegistrarReacaoAdversaInput = {
  resumo: string;
  gravidadeReacao: GravidadeReacaoAdversa;
  desfechoReacao: DesfechoReacaoAdversa;
  aplicacaoVacinaId?: number;
  /** Atualização de desfecho: aponta para a reação já registrada. */
  eventoOrigemId?: number;
};

export type EncerrarObservacaoAntirrabicaInput = {
  observacaoFinal: string;
  situacao: Extract<SituacaoAnimal, "em_tratamento" | "em_quarentena_observacao" | "saudavel" | "obito">;
};

export function listarVacinas(filtros: { busca?: string; especie?: EspecieAnimal; ativa?: boolean } = {}): Promise<Vacina[]> {
  const params = new URLSearchParams();
  if (filtros.busca?.trim()) params.set("busca", filtros.busca.trim());
  if (filtros.especie) params.set("especie", filtros.especie);
  if (filtros.ativa !== undefined) params.set("ativa", String(filtros.ativa));
  const query = params.toString();
  return request<Vacina[]>(`/vacinas${query ? `?${query}` : ""}`, { method: "GET" });
}

export function obterVacina(id: number): Promise<Vacina> {
  return request<Vacina>(`/vacinas/${id}`, { method: "GET" });
}

export function criarVacina(input: CriarVacinaInput): Promise<Vacina> {
  return request<Vacina>("/vacinas", { method: "POST", body: JSON.stringify(input) });
}

export function atualizarVacina(id: number, input: AtualizarVacinaInput): Promise<Vacina> {
  return request<Vacina>(`/vacinas/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function inativarVacina(id: number): Promise<Vacina> {
  return request<Vacina>(`/vacinas/${id}/inativar`, { method: "POST" });
}

export function reativarVacina(id: number): Promise<Vacina> {
  return request<Vacina>(`/vacinas/${id}/reativar`, { method: "POST" });
}

export function obterVacinacaoDoAnimal(animalId: number): Promise<VacinacaoDoAnimal> {
  return request<VacinacaoDoAnimal>(`/animais/${animalId}/vacinacao`, { method: "GET" });
}

export function registrarAplicacaoVacina(
  animalId: number,
  input: RegistrarAplicacaoInput,
): Promise<RegistroAplicacaoResultado> {
  return request<RegistroAplicacaoResultado>(`/animais/${animalId}/vacinacao/aplicacoes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function editarAplicacaoVacina(
  animalId: number,
  aplicacaoId: number,
  input: EditarAplicacaoInput,
): Promise<{ aplicacao: AplicacaoVacina; protocolo: ProtocoloVacinal }> {
  return request(`/animais/${animalId}/vacinacao/aplicacoes/${aplicacaoId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function anularAplicacaoVacina(
  animalId: number,
  aplicacaoId: number,
  motivo: string,
): Promise<{ aplicacao: AplicacaoVacina; protocolo: ProtocoloVacinal; agendamentoReaberto: boolean }> {
  return request(`/animais/${animalId}/vacinacao/aplicacoes/${aplicacaoId}/anular`, {
    method: "POST",
    body: JSON.stringify({ motivo }),
  });
}

export function interromperProtocoloVacinal(
  animalId: number,
  protocoloId: number,
  motivo: string,
): Promise<ProtocoloVacinal> {
  return request<ProtocoloVacinal>(`/animais/${animalId}/vacinacao/protocolos/${protocoloId}/interromper`, {
    method: "POST",
    body: JSON.stringify({ motivo }),
  });
}

export function retomarProtocoloVacinal(animalId: number, protocoloId: number): Promise<ProtocoloVacinal> {
  return request<ProtocoloVacinal>(`/animais/${animalId}/vacinacao/protocolos/${protocoloId}/retomar`, {
    method: "POST",
  });
}

export function registrarReacaoAdversa(animalId: number, input: RegistrarReacaoAdversaInput): Promise<EventoAnimal> {
  return request<EventoAnimal>(`/animais/${animalId}/eventos`, {
    method: "POST",
    body: JSON.stringify({ tipo: "reacao_adversa", ...input }),
  });
}

export function encerrarObservacaoAntirrabica(
  animalId: number,
  input: EncerrarObservacaoAntirrabicaInput,
): Promise<Animal> {
  return request<Animal>(`/animais/${animalId}/encerrar-observacao-antirrabica`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type AgendamentoVacinacao = {
  id: number;
  animalId: number;
  animal: Pick<Animal, "id" | "nome" | "numeroRegistro" | "especie" | "situacao">;
  vacinaId: number;
  vacina: Pick<Vacina, "id" | "nome" | "ativa">;
  protocoloId: number;
  dosesPrevistas: number;
  numeroDosePrevista: number;
  dataHoraPrevista: string;
  responsavel: Pick<PublicUser, "id" | "nome"> | null;
  criadoPor: Pick<PublicUser, "id" | "nome"> | null;
  observacao: string | null;
  status: StatusAgendamentoVacinacao;
  /** Derivado: agendado cuja data e hora já passaram. Não é estado armazenado. */
  atrasado: boolean;
  motivoCancelamento: string | null;
  aplicacao: { id: number; numeroDose: number; dataAplicacao: string; anuladaEm: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

export type ListarAgendaFiltros = {
  busca?: string;
  de?: string;
  ate?: string;
  vacinaId?: number;
  especie?: EspecieAnimal;
  responsavelId?: number;
  status?: StatusAgendamentoVacinacao;
  atrasados?: boolean;
  incluirTerminais?: boolean;
  pagina?: number;
  limite?: number;
};

export type ListaAgenda = {
  total: number;
  /** Quantos itens do filtro atual estão atrasados, mesmo fora da página. */
  atrasados: number;
  pagina: number;
  limite: number;
  items: AgendamentoVacinacao[];
};

export type CriarAgendamentoInput = {
  animalId: number;
  vacinaId: number;
  dataHoraPrevista: string;
  responsavelId?: number | null;
  observacao?: string | null;
};

export type RemarcarAgendamentoInput = {
  dataHoraPrevista: string;
  responsavelId?: number | null;
  observacao?: string | null;
  motivo?: string;
};

export type BaixarAgendamentoInput = {
  dataAplicacao: string;
  lote: string;
  validadeLote?: string | null;
  viaAplicacao?: string | null;
  observacao?: string | null;
  aplicadoPor?: string | null;
  registroRetroativo?: boolean;
  confirmaAdiantada?: boolean;
  motivoAdiantada?: string;
  dataProximaDose?: string | null;
};

export function listarAgenda(filtros: ListarAgendaFiltros = {}): Promise<ListaAgenda> {
  const params = new URLSearchParams();
  if (filtros.busca?.trim()) params.set("busca", filtros.busca.trim());
  if (filtros.de) params.set("de", filtros.de);
  if (filtros.ate) params.set("ate", filtros.ate);
  if (filtros.vacinaId) params.set("vacinaId", String(filtros.vacinaId));
  if (filtros.especie) params.set("especie", filtros.especie);
  if (filtros.responsavelId) params.set("responsavelId", String(filtros.responsavelId));
  if (filtros.status) params.set("status", filtros.status);
  if (filtros.atrasados) params.set("atrasados", "true");
  if (filtros.incluirTerminais) params.set("incluirTerminais", "true");
  if (filtros.pagina) params.set("pagina", String(filtros.pagina));
  if (filtros.limite) params.set("limite", String(filtros.limite));
  const query = params.toString();
  return request<ListaAgenda>(`/vacinacao/agenda${query ? `?${query}` : ""}`, { method: "GET" });
}

export function obterAgendamento(id: number): Promise<AgendamentoVacinacao> {
  return request<AgendamentoVacinacao>(`/vacinacao/agendamentos/${id}`, { method: "GET" });
}

export function criarAgendamento(
  input: CriarAgendamentoInput,
): Promise<{ agendamento: AgendamentoVacinacao; avisos: AvisoAplicacao[] }> {
  return request(`/vacinacao/agendamentos`, { method: "POST", body: JSON.stringify(input) });
}

export function remarcarAgendamento(id: number, input: RemarcarAgendamentoInput): Promise<AgendamentoVacinacao> {
  return request<AgendamentoVacinacao>(`/vacinacao/agendamentos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function cancelarAgendamento(id: number, motivo: string): Promise<AgendamentoVacinacao> {
  return request<AgendamentoVacinacao>(`/vacinacao/agendamentos/${id}/cancelar`, {
    method: "POST",
    body: JSON.stringify({ motivo }),
  });
}

export function marcarFaltaAgendamento(id: number): Promise<AgendamentoVacinacao> {
  return request<AgendamentoVacinacao>(`/vacinacao/agendamentos/${id}/falta`, { method: "POST" });
}

export function baixarAgendamento(
  id: number,
  input: BaixarAgendamentoInput,
): Promise<{
  agendamento: AgendamentoVacinacao;
  aplicacao: AplicacaoVacina;
  protocolo: ProtocoloVacinal;
  avisos: AvisoAplicacao[];
}> {
  return request(`/vacinacao/agendamentos/${id}/baixa`, { method: "POST", body: JSON.stringify(input) });
}

export function animalFotoUrl(foto: Pick<FotoAnimal, "url">): string {
  return `${API_URL}${foto.url}`;
}

export async function carregarArquivoFoto(foto: Pick<FotoAnimal, "url">): Promise<Blob> {
  return requestBlob(foto.url);
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // A sessão local acaba mesmo se o servidor não responder.
  }
  clearAccess();
}

type RequestOptions = {
  auth?: boolean;
  retried?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        clearAccess();
        return false;
      }
      const body = (await response.json()) as {
        accessToken?: unknown;
        usuario?: PublicUser;
      };
      if (typeof body.accessToken !== "string" || !body.usuario) {
        clearAccess();
        return false;
      }
      accessToken = body.accessToken;
      currentUser = body.usuario;
      return true;
    } catch {
      clearAccess();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function leaveToLogin() {
  clearAccess();
  if (typeof window !== "undefined" && window.location.pathname !== "/") {
    window.location.assign("/");
  }
}

async function authorizedFetch(
  path: string,
  init: RequestInit,
  options: RequestOptions = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.auth !== false && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError("Não foi possível falar com o servidor.", 0);
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
  options: RequestOptions = {},
): Promise<T> {
  const response = await authorizedFetch(path, init, options);

  const payload: unknown = await response.json().catch(() => null);
  if (response.status === 401 && options.auth !== false && !options.retried) {
    const restored = await refreshSession();
    if (restored) {
      return request<T>(path, init, { ...options, retried: true });
    }
    leaveToLogin();
    throw new ApiError(messageFrom(payload), 401, payload);
  }
  if (!response.ok) {
    throw new ApiError(messageFrom(payload), response.status, payload);
  }
  return payload as T;
}

async function requestBlob(
  path: string,
  options: RequestOptions = {},
): Promise<Blob> {
  const response = await authorizedFetch(path, { method: "GET" }, options);
  if (response.status === 401 && options.auth !== false && !options.retried) {
    const restored = await refreshSession();
    if (restored) return requestBlob(path, { ...options, retried: true });
    leaveToLogin();
    throw new ApiError("Sessão expirada.", 401);
  }
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new ApiError(messageFrom(payload), response.status, payload);
  }
  return response.blob();
}

function messageFrom(payload: unknown): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  }
  return "Não foi possível concluir agora.";
}
