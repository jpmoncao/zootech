export type NavItem = {
  href: string;
  id: string;
  label: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const painelItem: NavItem = {
  href: "/painel",
  id: "painel",
  label: "Painel",
};

export const navGroups: NavGroup[] = [
  {
    label: "Plantel",
    items: [
      { href: "/painel/animais", id: "animais", label: "Animais" },
      { href: "/painel/baias", id: "baias", label: "Baias" },
      { href: "/painel/vacinacao", id: "vacinacao", label: "Vacinação" },
      { href: "/painel/castracoes", id: "castracoes", label: "Castrações" },
      { href: "/painel/adocoes", id: "adocoes", label: "Adoções" },
    ],
  },
  {
    label: "Vigilância",
    items: [
      { href: "/painel/observacao", id: "observacao", label: "Observação antirrábica" },
      { href: "/painel/denuncias", id: "denuncias", label: "Denúncias" },
      { href: "/painel/relatorios", id: "relatorios", label: "Relatórios" },
    ],
  },
];

export const sections = [painelItem, ...navGroups.flatMap((group) => group.items)];

export function findSection(id: string) {
  return sections.find((item) => item.id === id) ?? null;
}
