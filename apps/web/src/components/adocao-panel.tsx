"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Loader2, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PhotoPicker } from "@/components/photo-picker";
import { SignaturePad } from "@/components/signature-pad";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ApiError, adicionarDocumentoTutor, adicionarFotoTutor, atualizarTutor, buscarTutorPorCpf, carregarMidiaTutor,
  carregarAssinaturaAdocao, concluirAdocao, criarTutor, liberarAnimalParaAdocao, registrarDevolucao,
  type Adocao, type Animal, type Baia, type CriarTutorInput, type DevolucaoAdocao, type Tutor,
} from "@/lib/api";

const emptyTutor: CriarTutorInput = {
  nome: "", cpf: "", telefone: "", email: "", tipoDocumento: "", numeroDocumento: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
};

const tutorFields = [
  ["nome", "Nome completo", 120], ["telefone", "Telefone", 30], ["email", "E-mail (opcional)", 254],
  ["tipoDocumento", "Tipo do documento", 40], ["numeroDocumento", "Número do documento", 40],
] as const;

const addressFields = [
  ["logradouro", "Logradouro", 160], ["numero", "Número", 20],
  ["complemento", "Complemento (opcional)", 100], ["bairro", "Bairro", 100],
  ["cidade", "Município", 100], ["uf", "UF", 2],
] as const;

type ViaCep = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

async function consultarCep(raw: string): Promise<Pick<CriarTutorInput, "logradouro" | "bairro" | "cidade" | "uf"> | null> {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) throw new Error("cep");
  const data = await response.json() as ViaCep;
  if (data.erro) return null;
  return {
    logradouro: data.logradouro ?? "",
    bairro: data.bairro ?? "",
    cidade: data.localidade ?? "",
    uf: data.uf ?? "",
  };
}

