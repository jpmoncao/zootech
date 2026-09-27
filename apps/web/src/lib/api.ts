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
  nome: string;
  numeroRegistro: string;
  especie: EspecieAnimal;
  sexo: SexoAnimal;
  situacao: SituacaoAnimal;
  emIsolamento: boolean;
  idadeAproximada: boolean;
  raca: Pick<RacaAnimal, "nome" | "tipo"> | null;
  fotos: Pick<FotoAnimal, "id" | "url" | "identificacao">[];
  castracoes: Pick<CastracaoAnimal, "id" | "tipo" | "estado" | "dataHoraPlanejada" | "dataEfetiva" | "dataEfetivaTemHora" | "createdAt">[];
  estadoCastracao: StatusCastracaoAnimal;
  alertas: AnimalAlerta[];
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
  movimentacao?: {
    direcao: "entrada" | "saida";
    animalId: number;
    animal: { id: number; nome: string; numeroRegistro: string; especie: EspecieAnimal } | null;
    baiaRelacionada: { id: number; codigo: string } | null;
    observacao: string | null;
  };
};

export type EspecieAnimal = "cao" | "gato";
export type TipoRacaAnimal = "catalogo" | "srd" | "outra" | "nao_informada" | "personalizada";
export type SexoAnimal = "macho" | "femea" | "nao_informado";
export type PorteAnimal = "pequeno" | "medio" | "grande" | "nao_informado";
export type SituacaoAnimal = "em_tratamento" | "em_quarentena_observacao" | "saudavel" | "adotado" | "obito";
export type StatusCastracaoAnimal = EstadoCastracaoAnimal | "nao_informado";
export type TipoCastracaoAnimal = "avaliacao" | "procedimento";
export type EstadoCastracaoAnimal = "nao_castrado" | "agendada" | "realizada" | "cancelada";
export type OrigemCastracaoAnimal = "fluxo" | "legada";
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
  | "castracao";

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

export type CastracaoAnimal = {
  id: number;
  animalId: number;
  tipo: TipoCastracaoAnimal;
  estado: EstadoCastracaoAnimal;
  origem: OrigemCastracaoAnimal;
  dataHoraPlanejada: string | null;
  dataEfetiva: string | null;
  dataEfetivaTemHora: boolean;
  dataAvaliacao: string | null;
  observacao: string | null;
  motivoCancelamento: string | null;
  usuarioId: number | null;
  createdAt: string;
  updatedAt: string;
  usuario?: Pick<PublicUser, "id" | "nome"> | null;
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
  estadoCastracao: StatusCastracaoAnimal;
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
  castracoes?: CastracaoAnimal[];
  somenteLeitura: boolean;
  alertas: AnimalAlerta[];
  pesagens?: PesagemAnimal[];
  observacoes?: ObservacaoAnimal[];
  eventos?: EventoAnimal[];
  adocoes?: Adocao[];
};

export type ListarAnimaisFiltros = {
  busca?: string;
  especie?: EspecieAnimal;
  sexo?: SexoAnimal;
  porte?: PorteAnimal;
  situacao?: SituacaoAnimal;
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
  situacao: Extract<SituacaoAnimal, "em_tratamento" | "em_quarentena_observacao" | "saudavel">;
  motivo: string;
};

export type MidiaTutor = {
  id: number;
  tutorId?: number;
  mimeType: string;
  tamanhoBytes: number;
  createdAt: string;
  url: string;
};

export type Tutor = {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  email: string | null;
  tipoDocumento: string;
  numeroDocumento: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  criadoPorId: number | null;
  atualizadoPorId: number | null;
  createdAt: string;
  updatedAt: string;
  foto?: Omit<MidiaTutor, "url"> | null;
  documentos?: Array<Omit<MidiaTutor, "url">>;
};

export type CriarTutorInput = Omit<Tutor, "id" | "criadoPorId" | "atualizadoPorId" | "createdAt" | "updatedAt" | "foto" | "documentos" | "email" | "complemento"> & {
  email?: string;
  complemento?: string;
};
export type AtualizarTutorInput = Partial<CriarTutorInput>;

