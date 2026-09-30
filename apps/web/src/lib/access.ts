import type { PerfilAcesso } from "./api";

export const perfilLabel: Record<PerfilAcesso, string> = {
  coordenacao: "Coordenação",
  veterinario: "Médico(a)-veterinário(a)",
  agente: "Agente de zoonoses",
  recepcao: "Recepção",
};

const todos: readonly PerfilAcesso[] = [
  "coordenacao",
  "veterinario",
  "agente",
  "recepcao",
];

const funcionario: readonly PerfilAcesso[] = ["coordenacao", "agente", "recepcao"];
const clinico: readonly PerfilAcesso[] = ["coordenacao", "veterinario"];

const sectionRoles: Record<string, readonly PerfilAcesso[]> = {
  painel: todos,
  animais: todos,
  baias: todos,
  vacinacao: todos,
  castracoes: todos,
  adocoes: funcionario,
  observacao: clinico,
  denuncias: funcionario,
  relatorios: todos,
  acessos: ["coordenacao"],
  perfil: todos,
};

export function canAccess(perfil: PerfilAcesso, sectionId: string): boolean {
  const roles = sectionRoles[sectionId];
  if (!roles) return false;
  return roles.includes(perfil);
}

export function canManageBaias(perfil: PerfilAcesso): boolean {
  return perfil === "coordenacao";
}

export function canViewBaiasAudit(perfil: PerfilAcesso): boolean {
  return perfil === "coordenacao";
}

// Todos os perfis autenticados consultam vacinação: catálogo, ficha e agenda.
export function canViewVacinacao(perfil: PerfilAcesso): boolean {
  return todos.includes(perfil);
}

// Registrar aplicação, operar agenda e interromper/retomar protocolo é clínico.
export function canManageVacinacao(perfil: PerfilAcesso): boolean {
  return clinico.includes(perfil);
}

// O catálogo de vacinas é administrativo: só a Coordenação mantém.
export function canManageCatalogoVacinas(perfil: PerfilAcesso): boolean {
  return perfil === "coordenacao";
}

// Anular aplicação corrige o histórico e fica só com a Coordenação.
export function canAnularAplicacaoVacina(perfil: PerfilAcesso): boolean {
  return perfil === "coordenacao";
}

// Reação adversa e mudança de situação seguem a regra de eventos de animais,
// não a regra clínica: quem percebe a reação no canil costuma ser o agente.
export function canRegistrarReacaoAdversa(perfil: PerfilAcesso): boolean {
  return todos.includes(perfil);
}

export function canViewAnimais(perfil: PerfilAcesso): boolean {
  return todos.includes(perfil);
}

export function canManageAnimais(perfil: PerfilAcesso): boolean {
  return todos.includes(perfil);
}

export function canViewCastracoes(perfil: PerfilAcesso): boolean {
  return todos.includes(perfil);
}

export function canManageCastracoes(perfil: PerfilAcesso): boolean {
  return todos.includes(perfil);
}