function message(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const returnLabels: Record<DevolucaoAdocao["situacaoRetorno"], string> = {
  saudavel: "Saudável",
  em_tratamento: "Em tratamento",
  em_quarentena_observacao: "Em quarentena/observação",
};

function tutorDraft(tutor: Tutor): CriarTutorInput {
  return {
    nome: tutor.nome, cpf: tutor.cpf, telefone: tutor.telefone, email: tutor.email ?? "",
    tipoDocumento: tutor.tipoDocumento, numeroDocumento: tutor.numeroDocumento,
    cep: tutor.cep, logradouro: tutor.logradouro, numero: tutor.numero,
    complemento: tutor.complemento ?? "", bairro: tutor.bairro, cidade: tutor.cidade, uf: tutor.uf,
  };
}

function TutorFotoPreview({ tutorId, fotoId, nome }: { tutorId: number; fotoId: number; nome: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    void carregarMidiaTutor({ url: `/tutores/${tutorId}/midia/foto/${fotoId}` }).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      if (active) setSrc(objectUrl);
      else URL.revokeObjectURL(objectUrl);
    }).catch(() => { if (active) setSrc(null); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [tutorId, fotoId]);

  return (
    <>
      <button type="button" disabled={!src} onClick={() => setOpen(true)} className="flex items-center gap-3 rounded-[8px] border border-dashed border-[#a9cbc7] bg-[var(--primary-50)] p-3.5 text-left disabled:opacity-70">
        {src ? <img src={src} alt="" className="size-16 shrink-0 rounded-md object-cover" /> : <span className="grid size-16 shrink-0 place-items-center rounded-md bg-white text-xs text-[var(--muted)]">…</span>}
        <span>
          <span className="block font-bold">Foto cadastrada</span>
          <span className="text-[13px] text-[var(--muted)]">Clique para ver em tela cheia.</span>
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} overlayClassName="z-[80] bg-black/80" className="z-[80] w-auto border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-[min(72rem,calc(100vw-2rem))]">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto de {nome}</DialogTitle>
            <DialogDescription>Imagem pessoal do tutor em tela cheia.</DialogDescription>
          </DialogHeader>
          {src ? <img src={src} alt={`Foto de ${nome}`} className="max-h-[calc(100vh-4rem)] max-w-full object-contain" /> : null}
          <DialogClose asChild>
            <Button type="button" variant="outline" className="absolute top-3 right-3 bg-white" aria-label="Fechar foto">
              <XIcon aria-hidden="true" /> Fechar
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TutorSummary({ tutor }: { tutor: Tutor }) {
  return (
    <div className="grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] p-4 text-sm sm:grid-cols-2">
      <p><span className="block text-xs text-[var(--muted)]">Tutor</span><strong>{tutor.nome}</strong></p>
      <p><span className="block text-xs text-[var(--muted)]">CPF · contato</span><strong className="font-[family-name:var(--mono)]">{tutor.cpf}</strong><br />{tutor.telefone}</p>
      <p><span className="block text-xs text-[var(--muted)]">Identificação</span>{tutor.tipoDocumento} · {tutor.numeroDocumento}</p>
      <p><span className="block text-xs text-[var(--muted)]">Endereço atual</span>{tutor.logradouro}, {tutor.numero}{tutor.complemento ? `, ${tutor.complemento}` : ""} · {tutor.bairro} · {tutor.cidade}/{tutor.uf} · {tutor.cep}</p>
    </div>
  );
}

function CurrentAdoption({ animal }: { animal: Animal }) {
  const adocao = animal.adocoes?.find((item) => !item.encerradaEm);
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!adocao) return;
    let active = true;
    let blobUrl: string | null = null;
    carregarAssinaturaAdocao(animal.id, adocao.id).then((blob) => {
      blobUrl = URL.createObjectURL(blob);
      if (active) setUrl(blobUrl);
      else URL.revokeObjectURL(blobUrl);
    }).catch((error: unknown) => { if (active) setErro(message(error, "Não foi possível carregar a assinatura.")); });
    return () => { active = false; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [animal.id, adocao?.id]);

  if (!adocao) return <Alert><AlertDescription>Animal adotado sem registro formal de adoção. Solicite regularização; nenhum tutor ou aceite foi presumido.</AlertDescription></Alert>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">Adoção registrada em {dateTime.format(new Date(adocao.adotadaEm))} por {adocao.adotadaPor?.nome ?? "usuário não disponível"}.</p>
      {adocao.tutor ? <TutorSummary tutor={adocao.tutor} /> : <Alert variant="destructive"><AlertDescription>Cadastro do tutor indisponível.</AlertDescription></Alert>}
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p className="flex items-center gap-2"><Check className="size-4 text-[var(--ok)]" aria-hidden="true" /> Ciência dos termos: {adocao.consentiuTratamento ? "confirmada" : "não registrada"}</p>
        <p className="flex items-center gap-2"><Check className="size-4 text-[var(--ok)]" aria-hidden="true" /> Concordância: {adocao.consentiuAcompanhamento ? "confirmada" : "não registrada"}</p>
      </div>
      {adocao.liberacao ? <p className="rounded-lg border border-[var(--line)] bg-[var(--warn-50)] p-3 text-sm">Liberação excepcional: {adocao.liberacao.justificativa} · {adocao.liberacao.autorizadaPor?.nome ?? "responsável não disponível"}</p> : null}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Assinatura da adoção</h3>
        {url ? <img src={url} alt="Assinatura desenhada pelo tutor" className="max-h-40 max-w-full rounded-md border border-[var(--line)] bg-white object-contain" /> : <p className="text-sm text-[var(--muted)]">{erro ?? "Carregando assinatura…"}</p>}
      </div>
    </div>
  );
}