export type LiberacaoAdocao = {
  id: number;
  animalId: number;
  justificativa: string;
  autorizadaPorId: number | null;
  autorizadaEm: string;
  consumidaEm: string | null;
  createdAt: string;
};

export type DevolucaoAdocao = {
  id: number;
  adocaoId: number;
  motivo: string;
  situacaoRetorno: Extract<SituacaoAnimal, "em_tratamento" | "em_quarentena_observacao" | "saudavel">;
  baiaId: number | null;
  recebidaPorId: number | null;
  recebidaEm: string;
  createdAt: string;
  recebidaPor?: Pick<PublicUser, "id" | "nome"> | null;
  baia?: Pick<Baia, "id" | "codigo"> | null;
};

export type Adocao = {
  id: number;
  animalId: number;
  tutorId: number;
  liberacaoId: number | null;
  consentiuTratamento: boolean;
  consentiuAcompanhamento: boolean;
  adotadaPorId: number | null;
  adotadaEm: string;
  encerradaEm: string | null;
  createdAt: string;
  tutor?: Tutor;
  adotadaPor?: Pick<PublicUser, "id" | "nome"> | null;
  liberacao?: LiberacaoAdocao & { autorizadaPor?: Pick<PublicUser, "id" | "nome"> | null };
  devolucao?: DevolucaoAdocao | null;
  assinaturaUrl?: string;
};

export type ConcluirAdocaoInput = {
  tutorId: number;
  consentiuTratamento: boolean;
  consentiuAcompanhamento: boolean;
  assinatura: File;
};

export type RegistrarDevolucaoInput = {
  motivo: string;
  situacaoRetorno: DevolucaoAdocao["situacaoRetorno"];
  baiaId?: number | null;
};

export type ListarCastracoesFiltros = {
  estado?: Extract<EstadoCastracaoAnimal, "agendada" | "realizada" | "cancelada">;
  de?: string;
  ate?: string;
  busca?: string;
  pagina?: number;
  limite?: number;
};

export type CastracaoAgendaItem = CastracaoAnimal & {
  animal: Pick<Animal, "id" | "nome" | "numeroRegistro" | "especie" | "situacao"> & {
    baia: Pick<Baia, "id" | "codigo"> | null;
  };
};

export type ListaCastracoes = { itens: CastracaoAgendaItem[]; total: number; pagina: number; limite: number };

export type CastracaoAgendamentoInput = {
  dataHoraPlanejada: string;
  observacao?: string;
};

export type CastracaoAvaliacaoInput = {
  dataAvaliacao?: string;
  observacao?: string;
};

export type CastracaoLegadaInput = {
  dataEfetiva?: string;
  dataEfetivaTemHora?: boolean;
  observacao?: string;
};

export type ConcluirCastracaoInput = {
  dataEfetiva: string;
  dataEfetivaTemHora?: boolean;
  observacao?: string;
};

