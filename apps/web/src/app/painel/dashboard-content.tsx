"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, ClipboardList, Clock3, HeartHandshake, HeartPulse, House, PawPrint, RefreshCw, Stethoscope, Syringe, TriangleAlert, Warehouse, type LucideIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, obterDashboard, type Dashboard } from "@/lib/api";

const number = new Intl.NumberFormat("pt-BR");
const signed = new Intl.NumberFormat("pt-BR", { signDisplay: "exceptZero", maximumFractionDigits: 1 });
const timestamp = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const month = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
const panel = "min-w-0 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5";
const metricTone = {
  primary: "bg-[var(--primary-50)] text-[var(--primary)]",
  ok: "bg-[var(--ok-50)] text-[var(--ok)]",
  warn: "bg-[var(--warn-50)] text-[var(--warn)]",
  info: "bg-[var(--info-50)] text-[var(--info)]",
  muted: "bg-[var(--bg)] text-[var(--muted)]",
} as const;
type MetricTone = keyof typeof metricTone;
const metricValueTone: Record<MetricTone, string> = {
  primary: "",
  ok: "text-[var(--ok)]",
  warn: "text-[var(--warn)]",
  info: "text-[var(--info)]",
  muted: "",
};

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "success"; data: Dashboard };

export function DashboardContent() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    obterDashboard()
      .then((data) => { if (active) setState({ status: "success", data }); })
      .catch((error: unknown) => {
        if (active) setState({ status: "error", message: error instanceof ApiError ? error.message : "Não foi possível consultar os indicadores. Tente novamente." });
      });
    return () => { active = false; };
  }, [revision]);

  function refresh() {
    setState({ status: "loading" });
    setRevision((value) => value + 1);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>Painel operacional</h1>
          <p className="mt-2 text-[var(--muted)]">Plantel, cuidados e acolhimento em uma visão do CCZ.</p>
          {state.status === "success" && <p className="mt-2 text-xs text-[var(--muted)]">Atualizado em <time dateTime={state.data.atualizadoEm}>{timestamp.format(new Date(state.data.atualizadoEm))}</time> · horário de Brasília</p>}
        </div>
        <Button variant="outline" onClick={refresh} disabled={state.status === "loading"}>
          <RefreshCw aria-hidden="true" /> Atualizar indicadores
        </Button>
      </div>
      {state.status === "loading" && <div role="status" aria-label="Carregando indicadores" className="space-y-6">
        <span className="sr-only">Carregando indicadores…</span>
        <Skeleton className="h-36 rounded-[10px] motion-reduce:animate-none" />
        <div className="grid gap-6 md:grid-cols-2"><Skeleton className="h-56 rounded-[10px] motion-reduce:animate-none" /><Skeleton className="h-56 rounded-[10px] motion-reduce:animate-none" /></div>
        <Skeleton className="h-64 rounded-[10px] motion-reduce:animate-none" />
      </div>}
      {state.status === "error" && <Alert variant="destructive">
        <TriangleAlert aria-hidden="true" /><AlertTitle>Indicadores indisponíveis</AlertTitle>
        <AlertDescription>{state.message}<div className="mt-3"><Button variant="outline" onClick={refresh}>Tentar novamente</Button></div></AlertDescription>
      </Alert>}
      {state.status === "success" && <DashboardValues data={state.data} />}
    </div>
  );
}

function SectionHeading({ id, icon: Icon, children }: { id: string; icon: LucideIcon; children: React.ReactNode }) {
  return <h2 id={id} className="flex items-center gap-2.5">
    <Icon className="size-5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
    {children}
  </h2>;
}

