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

async function request<T>(
  path: string,
  init: RequestInit,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.auth !== false && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError("Não foi possível falar com o servidor.", 0);
  }

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

function messageFrom(payload: unknown): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  }
  return "Não foi possível concluir agora.";
}