export type CancelarCastracaoInput = {
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

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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

export function listarTutores(busca?: string): Promise<Tutor[]> {
  const query = busca?.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : "";
  return request<Tutor[]>(`/tutores${query}`, { method: "GET" });
}

export function obterTutor(id: number): Promise<Tutor> {
  return request<Tutor>(`/tutores/${id}`, { method: "GET" });
}

export function buscarTutorPorCpf(cpf: string): Promise<Tutor> {
  return request<Tutor>(`/tutores/cpf/${encodeURIComponent(cpf)}`, { method: "GET" });
}

export function criarTutor(input: CriarTutorInput): Promise<Tutor> {
  return request<Tutor>("/tutores", { method: "POST", body: JSON.stringify(input) });
}

export function atualizarTutor(id: number, input: AtualizarTutorInput): Promise<Tutor> {
  return request<Tutor>(`/tutores/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function adicionarFotoTutor(id: number, arquivo: File): Promise<MidiaTutor> {
  return adicionarMidiaTutor(id, "foto", arquivo);
}

export function adicionarDocumentoTutor(id: number, arquivo: File): Promise<MidiaTutor> {
  return adicionarMidiaTutor(id, "documentos", arquivo);
}

function adicionarMidiaTutor(id: number, tipo: "foto" | "documentos", arquivo: File): Promise<MidiaTutor> {
  const body = new FormData();
  body.set("arquivo", arquivo);
  return request<MidiaTutor>(`/tutores/${id}/midia/${tipo}`, { method: "POST", body });
}

export async function carregarMidiaTutor(midia: Pick<MidiaTutor, "url">): Promise<Blob> {
  return requestBlob(midia.url);
}

export function liberarAnimalParaAdocao(animalId: number, justificativa: string): Promise<LiberacaoAdocao> {
  return request<LiberacaoAdocao>(`/animais/${animalId}/adocoes/liberacao`, {
    method: "POST",
    body: JSON.stringify({ justificativa }),
  });
}

export function concluirAdocao(animalId: number, input: ConcluirAdocaoInput): Promise<Adocao> {
  const body = new FormData();
  body.set("tutorId", String(input.tutorId));
  body.set("consentiuTratamento", String(input.consentiuTratamento));
  body.set("consentiuAcompanhamento", String(input.consentiuAcompanhamento));
  body.set("assinatura", input.assinatura, input.assinatura.name || "assinatura.png");
  return request<Adocao>(`/animais/${animalId}/adocoes`, { method: "POST", body });
}

export function registrarDevolucao(animalId: number, input: RegistrarDevolucaoInput): Promise<DevolucaoAdocao> {
  return request<DevolucaoAdocao>(`/animais/${animalId}/adocoes/devolucao`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function carregarAssinaturaAdocao(animalId: number, adocaoId: number): Promise<Blob> {
  return requestBlob(`/animais/${animalId}/adocoes/assinatura/${adocaoId}`);
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

export function listarCastracoesAnimal(animalId: number): Promise<CastracaoAnimal[]> {
  return request<CastracaoAnimal[]>(`/animais/${animalId}/castracoes`, { method: "GET" });
}

export function listarAgendaCastracoes(filtros: ListarCastracoesFiltros = {}): Promise<ListaCastracoes> {
  const params = new URLSearchParams();
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.de) params.set("de", filtros.de);
  if (filtros.ate) params.set("ate", filtros.ate);
  if (filtros.busca?.trim()) params.set("busca", filtros.busca.trim());
  if (filtros.pagina) params.set("pagina", String(filtros.pagina));
  if (filtros.limite) params.set("limite", String(filtros.limite));
  return request<ListaCastracoes>(`/animais/castracoes?${params.toString()}`, { method: "GET" });
}

export function avaliarCastracaoAnimal(animalId: number, input: CastracaoAvaliacaoInput): Promise<CastracaoAnimal> {
  return request<CastracaoAnimal>(`/animais/${animalId}/castracoes/avaliacoes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function registrarCastracaoLegadaAnimal(animalId: number, input: CastracaoLegadaInput): Promise<CastracaoAnimal> {
  return request<CastracaoAnimal>(`/animais/${animalId}/castracoes/legado-realizado`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function agendarCastracaoAnimal(animalId: number, input: CastracaoAgendamentoInput): Promise<CastracaoAnimal> {
  return request<CastracaoAnimal>(`/animais/${animalId}/castracoes/agendamentos`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function reagendarCastracaoAnimal(animalId: number, castracaoId: number, input: CastracaoAgendamentoInput): Promise<CastracaoAnimal> {
  return request<CastracaoAnimal>(`/animais/${animalId}/castracoes/${castracaoId}/reagendar`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function concluirCastracaoAnimal(animalId: number, castracaoId: number, input: ConcluirCastracaoInput): Promise<CastracaoAnimal> {
  return request<CastracaoAnimal>(`/animais/${animalId}/castracoes/${castracaoId}/concluir`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function cancelarCastracaoAnimal(animalId: number, castracaoId: number, input: CancelarCastracaoInput): Promise<CastracaoAnimal> {
  return request<CastracaoAnimal>(`/animais/${animalId}/castracoes/${castracaoId}/cancelar`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
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
    throw new ApiError(messageFrom(payload), 401);
  }
  if (!response.ok) {
    throw new ApiError(messageFrom(payload), response.status);
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
    throw new ApiError(messageFrom(payload), response.status);
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
