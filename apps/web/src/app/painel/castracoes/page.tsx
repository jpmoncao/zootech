"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { Shell } from "@/components/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ApiError, agendarCastracaoAnimal, cancelarCastracaoAnimal, concluirCastracaoAnimal,
  listarAgendaCastracoes, listarAnimais, reagendarCastracaoAnimal,
  type Animal, type CastracaoAgendaItem, type ListaCastracoes,
} from "@/lib/api";

type Status = "agendada" | "realizada" | "cancelada";
type Action = "agendar" | "reagendar" | "concluir" | "cancelar";
type ActionState = { action: Action; item?: CastracaoAgendaItem; animal?: Animal };
const labels: Record<Status, string> = { agendada: "Agendadas", realizada: "Realizadas", cancelada: "Canceladas" };
const dtf = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });
const df = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" });
const message = (error: unknown) => error instanceof ApiError ? error.message : "Não foi possível concluir a operação. Tente novamente.";
const localDateTime = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export default function Page() { return <Shell section="castracoes" title="Castrações"><Castracoes /></Shell>; }

function Castracoes() {
  const [status, setStatus] = useState<Status>("agendada");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<ListaCastracoes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionState | null>(null);
  const [choose, setChoose] = useState(false);
  const [animalSearch, setAnimalSearch] = useState("");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalLoading, setAnimalLoading] = useState(false);
  const [animalError, setAnimalError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    listarAgendaCastracoes({ estado: status, busca: query, de: from, ate: to, pagina: page, limite: 20 })
      .then((result) => { if (active) setData(result); })
      .catch((cause: unknown) => { if (active) { setError(message(cause)); setData(null); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status, query, from, to, page, revision]);

  useEffect(() => {
    if (!choose) return;
    let active = true;
    setAnimalLoading(true); setAnimalError(null);
    const timer = window.setTimeout(() => {
      listarAnimais({ busca: animalSearch, pagina: 1, limite: 20, incluirTerminais: false })
        .then((result) => { if (active) setAnimals(result.items); })
        .catch((cause: unknown) => { if (active) setAnimalError(message(cause)); })
        .finally(() => { if (active) setAnimalLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [choose, animalSearch]);

  const refresh = () => setRevision((value) => value + 1);
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));
  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 text-sm text-[var(--ink)] [&_[data-size=sm]]:min-h-10 sm:px-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-[family-name:var(--display)] text-[28px] font-bold tracking-[-0.02em]">Agenda de castrações</h1><p className="mt-1 text-[var(--muted)]">Acompanhe procedimentos planejados e consulte o histórico por animal.</p></div><Button onClick={() => { setAnimalSearch(""); setChoose(true); }}><Plus aria-hidden="true" /> Agendar castração</Button></header>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Status das castrações">{(["agendada", "realizada", "cancelada"] as Status[]).map((value) => <Button key={value} type="button" variant={status === value ? "default" : "outline"} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }}>{labels[value]}</Button>)}</div>
    <section className="rounded-[10px] border border-[var(--line)] bg-white p-4 shadow-[var(--shadow)] sm:p-5" aria-label="Filtros da agenda"><form className="grid gap-3 md:grid-cols-[minmax(200px,1fr)_150px_150px_auto] md:items-end" onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}><div className="space-y-1.5"><Label htmlFor="castration-search">Animal ou registro</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" /><Input id="castration-search" className="pl-9" placeholder="Buscar animal" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div><div className="space-y-1.5"><Label htmlFor="castration-from">De</Label><Input id="castration-from" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></div><div className="space-y-1.5"><Label htmlFor="castration-to">Até</Label><Input id="castration-to" type="date" min={from || undefined} value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></div><Button type="submit" variant="outline">Buscar</Button></form>{(from || to || query) && <Button className="mt-3" variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); setSearch(""); setQuery(""); setPage(1); }}>Limpar filtros</Button>}</section>
    <section aria-live="polite" aria-label={labels[status]}><div className="mb-3 flex items-baseline justify-between gap-2"><h2 className="font-[family-name:var(--display)] text-lg font-bold">{labels[status]}</h2>{!loading && !error && <span className="text-[var(--muted)]">{total} {total === 1 ? "registro" : "registros"}</span>}</div>
      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error} <Button type="button" variant="link" onClick={refresh}>Tentar novamente</Button></AlertDescription></Alert>}
      {loading ? <div className="space-y-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24 rounded-[10px]" />)}</div> : !error && total === 0 ? <div className="rounded-[10px] border border-dashed border-[var(--line)] bg-white p-8 text-center"><CalendarDays className="mx-auto mb-3 size-7 text-[var(--primary)]" aria-hidden="true" /><p className="font-semibold">Nenhuma castração encontrada.</p><p className="mt-1 text-[var(--muted)]">{from || to || query ? "Ajuste os filtros para consultar outros registros." : status === "agendada" ? "Selecione um animal para criar o primeiro agendamento." : "O histórico aparecerá aqui quando houver registros."}</p></div> : !error && <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white shadow-[var(--shadow)]">{data?.itens.map((item) => {
        const overdue = item.estado === "agendada" && !!item.dataHoraPlanejada && new Date(item.dataHoraPlanejada) < new Date();
        const terminal = item.animal.situacao === "adotado" || item.animal.situacao === "obito";
        const date = item.estado === "realizada" ? item.dataEfetiva : item.dataHoraPlanejada;
        const dateLabel = date ? item.estado === "realizada" && !item.dataEfetivaTemHora ? df.format(new Date(date)) : dtf.format(new Date(date)) : "Data não registrada";
        return <article key={item.id} className="flex flex-col gap-3 border-b border-[var(--line)] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-5"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Link href={`/painel/animais/${item.animal.id}`} className="font-semibold text-[var(--primary-700)] underline-offset-4 hover:underline">{item.animal.nome}</Link><span className="rounded-md bg-[var(--bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-xs text-[var(--muted)]">{item.animal.numeroRegistro}</span><span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${overdue ? "bg-[var(--crit-50)] text-[var(--crit)]" : status === "realizada" ? "bg-[var(--ok-50)] text-[#1d5c34]" : status === "cancelada" ? "bg-[var(--bg)] text-[var(--muted)]" : "bg-[var(--info-50)] text-[#1d4a75]"}`}>{overdue ? "Atrasada" : status === "agendada" ? "Agendada" : status === "realizada" ? "Realizada" : "Cancelada"}</span></div><p className="mt-1 text-[var(--muted)]">{item.animal.especie === "cao" ? "Cão" : "Gato"} · {item.animal.baia ? `Baia ${item.animal.baia.codigo}` : "Sem baia"}</p><p className="mt-1 font-medium">{dateLabel}</p>{item.motivoCancelamento && <p className="mt-1 text-[var(--muted)]">Motivo: {item.motivoCancelamento}</p>}{item.observacao && <p className="mt-1 text-[var(--muted)]">{item.observacao}</p>}</div><div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{status === "agendada" && <><Button variant="outline" size="sm" onClick={() => setAction({ action: "reagendar", item })}>Reagendar</Button><Button size="sm" disabled={terminal} onClick={() => setAction({ action: "concluir", item })}>Concluir</Button><Button variant="destructive" size="sm" onClick={() => setAction({ action: "cancelar", item })}>Cancelar</Button></>}{status === "cancelada" && <Button variant="outline" size="sm" disabled={terminal} onClick={() => setAction({ action: "agendar", item })}>Nova tentativa</Button>}</div></article>;
      })}</div>}
      {!loading && !error && pages > 1 && <nav className="mt-4 flex items-center justify-end gap-3" aria-label="Paginação"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft aria-hidden="true" /> Anterior</Button><span>Página {page} de {pages}</span><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Próxima <ChevronRight aria-hidden="true" /></Button></nav>}
    </section>
    <Dialog open={choose} onOpenChange={setChoose}><DialogContent><DialogHeader><DialogTitle>Selecionar animal</DialogTitle><DialogDescription>Busque pelo nome ou número de registro para agendar.</DialogDescription></DialogHeader><Label htmlFor="choose-animal">Nome ou registro</Label><Input id="choose-animal" value={animalSearch} onChange={(event) => setAnimalSearch(event.target.value)} placeholder="Buscar animal" />{animalError && <Alert variant="destructive"><AlertDescription>{animalError}</AlertDescription></Alert>}<div className="max-h-72 space-y-1 overflow-y-auto">{animalLoading ? <Skeleton className="h-32" /> : animals.length === 0 ? <p className="py-6 text-center text-[var(--muted)]">Nenhum animal disponível encontrado.</p> : animals.map((animal) => <Button key={animal.id} variant="ghost" className="h-auto w-full justify-start py-3 text-left" onClick={() => { setChoose(false); setAction({ action: "agendar", animal }); }}>{animal.nome} <span className="font-[family-name:var(--mono)] text-xs text-[var(--muted)]">{animal.numeroRegistro}</span></Button>)}</div></DialogContent></Dialog>
    <ActionDialog state={action} onClose={() => setAction(null)} onSuccess={() => { if (action?.action === "agendar") setStatus("agendada"); if (action?.action !== "agendar" && data?.itens.length === 1 && page > 1) setPage(page - 1); setAction(null); refresh(); }} />
  </div>;
}

function ActionDialog({ state, onClose, onSuccess }: { state: ActionState | null; onClose: () => void; onSuccess: () => void }) {
  const [planned, setPlanned] = useState("");
  const [effective, setEffective] = useState("");
  const [withTime, setWithTime] = useState(false);
  const [observation, setObservation] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setPlanned(localDateTime(state?.action === "reagendar" ? state.item?.dataHoraPlanejada ?? null : null)); setEffective(localDateTime(new Date().toISOString()).slice(0, 10)); setWithTime(false); setObservation(state?.item?.observacao ?? ""); setReason(""); setError(null); }, [state]);
  if (!state) return null;
  const animalId = state.animal?.id ?? state.item?.animalId;
  const title = state.action === "agendar" ? "Agendar castração" : state.action === "reagendar" ? "Reagendar castração" : state.action === "concluir" ? "Concluir castração" : "Cancelar agendamento";
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!state || !animalId) return;
    setBusy(true); setError(null);
    try {
      if (state.action === "agendar" || state.action === "reagendar") {
        const date = new Date(planned);
        if (!planned || Number.isNaN(date.getTime()) || date <= new Date()) { setError("Informe uma data e hora futuras."); return; }
        const input = { dataHoraPlanejada: date.toISOString(), ...(observation.trim() ? { observacao: observation.trim() } : {}) };
        if (state.action === "agendar") await agendarCastracaoAnimal(animalId, input);
        else await reagendarCastracaoAnimal(animalId, state.item!.id, input);
      } else if (state.action === "concluir") {
        if (!effective) { setError("Informe a data do procedimento."); return; }
        await concluirCastracaoAnimal(animalId, state.item!.id, { dataEfetiva: withTime ? new Date(effective).toISOString() : effective, dataEfetivaTemHora: withTime, ...(observation.trim() ? { observacao: observation.trim() } : {}) });
      } else {
        if (!reason.trim()) { setError("Informe o motivo do cancelamento."); return; }
        await cancelarCastracaoAnimal(animalId, state.item!.id, { motivo: reason.trim() });
      }
      onSuccess();
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }
  return <Dialog open={!!state} onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{state.animal?.nome ?? state.item?.animal.nome} · {state.animal?.numeroRegistro ?? state.item?.animal.numeroRegistro}. {state.action === "agendar" && state.item ? "A tentativa cancelada permanecerá no histórico." : ""}</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submit}>
    {(state.action === "agendar" || state.action === "reagendar") && <><div className="space-y-1.5"><Label htmlFor="planned">Data e hora planejadas</Label><Input id="planned" type="datetime-local" required value={planned} onChange={(event) => setPlanned(event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="observation">Observação (opcional)</Label><Input id="observation" maxLength={1000} value={observation} onChange={(event) => setObservation(event.target.value)} /></div></>}
    {state.action === "concluir" && <><div className="space-y-1.5"><Label htmlFor="effective">Data efetiva</Label><Input id="effective" type={withTime ? "datetime-local" : "date"} required value={effective} onChange={(event) => setEffective(event.target.value)} /></div><div className="flex items-center gap-2"><Checkbox id="with-time" checked={withTime} onCheckedChange={(checked) => { setWithTime(checked === true); setEffective(checked === true ? `${effective.slice(0, 10)}T12:00` : effective.slice(0, 10)); }} /><Label htmlFor="with-time">Informar horário</Label></div><div className="space-y-1.5"><Label htmlFor="conclusion-observation">Observação (opcional)</Label><Input id="conclusion-observation" maxLength={1000} value={observation} onChange={(event) => setObservation(event.target.value)} /></div></>}
    {state.action === "cancelar" && <div className="space-y-1.5"><Label htmlFor="reason">Motivo do cancelamento</Label><Input id="reason" required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Descreva o motivo" /></div>}
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Voltar</Button><Button type="submit" disabled={busy} variant={state.action === "cancelar" ? "destructive" : "default"}>{busy ? "Salvando…" : state.action === "cancelar" ? "Confirmar cancelamento" : state.action === "concluir" ? "Confirmar conclusão" : state.action === "reagendar" ? "Salvar nova data" : "Agendar"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}