function Metric({ label, value, description, icon: Icon, tone, href, actionLabel }: { label: string; value: number; description: string; icon: LucideIcon; tone: MetricTone; href?: string; actionLabel?: string }) {
  return <div className="min-w-0">
    <dt className="flex items-center gap-2.5 font-semibold">
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${metricTone[tone]}`}><Icon className="size-4.5" aria-hidden="true" /></span>
      {label}
    </dt>
    <dd className={`mt-2 text-3xl font-semibold tabular-nums ${metricValueTone[tone]}`}>{number.format(value)}</dd>
    <dd className="mt-1 text-sm text-[var(--muted)]">{description}</dd>
    {href && actionLabel && <dd className="mt-3">
      <Button asChild variant="link" className="h-auto justify-start p-0">
        <Link href={href}>{actionLabel}<ArrowRight aria-hidden="true" /></Link>
      </Button>
    </dd>}
  </div>;
}

function localDateParam(value: string, endExclusive = false) {
  const date = new Date(value);
  if (endExclusive) date.setTime(date.getTime() - 1);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function adoptionListHref(period: Dashboard["adocoes"]["mesAtual"]) {
  const params = new URLSearchParams({
    adotadaDe: localDateParam(period.inicio),
    adotadaAte: localDateParam(period.fim, true),
  });
  return `/painel/animais?${params.toString()}`;
}

function DashboardValues({ data }: { data: Dashboard }) {
  const { plantel, acompanhamentoClinico: clinical, pendencias, ocupacao, adocoes } = data;
  const irregular = ocupacao.irregulares;
  const hasIrregular = irregular.animalAtivoEmBaiaNaoAtiva > 0 || irregular.animalTerminalAlocado > 0;

  return <>
    <section aria-labelledby="plantel-title" className={panel}>
      <SectionHeading id="plantel-title" icon={PawPrint}>Plantel</SectionHeading>
      <dl className="mt-5 grid gap-6 sm:grid-cols-3">
        <Metric label="Animais ativos" value={plantel.animaisAtivos} description="Sem incluir adotados ou óbitos." icon={PawPrint} tone="primary" href="/painel/animais" actionLabel="Ver plantel" />
        <Metric label="Animais alojados" value={plantel.animaisAlojados} description="Ativos em baias ativas." icon={House} tone="primary" />
        <Metric label="Disponíveis para adoção" value={plantel.disponiveisAdocao} description="Saudáveis e sem adoção ativa." icon={HeartHandshake} tone="ok" href="/painel/animais?situacao=saudavel" actionLabel="Ver disponíveis" />
      </dl>
      {plantel.animaisAtivos === 0 && <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-[var(--muted)]">Nenhum animal ativo no plantel neste momento.</p>}
    </section>

    <div className="grid gap-6 md:grid-cols-2">
      <section aria-labelledby="clinical-title" className={panel}>
        <SectionHeading id="clinical-title" icon={Stethoscope}>Acompanhamento clínico</SectionHeading>
        <dl className="mt-5 grid gap-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
          <Metric label="Em tratamento" value={clinical.emTratamento} description="Animais em cuidados clínicos." icon={HeartPulse} tone="warn" href="/painel/animais?situacao=em_tratamento" actionLabel="Ver animais" />
          <Metric label="Em quarentena / observação" value={clinical.emQuarentena} description="Animais em acompanhamento." icon={Clock3} tone="info" href="/painel/animais?situacao=em_quarentena_observacao" actionLabel="Ver animais" />
        </dl>
      </section>
      <section aria-labelledby="pending-title" className={panel}>
        <SectionHeading id="pending-title" icon={ClipboardList}>Pendências</SectionHeading>
        <dl className="mt-5"><Metric label="Castrações agendadas" value={pendencias.castracoesAgendadas} description="Procedimentos aguardando realização." icon={CalendarDays} tone="warn" href="/painel/castracoes" actionLabel="Abrir agenda" /></dl>
        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <h3 className="flex items-center gap-2.5 font-semibold"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--bg)] text-[var(--muted)]"><Syringe className="size-4.5" aria-hidden="true" /></span>Vacinas pendentes</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Futura implementação</p>
        </div>
      </section>
    </div>

    <section aria-labelledby="occupancy-title" className={panel}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionHeading id="occupancy-title" icon={Warehouse}>Ocupação das baias</SectionHeading>
        <p className="text-sm text-[var(--muted)]">{number.format(ocupacao.baiasAtivas.length)} {ocupacao.baiasAtivas.length === 1 ? "baia ativa" : "baias ativas"}</p>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">Animais ativos por baia, capacidade e vagas disponíveis.</p>
      {hasIrregular && <Alert variant="destructive" className="mt-4 border-[var(--crit)] bg-[var(--crit-50)]">
        <TriangleAlert aria-hidden="true" /><AlertTitle>Ocupação irregular</AlertTitle>
        <AlertDescription><ul className="list-inside list-disc">
          <li>Animais ativos em baias não ativas: {number.format(irregular.animalAtivoEmBaiaNaoAtiva)}.</li>
          <li>Animais adotados ou com óbito ainda alocados: {number.format(irregular.animalTerminalAlocado)}.</li>
        </ul><p className="mt-2">Esses vínculos não entram na ocupação regular abaixo.</p></AlertDescription>
      </Alert>}
      {ocupacao.baiasAtivas.length === 0 ? <div className="mt-5 rounded-[6px] bg-[var(--bg)] p-5">
        <p className="font-semibold">Nenhuma baia ativa</p>
        <p className="mt-1 text-sm text-[var(--muted)]">A ocupação aparecerá aqui quando houver baias ativas.</p>
      </div> : <ul className="mt-5 divide-y divide-[var(--line)]">
        {ocupacao.baiasAtivas.map((baia) => <li key={baia.baiaId} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
          <div className="min-w-0"><h3 className="flex items-center gap-2 break-words font-semibold"><House className="size-4 shrink-0 text-[var(--primary)]" aria-hidden="true" />Baia {baia.codigo}</h3><p className="mt-1 text-sm text-[var(--muted)]">{baia.ocupantes === 0 ? "Sem ocupantes" : "Animais ativos alojados"}</p></div>
          <div className="sm:text-right"><p className="tabular-nums"><strong>{number.format(baia.ocupantes)}</strong> / {number.format(baia.capacidade)} <span className="text-[var(--muted)]">ocupação / capacidade</span></p>
            <p className={`mt-1 text-sm tabular-nums ${baia.ocupantes > baia.capacidade ? "font-semibold text-[var(--crit)]" : "text-[var(--muted)]"}`}>{baia.ocupantes > baia.capacidade ? `${number.format(baia.ocupantes - baia.capacidade)} acima da capacidade` : `${number.format(baia.capacidade - baia.ocupantes)} vagas disponíveis`}</p>
            <div className="mt-2 flex flex-wrap gap-3 sm:justify-end">
              <Button asChild variant="link" className="h-auto p-0"><Link href={`/painel/baias?baia=${baia.baiaId}`}>Abrir baia</Link></Button>
              <Button asChild variant="link" className="h-auto p-0"><Link href={`/painel/animais?baiaId=${baia.baiaId}`}>Ver animais</Link></Button>
            </div>
          </div>
        </li>)}
      </ul>}
    </section>

    <section aria-labelledby="adoption-title" className={panel}>
      <SectionHeading id="adoption-title" icon={HeartHandshake}>Adoções</SectionHeading>
      <p className="mt-2 text-sm text-[var(--muted)]">Registros por mês, incluindo adoções com devolução posterior.</p>
      <dl className="mt-5 grid gap-6 sm:grid-cols-2">
        <Metric label="Mês atual" value={adocoes.mesAtual.total} description={month.format(new Date(adocoes.mesAtual.inicio))} icon={HeartHandshake} tone="ok" href={adoptionListHref(adocoes.mesAtual)} actionLabel="Ver adoções do período" />
        <Metric label="Mês anterior" value={adocoes.mesAnterior.total} description={month.format(new Date(adocoes.mesAnterior.inicio))} icon={CalendarDays} tone="muted" href={adoptionListHref(adocoes.mesAnterior)} actionLabel="Ver adoções do período" />
      </dl>
      <div className="mt-5 border-t border-[var(--line)] pt-4 text-sm">
        <p className="font-semibold tabular-nums">Variação: {signed.format(adocoes.variacaoAbsoluta)} {Math.abs(adocoes.variacaoAbsoluta) === 1 ? "adoção" : "adoções"}{adocoes.variacaoPercentual !== null && ` (${signed.format(adocoes.variacaoPercentual)}%)`}</p>
        <p className="mt-1 text-[var(--muted)]">{adocoes.variacaoPercentual === null ? "Sem base percentual: o mês anterior não teve adoções." : "Comparação do mês atual, ainda em andamento, com o mês anterior completo."}</p>
      </div>
    </section>
  </>;
}
