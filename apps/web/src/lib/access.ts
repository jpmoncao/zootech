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
  vacinacao: clinico,
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

export function canViewAnimais(perfil: PerfilAcesso): boolean {
  return todos.includes(perfil);
}

export function canManageAnimais(perfil: PerfilAcesso): boolean {
  return todos.includes(perfil);
}
