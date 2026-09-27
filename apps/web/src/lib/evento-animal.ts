import {
  CalendarCheck2,
  CalendarClock,
  CalendarOff,
  Check,
  CircleDashed,
  ClipboardCheckIcon,
  ClipboardPlusIcon,
  Edit3Icon,
  FileTextIcon,
  ImagePlusIcon,
  InfoIcon,
  MapPinPenIcon,
  MessageCircleIcon,
  PlusCircleIcon,
  RewindIcon,
  ScaleIcon,
  SliceIcon,
  type LucideIcon,
} from "lucide-react";
import type { EventoAnimal, TipoEventoAnimal } from "@/lib/api";

export type TomEventoAnimal = "ok" | "info" | "crit" | "muted" | "violet";

export type VisualEventoAnimal = {
  label: string;
  tone: TomEventoAnimal;
  icon: LucideIcon;
};

export const eventoLabel: Record<TipoEventoAnimal, string> = {
  criacao: "Criação",
  edicao: "Edição",
  acolhimento: "Acolhimento",
  mudanca_situacao: "Mudança de situação",
  mudanca_baia: "Mudança de baia",
  pesagem: "Pesagem",
  observacao: "Observação",
  foto: "Foto",
  exame: "Exame",
  diagnostico: "Diagnóstico",
  revogacao_situacao_terminal: "Revogação de estado terminal",
  castracao: "Castração",
};

const castracaoEventoVisual: Record<string, VisualEventoAnimal> = {
  agendamento_criado: { label: "Castração agendada", tone: "info", icon: CalendarCheck2 },
  agendamento_reagendado: { label: "Castração reagendada", tone: "info", icon: CalendarClock },
  procedimento_concluido: { label: "Castração realizada", tone: "ok", icon: Check },
  procedimento_realizado_legado: { label: "Castração realizada", tone: "ok", icon: Check },
  agendamento_cancelado: { label: "Agendamento de castração cancelado", tone: "crit", icon: CalendarOff },
  avaliacao_nao_castrado: { label: "Avaliação de castração", tone: "muted", icon: CircleDashed },
};

const eventoIcon: Record<TipoEventoAnimal, LucideIcon> = {
  criacao: PlusCircleIcon,
  edicao: Edit3Icon,
  acolhimento: FileTextIcon,
  mudanca_situacao: InfoIcon,
  mudanca_baia: MapPinPenIcon,
  pesagem: ScaleIcon,
  observacao: MessageCircleIcon,
  foto: ImagePlusIcon,
  exame: ClipboardPlusIcon,
  diagnostico: ClipboardCheckIcon,
  revogacao_situacao_terminal: RewindIcon,
  castracao: SliceIcon,
};

export function eventoVisual(evento: EventoAnimal): VisualEventoAnimal {
  if (evento.tipo === "castracao") {
    const acao = castracaoAcao(evento.dados);
    if (acao && castracaoEventoVisual[acao]) return castracaoEventoVisual[acao];
  }
  if (evento.tipo === "mudanca_situacao" && situacaoTerminal(evento.dados)) {
    return { label: eventoLabel.mudanca_situacao, tone: "violet", icon: eventoIcon.mudanca_situacao };
  }
  return {
    label: eventoLabel[evento.tipo] ?? evento.tipo,
    tone: eventoTone(evento.tipo),
    icon: eventoIcon[evento.tipo] ?? FileTextIcon,
  };
}

function situacaoTerminal(dados: unknown) {
  if (!dados || typeof dados !== "object") return false;
  const registro = dados as { adocaoId?: unknown; devolucaoId?: unknown; mudancas?: { situacao?: { depois?: unknown } } };
  if (registro.adocaoId != null && registro.devolucaoId == null) return true;
  const depois = registro.mudancas?.situacao?.depois;
  return depois === "adotado" || depois === "obito";
}

function castracaoAcao(dados: unknown) {
  if (!dados || typeof dados !== "object" || !("acao" in dados)) return null;
  const acao = (dados as { acao?: unknown }).acao;
  return typeof acao === "string" ? acao : null;
}

function eventoTone(tipo: TipoEventoAnimal): TomEventoAnimal {
  if (tipo === "revogacao_situacao_terminal" || tipo === "mudanca_situacao") return "crit";
  if (tipo === "criacao" || tipo === "castracao") return "muted";
  if (tipo === "pesagem" || tipo === "mudanca_baia" || tipo === "exame" || tipo === "diagnostico" || tipo === "foto" || tipo === "observacao") return "info";
  return "ok";
}
