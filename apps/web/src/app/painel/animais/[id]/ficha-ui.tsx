"use client";

import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { EspecieAnimal, PorteAnimal, SexoAnimal, SituacaoAnimal, UnidadeIdadeAnimal } from "@/lib/api";

export const painelFicha = "scroll-mt-4 [background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] gap-4 [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto]";

export const especieLabel: Record<EspecieAnimal, string> = {
  cao: "Cão",
  gato: "Gato",
};

export const situacaoLabel: Record<SituacaoAnimal, string> = {
  em_tratamento: "Em tratamento",
  em_quarentena_observacao: "Quarentena/observação",
  saudavel: "Saudável",
  adotado: "Adotado",
  obito: "Óbito",
};

export const sexoLabel: Record<SexoAnimal, string> = {
  macho: "Macho",
  femea: "Fêmea",
  nao_informado: "Não informado",
};

export const porteLabel: Record<PorteAnimal, string> = {
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
  nao_informado: "Não informado",
};

export const unidadeLabel: Record<UnidadeIdadeAnimal, string> = {
  dias: "Dia(s)",
  meses: "Mês(es)",
  anos: "Ano(s)",
};

export function SectionHeader({ icon, title, note }: { icon: ReactNode; title: string; note: string }) {
  return (
    <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] [&_h2]:[margin:0] [&_h2]:[font-size:17px] [&>svg]:[width:22px] [&>svg]:[height:22px] [&>svg]:[color:var(--primary)] [&_svg]:[color:var(--primary)] [margin-bottom:16px] [&_h2]:[margin-top:0] [&_svg]:[color:var(--primary)]">
      <div>
        <h2>{title}</h2>
        <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">{note}</p>
      </div>
      {icon}
    </div>
  );
}

export function QuickFact({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "ok" | "warn" | "info" | "muted" }) {
  return (
    <div className="[min-height:74px] [border:1px_solid_var(--line)] [border-radius:8px] [background:var(--bg)] [padding:12px] [display:flex] items-center [gap:10px] [&>span]:[width:34px] [&>span]:[height:34px] [&>span]:[border-radius:8px] [&>span]:[background:var(--surface)] [&>span]:grid [&>span]:[place-items:center] [&>span]:[flex:none] [&_svg]:[width:18px] [&_svg]:[height:18px] [&_small]:[color:var(--muted)] [&_small]:[font-weight:700] [&_b]:[display:block] [&_b]:[margin-top:2px] [&_b]:[overflow-wrap:anywhere] data-[tone=ok]:[&>span]:[color:var(--ok)] data-[tone=ok]:[&>span]:[background:var(--ok-50)] data-[tone=warn]:[&>span]:[color:var(--warn)] data-[tone=warn]:[&>span]:[background:var(--warn-50)] data-[tone=info]:[&>span]:[color:var(--info)] data-[tone=info]:[&>span]:[background:var(--info-50)] data-[tone=muted]:[&>span]:[color:var(--muted)] data-[tone=muted]:[&>span]:[background:var(--surface)]" data-tone={tone}>
      <span>{icon}</span>
      <div className="min-w-0">
        <small>{label}</small>
        <b>{value}</b>
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, required, children }: { label: string; htmlFor: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
      <Label htmlFor={htmlFor}>
        {label} {required ? <em className="[color:var(--crit)] [font-style:normal]">*</em> : null}
      </Label>
      {children}
    </div>
  );
}

export function CheckLine({ id, label, checked, disabled, onChange }: { id: string; label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-[13px]">
      <Label className="min-w-0 flex-1 leading-snug" htmlFor={id}>{label}</Label>
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-xs font-semibold text-[var(--muted)]">{checked ? "Sim" : "Não"}</span>
        <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
      </span>
    </div>
  );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

export function byline(usuario: string | undefined, createdAt: string) {
  return `${usuario ?? "Sistema"} · ${formatDate(createdAt)}`;
}

export function ListaRecolhida({ titulo, itens }: { titulo: string; itens: { id: number; title: string; detail: string; meta: string }[] }) {
  const [aberto, setAberto] = useState(false);
  if (itens.length === 0) return null;
  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto px-0 text-sm font-semibold hover:bg-transparent"
        aria-expanded={aberto}
        onClick={() => setAberto((valor) => !valor)}
      >
        {titulo} ({itens.length})
        <ChevronDown className={`size-4 transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden="true" />
      </Button>
      {aberto ? (
        <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
          {itens.map((item) => (
            <li className="flex flex-col gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2.5" key={item.id}>
              <b>{item.title}</b>
              <span className="text-[13px] text-[var(--muted)]">{item.detail}</span>
              <small className="text-[13px] text-[var(--muted)]">{item.meta}</small>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