function AdoptionHistory({ animal }: { animal: Animal }) {
  const cycles = [...(animal.adocoes ?? [])].sort((a, b) =>
    new Date(b.adotadaEm).getTime() - new Date(a.adotadaEm).getTime() || b.id - a.id,
  );
  if (cycles.length === 0) return null;

  return (
    <div className="space-y-3 border-t border-[var(--line)] pt-5">
      <h3 className="text-base font-semibold">Histórico de adoções e devoluções</h3>
      <ol className="space-y-3">
        {cycles.map((cycle: Adocao) => (
          <li key={cycle.id} className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><strong>Adoção · {cycle.tutor?.nome ?? "Tutor indisponível"}</strong><p className="text-[var(--muted)]">{dateTime.format(new Date(cycle.adotadaEm))} · {cycle.adotadaPor?.nome ?? "Responsável indisponível"}</p></div>
              <span className={cycle.devolucao ? "rounded-full bg-[var(--bg)] px-2 py-1 text-xs font-semibold text-[var(--muted)]" : "rounded-full bg-[var(--ok-50)] px-2 py-1 text-xs font-semibold text-[var(--ok)]"}>{cycle.devolucao ? "Encerrada" : "Ativa"}</span>
            </div>
            {cycle.devolucao ? (
              <div className="mt-3 border-t border-[var(--line)] pt-3">
                <p><strong>Devolução</strong> · {dateTime.format(new Date(cycle.devolucao.recebidaEm))} · {cycle.devolucao.recebidaPor?.nome ?? "Responsável indisponível"}</p>
                <p className="mt-1">Motivo: {cycle.devolucao.motivo}</p>
                <p className="mt-1 text-[var(--muted)]">Retorno: {returnLabels[cycle.devolucao.situacaoRetorno]} · {cycle.devolucao.baia ? `Baia ${cycle.devolucao.baia.codigo}` : "Sem baia"}</p>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReturnForm({ animal, baias, onChanged }: { animal: Animal; baias: Baia[]; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [situacaoRetorno, setSituacaoRetorno] = useState<DevolucaoAdocao["situacaoRetorno"] | "">("");
  const [baiaId, setBaiaId] = useState("none");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completed, setCompleted] = useState(false);
  const eligibleBaias = baias.filter((baia) => baia.estado === "ativa" && baia.vagasDisponiveis > 0 && (!baia.exclusivaIsolamento || animal.emIsolamento));

  function review(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    if (motivo.trim().length < 3) { setErro("Descreva o motivo da devolução com pelo menos 3 caracteres."); return; }
    if (!situacaoRetorno) { setErro("Selecione a situação do animal no retorno."); return; }
    setConfirmOpen(true);
  }

  async function confirm() {
    setConfirmOpen(false);
    if (!situacaoRetorno || motivo.trim().length < 3) return;
    setBusy(true);
    setErro(null);
    try {
      await registrarDevolucao(animal.id, { motivo: motivo.trim(), situacaoRetorno, baiaId: baiaId === "none" ? null : Number(baiaId) });
      setCompleted(true);
      try { await onChanged(); }
      catch { setErro("Devolução registrada. Atualize a ficha para conferir o novo estado."); }
    } catch (error) {
      setErro(message(error, "Não foi possível registrar a devolução. Confira o ciclo ativo antes de tentar novamente."));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <Button type="button" variant="outline" onClick={() => setOpen(true)} disabled={busy || completed}>Registrar devolução</Button>
      {completed && erro ? <Alert><AlertDescription>{erro}</AlertDescription></Alert> : null}
      <Dialog open={open && !completed} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
        <DialogContent className="max-h-[min(90vh,48rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Registrar devolução</DialogTitle>
            <DialogDescription>A devolução encerra a guarda atual e reabre a ficha para operação. O registro da adoção e a assinatura permanecem no histórico.</DialogDescription>
          </DialogHeader>
          <form onSubmit={review} className="space-y-4">
            {erro ? <Alert variant="destructive"><AlertDescription>{erro}</AlertDescription></Alert> : null}
            <div className="space-y-1.5"><Label htmlFor="devolucao-motivo">Motivo da devolução</Label><Textarea id="devolucao-motivo" value={motivo} onChange={(event) => setMotivo(event.target.value)} maxLength={2000} required disabled={busy} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="devolucao-situacao">Situação no retorno</Label><Select value={situacaoRetorno} onValueChange={(value) => setSituacaoRetorno(value as DevolucaoAdocao["situacaoRetorno"])} disabled={busy}><SelectTrigger id="devolucao-situacao" className="min-h-11"><SelectValue placeholder="Selecione a situação" /></SelectTrigger><SelectContent>{(Object.entries(returnLabels) as [DevolucaoAdocao["situacaoRetorno"], string][]).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label htmlFor="devolucao-baia">Baia de retorno</Label><Select value={baiaId} onValueChange={setBaiaId} disabled={busy}><SelectTrigger id="devolucao-baia" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem baia</SelectItem>{eligibleBaias.map((baia) => <SelectItem key={baia.id} value={String(baia.id)}>Baia {baia.codigo} · {baia.vagasDisponiveis} {baia.vagasDisponiveis === 1 ? "vaga" : "vagas"}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {baiaId === "none" ? <Alert><AlertDescription>O animal voltará sem baia. Registre a alocação na ficha assim que houver uma vaga adequada.</AlertDescription></Alert> : null}
            <div className="flex justify-end"><Button type="submit" disabled={busy || !situacaoRetorno || motivo.trim().length < 3}>{busy ? <Loader2 className="animate-spin" /> : null} Revisar devolução</Button></div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={confirmOpen} title={`Confirmar devolução de ${animal.nome}`} description={`O ciclo com ${animal.adocoes?.find((cycle) => !cycle.devolucao)?.tutor?.nome ?? "o tutor atual"} será encerrado. Situação de retorno: ${situacaoRetorno ? returnLabels[situacaoRetorno] : "não selecionada"}. ${baiaId === "none" ? "O animal ficará sem baia." : "A baia escolhida será ocupada."}`} confirmLabel="Confirmar devolução" confirmVariant="default" onOpenChange={setConfirmOpen} onConfirm={() => void confirm()} />
    </div>
  );
}

export function AdocaoPanel({ animal, baias, podeLiberar, onChanged }: { animal: Animal; baias: Baia[]; podeLiberar: boolean; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [cpf, setCpf] = useState("");
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [draft, setDraft] = useState<CriarTutorInput>(emptyTutor);
  const [cepBusy, setCepBusy] = useState(false);
  const [cepErro, setCepErro] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [liberada, setLiberada] = useState(false);
  const [ciencia, setCiencia] = useState(false);
  const [concordancia, setConcordancia] = useState(false);
  const [assinatura, setAssinatura] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [step, setStep] = useState(0);

  const exceptional = animal.situacao === "em_tratamento" || animal.situacao === "em_quarentena_observacao";
  const eligible = animal.situacao === "saudavel" || exceptional;
  const steps = exceptional ? ["Tutor", "Liberação", "Assinatura"] as const : ["Tutor", "Assinatura"] as const;
  const tutorPronto = Boolean(tutor) && !editing;
  const liberacaoPronta = !exceptional || liberada;
  const signatureChanged = useCallback((file: File | null) => setAssinatura(file), []);

  async function findTutor(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setNotice(null);
    setBusy(true);
    setCepErro(null);
    try {
      const found = await buscarTutorPorCpf(cpf.replace(/\D/g, ""));
      setTutor(found);
      setDraft(tutorDraft(found));
      setEditing(false);
      setSearched(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setTutor(null);
        setDraft({ ...emptyTutor, cpf: cpf.replace(/\D/g, "") });
        setEditing(true);
        setSearched(true);
      } else setErro(message(error, "Não foi possível buscar o tutor."));
    } finally { setBusy(false); }
  }

  async function preencherCep(raw: string) {
    const digits = raw.replace(/\D/g, "");
    setDraft((current) => ({ ...current, cep: raw }));
    setCepErro(null);
    if (digits.length !== 8) return;
    setCepBusy(true);
    try {
      const endereco = await consultarCep(digits);
      if (!endereco) {
        setCepErro("CEP não encontrado. Preencha o endereço manualmente.");
        return;
      }
      setDraft((current) => ({
        ...current,
        cep: digits,
        logradouro: endereco.logradouro || current.logradouro,
        bairro: endereco.bairro || current.bairro,
        cidade: endereco.cidade || current.cidade,
        uf: endereco.uf || current.uf,
      }));
    } catch {
      setCepErro("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
    } finally {
      setCepBusy(false);
    }
  }

  async function saveTutor(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setBusy(true);
    try {
      const payload = { ...draft, cpf: draft.cpf.replace(/\D/g, ""), uf: draft.uf.trim().toUpperCase() };
      const saved = tutor ? await atualizarTutor(tutor.id, payload) : await criarTutor(payload);
      setTutor(saved);
      setDraft(tutorDraft(saved));
      setCpf(saved.cpf);
      setEditing(false);
      setNotice("Cadastro do tutor salvo. Confira os dados antes da adoção.");
    } catch (error) { setErro(message(error, "Não foi possível salvar o tutor.")); }
    finally { setBusy(false); }
  }

  async function upload(kind: "foto" | "documento", file: File | undefined) {
    if (!file || !tutor) return;
    setErro(null);
    setBusy(true);
    try {
      if (kind === "foto") await adicionarFotoTutor(tutor.id, file);
      else await adicionarDocumentoTutor(tutor.id, file);
      const found = await buscarTutorPorCpf(tutor.cpf);
      setTutor(found);
      setNotice(kind === "foto" ? "Foto do tutor enviada." : "Documento enviado.");
    } catch (error) { setErro(message(error, "Não foi possível enviar a imagem.")); }
    finally { setBusy(false); }
  }

  async function release() {
    if (justificativa.trim().length < 3) { setErro("Descreva a justificativa clínica com pelo menos 3 caracteres."); return; }
    setErro(null);
    setBusy(true);
    try {
      await liberarAnimalParaAdocao(animal.id, justificativa.trim());
      setLiberada(true);
      setNotice("Liberação excepcional registrada para esta adoção.");
      await onChanged();
    } catch (error) { setErro(message(error, "Não foi possível registrar a liberação.")); }
    finally { setBusy(false); }
  }

  function review(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    if (!tutor) { setErro("Localize ou cadastre um tutor antes de continuar."); return; }
    if (!ciencia || !concordancia) { setErro("Confirme separadamente a ciência e a concordância do tutor."); return; }
    if (!assinatura) { setErro("Peça ao tutor para desenhar a assinatura."); return; }
    setConfirmOpen(true);
  }

  async function confirm() {
    setConfirmOpen(false);
    if (!tutor || !assinatura) return;
    setErro(null);
    setBusy(true);
    try {
      await concluirAdocao(animal.id, { tutorId: tutor.id, consentiuTratamento: ciencia, consentiuAcompanhamento: concordancia, assinatura });
      setOpen(false);
      setStep(0);
      setLiberada(false);
      setJustificativa("");
      setCiencia(false);
      setConcordancia(false);
      setAssinatura(null);
      setTutor(null);
      setCpf("");
      setSearched(false);
      setNotice("Adoção concluída. A baia foi liberada.");
      try { await onChanged(); }
      catch { setNotice("Adoção concluída. Atualize a ficha para conferir o novo estado."); }
    } catch (error) { setErro(message(error, "Não foi possível concluir a adoção. Confira o estado da ficha antes de tentar novamente.")); }
    finally { setBusy(false); }
  }

  if (animal.situacao === "adotado") return <div className="space-y-5"><CurrentAdoption animal={animal} />{animal.adocoes?.some((cycle) => !cycle.devolucao) ? <ReturnForm animal={animal} baias={baias} onChanged={onChanged} /> : null}<AdoptionHistory animal={animal} /></div>;
  if (!eligible) return <div className="space-y-4"><p className="text-sm text-[var(--muted)]">Adoção indisponível para a situação atual do animal.</p><AdoptionHistory animal={animal} /></div>;

  return (
    <div className="space-y-5">
      <Button type="button" onClick={() => setOpen(true)}>
        <PlusIcon aria-hidden="true" /> Registrar adoção
      </Button>
      {notice ? <Alert><AlertDescription>{notice}</AlertDescription></Alert> : null}
      <Dialog open={open} onOpenChange={(next) => { if (!busy) { setOpen(next); if (!next) setStep(0); } }}>
        <DialogContent className="max-h-[min(90vh,48rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar adoção</DialogTitle>
            <DialogDescription>Etapa {step + 1} de {steps.length}: {steps[step]}.</DialogDescription>
          </DialogHeader>
          <ol className="flex gap-2">
            {steps.map((label, index) => (
              <li key={label} aria-current={index === step ? "step" : undefined} className={index === step ? "flex-1 rounded-md bg-primary px-2 py-1.5 text-center text-xs font-semibold text-primary-foreground" : index < step ? "flex-1 rounded-md bg-[var(--ok-50)] px-2 py-1.5 text-center text-xs font-semibold text-[var(--ok)]" : "flex-1 rounded-md bg-[var(--bg)] px-2 py-1.5 text-center text-xs font-semibold text-[var(--muted)]"}>
                {index + 1}. {label}
              </li>
            ))}
          </ol>
          <div className="space-y-6">
          {erro ? <Alert variant="destructive"><AlertDescription>{erro}</AlertDescription></Alert> : null}
          {step === 0 ? <div className="space-y-3">
            <h3 className="text-base font-semibold">Tutor</h3>
            <form onSubmit={(event) => void findTutor(event)} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1 space-y-1.5"><Label htmlFor="adocao-cpf">Buscar por CPF</Label><Input id="adocao-cpf" inputMode="numeric" value={cpf} onChange={(event) => { setCpf(event.target.value); setTutor(null); setSearched(false); setEditing(false); }} maxLength={14} required disabled={busy} /></div>
              <Button type="submit" variant="outline" disabled={busy || cpf.replace(/\D/g, "").length !== 11}>{busy ? <Loader2 className="animate-spin" /> : <SearchIcon />} Buscar tutor</Button>
            </form>
            {searched && !tutor ? <p className="text-sm text-[var(--muted)]">CPF não cadastrado. Preencha os dados para criar o tutor.</p> : null}
            {tutor && !editing ? <><TutorSummary tutor={tutor} /><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(true)}>Corrigir cadastro</Button></> : null}
            {editing ? (
              <form onSubmit={(event) => void saveTutor(event)} className="space-y-4 rounded-lg border border-[var(--line)] p-4">
                <p className="text-sm font-semibold">{tutor ? "Corrigir dados do tutor" : "Cadastrar tutor"}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label htmlFor="tutor-cpf">CPF</Label><Input id="tutor-cpf" value={draft.cpf} readOnly className="font-[family-name:var(--mono)]" /></div>
                  {tutorFields.map(([key, label, max]) => <div key={key} className="space-y-1.5"><Label htmlFor={`tutor-${key}`}>{label}</Label><Input id={`tutor-${key}`} type={key === "email" ? "email" : "text"} value={draft[key] ?? ""} maxLength={max} required={key !== "email"} disabled={busy} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} /></div>)}
                  <div className="space-y-1.5">
                    <Label htmlFor="tutor-cep">CEP</Label>
                    <Input id="tutor-cep" inputMode="numeric" value={draft.cep} maxLength={9} required disabled={busy || cepBusy} onChange={(event) => void preencherCep(event.target.value)} />
                    {cepBusy ? <p className="text-xs text-[var(--muted)]">Consultando CEP…</p> : null}
                    {cepErro ? <p className="text-xs text-[var(--destructive)]">{cepErro}</p> : null}
                  </div>
                  {addressFields.map(([key, label, max]) => <div key={key} className="space-y-1.5"><Label htmlFor={`tutor-${key}`}>{label}</Label><Input id={`tutor-${key}`} value={draft[key] ?? ""} maxLength={max} required={key !== "complemento"} disabled={busy} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} /></div>)}
                </div>
                <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={busy}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : null} Salvar tutor</Button></div>
              </form>
            ) : null}
            {tutor && !editing ? <div className="grid gap-3 sm:grid-cols-2">{tutor.foto ? <TutorFotoPreview tutorId={tutor.id} fotoId={tutor.foto.id} nome={tutor.nome} /> : <PhotoPicker remaining={1} disabled={busy} label="Foto opcional" hint="JPEG, PNG ou WebP." onPicked={(files) => { const file = files[0]; if (file) void upload("foto", file); }} />}<PhotoPicker remaining={Math.max(0, 3 - (tutor.documentos?.length ?? 0))} disabled={busy} label={`Documentação (${tutor.documentos?.length ?? 0}/3)`} hint="Até três imagens." onPicked={(files) => { for (const file of files) void upload("documento", file); }} /></div> : null}
          </div> : null}
          {step === 1 && exceptional ? <div className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--warn-50)] p-4"><h3 className="text-base font-semibold">Liberação clínica excepcional</h3><p className="text-sm">Animal em {animal.situacao === "em_tratamento" ? "tratamento" : "quarentena/observação"}. Um veterinário ou a Coordenação precisa justificar a liberação antes da adoção.</p>{liberada ? <p className="text-sm font-semibold text-[var(--ok)]">Liberação registrada nesta sessão.</p> : null}{podeLiberar ? <div className="flex flex-wrap items-end gap-3"><div className="min-w-[220px] flex-1 space-y-1.5"><Label htmlFor="adocao-justificativa">Justificativa</Label><Input id="adocao-justificativa" value={justificativa} maxLength={500} disabled={busy} onChange={(event) => setJustificativa(event.target.value)} /></div><Button type="button" variant="outline" disabled={busy || liberada} onClick={() => void release()}>Registrar liberação</Button></div> : <p className="text-sm">Solicite a liberação à equipe clínica. Depois, atualize a ficha antes de continuar.</p>}</div> : null}
          {step === steps.length - 1 ? <form id="adocao-assinatura" onSubmit={review} className="space-y-4">
            <h3 className="text-base font-semibold">Ciência e assinatura</h3>
            <p className="text-sm text-[var(--muted)]">O funcionário comunica os termos da CCZ ao tutor fora do sistema. Registre as duas confirmações e peça a assinatura desenhada.</p>
            <div className="space-y-2">{([["ciencia", "O tutor recebeu ciência dos termos da CCZ", ciencia, setCiencia], ["concordancia", "O tutor concorda com os termos de adoção e responsabilidade", concordancia, setConcordancia]] as const).map(([id, label, checked, setter]) => <div key={id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] p-3"><Label htmlFor={`adocao-${id}`} className="leading-snug">{label}</Label><Switch id={`adocao-${id}`} checked={checked} disabled={busy} onCheckedChange={setter} /></div>)}</div>
            <div className="space-y-2"><Label>Assinatura do tutor</Label><SignaturePad onChange={signatureChanged} disabled={busy} /></div>
          </form> : null}
          <div className="flex flex-wrap justify-between gap-2">
            <Button type="button" variant="outline" disabled={busy || step === 0} onClick={() => { setErro(null); setStep((current) => current - 1); }}>Voltar</Button>
            {step < steps.length - 1 ? <Button type="button" disabled={busy || (step === 0 && !tutorPronto) || (step === 1 && exceptional && !liberacaoPronta)} onClick={() => { setErro(null); setStep((current) => current + 1); }}>Continuar</Button> : <Button type="submit" form="adocao-assinatura" disabled={busy || !tutorPronto}>Revisar e concluir</Button>}
          </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={confirmOpen} title={`Confirmar adoção de ${animal.nome}`} description={`Tutor: ${tutor?.nome ?? "não selecionado"}. Depois de confirmada, a adoção não pode ser revogada ou refeita. Para o animal voltar ao CCZ e poder ser adotado novamente, registre uma devolução.`} confirmLabel="Confirmar adoção definitiva" confirmVariant="default" onOpenChange={setConfirmOpen} onConfirm={() => void confirm()} />
      <AdoptionHistory animal={animal} />
    </div>
  );
}
