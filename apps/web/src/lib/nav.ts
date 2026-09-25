import { LucideIcon, ShieldCheck } from "lucide-react";
import { LayoutDashboard, MapPin, Dog } from "lucide-react";

export type NavItem = {
  href: string;
  id: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const painelItem: NavItem = {
  href: "/painel",
  id: "painel",
  label: "Painel",
  icon: LayoutDashboard,
};

export const acessosItem: NavItem = {
  href: "/painel/acessos",
  id: "acessos",
  label: "Acessos",
  icon: ShieldCheck,
};

export const navGroups: NavGroup[] = [
  {
    label: "Plantel",
    items: [
      { href: "/painel/animais", id: "animais", label: "Animais", icon: Dog },
      { href: "/painel/baias", id: "baias", label: "Baias", icon: MapPin },
      // { href: "/painel/vacinacao", id: "vacinacao", label: "Vacinação" },
      // { href: "/painel/castracoes", id: "castracoes", label: "Castrações" },
      // { href: "/painel/adocoes", id: "adocoes", label: "Adoções" },
    ],
  },
  // {
  //   label: "Vigilância",
  //   items: [
  //     { href: "/painel/observacao", id: "observacao", label: "Observação antirrábica" },
  //     { href: "/painel/denuncias", id: "denuncias", label: "Denúncias" },
  //     { href: "/painel/relatorios", id: "relatorios", label: "Relatórios" },
  //   ],
  // },
  {
    label: "Gestão",
    items: [acessosItem],
  },
];

export const sections = [painelItem, ...navGroups.flatMap((group) => group.items)];

export function findSection(id: string) {
  return sections.find((item) => item.id === id) ?? null;
}
