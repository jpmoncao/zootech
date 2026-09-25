"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Cat,
  ClipboardCheckIcon,
  ClipboardList,
  ClipboardPlusIcon,
  Dog,
  Edit3,
  Edit3Icon,
  FileTextIcon,
  ImagePlus,
  ImagePlusIcon,
  InfoIcon,
  Loader2,
  LucideIcon,
  MapPin,
  MapPinIcon,
  MapPinPenIcon,
  MessageCircleIcon,
  PencilIcon,
  Plus,
  PlusCircleIcon,
  RefreshCw,
  RewindIcon,
  RotateCcw,
  Save,
  Scale,
  ScaleIcon,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { Combobox } from "@/components/combobox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ControlSelect } from "@/components/control-select";
import { AnimalPhoto } from "@/components/animal-photo";
import { PhotoPicker } from "@/components/photo-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Shell } from "@/components/shell";
import { canManageAnimais } from "@/lib/access";
import { opcoesRaca, racaFormValue } from "@/lib/raca-options";
import {
  adicionarFotoAnimal,
  adicionarObservacaoAnimal,
  adicionarPesagemAnimal,
  alocarAnimal,
  ApiError,
  atualizarAnimal,
  criarRacaAnimal,
  getCurrentUser,
  listarBaias,
  listarRacasAnimais,
  obterAnimal,
  registrarEventoAnimal,
  removerFotoAnimal,
  revogarSituacaoAnimal,
  type Animal,
  type AtualizarAnimalInput,
  type Baia,
  type EventoAnimal,
  type EspecieAnimal,
  type PorteAnimal,
  type RacaAnimal,
  type SexoAnimal,
  type SituacaoAnimal,
  type StatusCastracaoAnimal,
  type TipoEventoAnimal,
  type UnidadeIdadeAnimal,
} from "@/lib/api";

const MAX_FOTOS = 10;

const especieLabel: Record<EspecieAnimal, string> = {
  cao: "Cão",
  gato: "Gato",
};

const situacaoLabel: Record<SituacaoAnimal, string> = {
  em_tratamento: "Em tratamento",
  em_quarentena_observacao: "Quarentena/observação",
  saudavel: "Saudável",
  adotado: "Adotado",
  obito: "Óbito",
};

const sexoLabel: Record<SexoAnimal, string> = {
  macho: "Macho",
  femea: "Fêmea",
  nao_informado: "Não informado",
};

const porteLabel: Record<PorteAnimal, string> = {
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
  nao_informado: "Não informado",
};

const castradoLabel: Record<StatusCastracaoAnimal, string> = {
  sim: "Sim",
  nao: "Não",
  nao_informado: "Não informado",
};

const unidadeLabel: Record<UnidadeIdadeAnimal, string> = {
  dias: "Dia(s)",
  meses: "Mês(es)",
  anos: "Ano(s)",
};

const eventoLabel: Record<TipoEventoAnimal, string> = {
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
};

type FormFicha = {
  nome: string;
  numeroRegistro: string;
  especie: EspecieAnimal;
  racaId: string;
  novaRaca: string;
  sexo: SexoAnimal;
  porte: PorteAnimal;
  corPelagem: string;
  situacao: Exclude<SituacaoAnimal, "adotado">;
  emIsolamento: boolean;
  castrado: StatusCastracaoAnimal;
  pesoAtualKg: string;
  dataAcolhimento: string;
  dataNascimento: string;
  idadeEstimadaQuantidade: string;
  idadeEstimadaUnidade: UnidadeIdadeAnimal;
  idadeAproximada: boolean;
  nasceuNoCcz: boolean;
  acolhidoPor: string;
};

export default function Page() {
  return (
    <Shell section="animais" title="Ficha do animal">
      <FichaAnimal />
    </Shell>
  );
}

function FichaAnimal() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = useMemo(() => idAnimal(params.id), [params.id]);
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [baias, setBaias] = useState<Baia[]>([]);
  const [loading, setLoading] = useState(id != null);
  const [erro, setErro] = useState<string | null>(id == null ? "Identificador de animal inválido." : null);
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const perfil = getCurrentUser()?.perfilAcesso ?? null;
  const podeEditar = Boolean(perfil && canManageAnimais(perfil));
  const podeRevogar = perfil === "coordenacao";

  useEffect(() => {
    if (id == null) return;
    let cancelled = false;
    setLoading(true);
    setErro(null);
    Promise.all([obterAnimal(id), listarBaias()])
      .then(([animalData, baiasData]) => {
        if (!cancelled) {
          setAnimal(animalData);
          setBaias(baiasData);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAnimal(null);
        setErro(error instanceof ApiError ? error.message : "Não foi possível carregar a ficha do animal.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function refresh() {
    if (id == null) return;
    setLoading(true);
    setErro(null);
    try {
      const [animalData, baiasData] = await Promise.all([obterAnimal(id), listarBaias()]);
      setAnimal(animalData);
      setBaias(baiasData);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível carregar a ficha do animal.");
      setAnimal(null);
    } finally {
      setLoading(false);
    }
  }

  async function reloadAfterChange() {
    if (id == null) return;
    const [animalData, baiasData] = await Promise.all([obterAnimal(id), listarBaias()]);
    setAnimal(animalData);
    setBaias(baiasData);
    setDirty(false);
  }

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    function onClick(event: MouseEvent) {
      const target = (event.target as HTMLElement | null)?.closest("a[href]");
      if (!(target instanceof HTMLAnchorElement)) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const next = new URL(target.href, window.location.href);
      if (next.pathname === window.location.pathname && next.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${next.pathname}${next.search}${next.hash}`);
      setLeaveOpen(true);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  function confirmarSaida() {
    const href = pendingHref;
    setLeaveOpen(false);
    setPendingHref(null);
    setDirty(false);
    if (href) router.push(href);
  }

  return (
    <div className="[display:flex] [flex-direction:column] [gap:20px] [width:100%]">
      <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:16px] max-[760px]:[flex-direction:column]">
        <div>
          <Button asChild variant="link" className="[width:fit-content] [min-height:34px] [padding-inline:0]">
            <Link href="/painel/animais">
              <ArrowLeft aria-hidden="true" />
              Voltar para animais
            </Link>
          </Button>
          <h1>{animal?.nome ?? "Ficha do animal"}</h1>
          <p className="[color:var(--muted)] [max-width:62ch]">Identificação, pendências, localização e histórico do animal.</p>
        </div>
        <Button variant="outline" type="button" onClick={() => void refresh()} disabled={id == null || loading}>
          <RefreshCw aria-hidden="true" />
          Atualizar
        </Button>
      </div>

      {erro ? (
        <Alert variant="destructive">
          <AlertDescription className="text-inherit">{erro}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? <FichaSkeleton /> : null}

      {!loading && animal ? (
        <Ficha
          animal={animal}
          baias={baias}
          podeEditar={podeEditar && !animal.somenteLeitura}
          podeRevogar={podeRevogar}
          onChanged={reloadAfterChange}
          onDirtyChange={setDirty}
        />
      ) : null}
      <ConfirmDialog
        open={leaveOpen}
        title="Descartar alterações?"
        description="Há um rascunho de alterações na ficha. Se sair agora, essas alterações serão perdidas."
        confirmLabel="Descartar e sair"
        confirmVariant="default"
        onOpenChange={setLeaveOpen}
        onConfirm={confirmarSaida}
      />
    </div>
  );
}

function Ficha({
  animal,
  baias,
  podeEditar,
  podeRevogar,
  onChanged,
  onDirtyChange,
}: {
  animal: Animal;
  baias: Baia[];
  podeEditar: boolean;
  podeRevogar: boolean;
  onChanged: () => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const foto = animal.fotos.find((item) => item.identificacao) ?? animal.fotos[0];
  const Icon = animal.especie === "cao" ? Dog : Cat;
  const pesoMaisRecente = animal.pesagens?.[0];

  return (
    <div className="[display:grid] [grid-template-columns:minmax(0,_1fr)_minmax(300px,_0.42fr)] [align-items:start] [gap:16px] max-[760px]:[grid-template-columns:1fr]">
      <section className="@container [background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto]" aria-label="Resumo do animal">
        <div className="[display:grid] [grid-template-columns:132px_minmax(0,_1fr)] [align-items:center] [gap:16px] [&_h2]:[margin:10px_0_2px] [&_h2]:[font-size:24px] max-[760px]:[grid-template-columns:1fr]">
          <div className="[&_img]:[width:100%] [&_img]:[height:100%] [&_img]:[object-fit:cover] [width:132px] [aspect-ratio:1_/_1] [border-radius:8px] [background:var(--primary-50)] [color:var(--primary)] [display:grid] [place-items:center] [overflow:hidden] [&_svg]:[width:48px] [&_svg]:[height:48px] max-[760px]:[width:min(220px,_100%)]">
            {foto ? <AnimalPhoto foto={foto} alt={`Foto de ${animal.nome}`} /> : <Icon aria-hidden="true" />}
          </div>
          <div className="[min-width:0] [&_p]:[margin:0] [&_p]:[color:var(--muted)]">
            <div className="[display:flex] [align-items:center] [gap:8px] [flex-wrap:wrap]">
              <span className="[min-height:28px] [border-radius:999px] [padding:6px_10px] [display:inline-flex] [align-items:center] [justify-content:center] [width:fit-content] [font:700_12px/1_var(--body)] [white-space:nowrap] data-[estado=ativa]:[background:var(--ok-50)] data-[estado=ativa]:[color:var(--ok)] data-[estado=em\_higienizacao]:[background:var(--info-50)] data-[estado=em\_higienizacao]:[color:var(--info)] data-[estado=interditada]:[background:var(--crit-50)] data-[estado=interditada]:[color:var(--crit)] data-[estado=inativa]:[background:var(--bg)] data-[estado=inativa]:[color:var(--muted)] data-[estado=inativa]:[border:1px_solid_var(--line)] data-[estado=em\_tratamento]:[background:var(--info-50)] data-[estado=em\_tratamento]:[color:var(--info)] data-[estado=em\_quarentena\_observacao]:[background:var(--info-50)] data-[estado=em\_quarentena\_observacao]:[color:var(--info)] data-[estado=saudavel]:[background:var(--ok-50)] data-[estado=saudavel]:[color:var(--ok)] data-[estado=adotado]:[background:var(--primary-50)] data-[estado=adotado]:[color:var(--primary-700)] data-[estado=obito]:[background:var(--bg)] data-[estado=obito]:[color:var(--muted)] data-[estado=obito]:[border:1px_solid_var(--line)] max-[760px]:[grid-column:2] max-[760px]:[align-items:flex-start] max-[760px]:[text-align:left]" data-estado={animal.situacao}>
                {situacaoLabel[animal.situacao]}
              </span>
              {animal.emIsolamento ? <span className="[min-height:28px] [border-radius:999px] [padding:6px_10px] [display:inline-flex] [align-items:center] [justify-content:center] [width:fit-content] [font:700_12px/1_var(--body)] [white-space:nowrap] data-[estado=ativa]:[background:var(--ok-50)] data-[estado=ativa]:[color:var(--ok)] data-[estado=em\_higienizacao]:[background:var(--info-50)] data-[estado=em\_higienizacao]:[color:var(--info)] data-[estado=interditada]:[background:var(--crit-50)] data-[estado=interditada]:[color:var(--crit)] data-[estado=inativa]:[background:var(--bg)] data-[estado=inativa]:[color:var(--muted)] data-[estado=inativa]:[border:1px_solid_var(--line)] data-[estado=em\_tratamento]:[background:var(--info-50)] data-[estado=em\_tratamento]:[color:var(--info)] data-[estado=em\_quarentena\_observacao]:[background:var(--info-50)] data-[estado=em\_quarentena\_observacao]:[color:var(--info)] data-[estado=saudavel]:[background:var(--ok-50)] data-[estado=saudavel]:[color:var(--ok)] data-[estado=adotado]:[background:var(--primary-50)] data-[estado=adotado]:[color:var(--primary-700)] data-[estado=obito]:[background:var(--bg)] data-[estado=obito]:[color:var(--muted)] data-[estado=obito]:[border:1px_solid_var(--line)] max-[760px]:[grid-column:2] max-[760px]:[align-items:flex-start] max-[760px]:[text-align:left]" data-estado="em_quarentena_observacao">Isolamento</span> : null}
            </div>
            <h2>{animal.nome}</h2>
            <p className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]">{animal.numeroRegistro}</p>
            <p>
              {animal.raca?.nome ?? "Raça não informada"} · {especieLabel[animal.especie]} · {sexoLabel[animal.sexo]}
            </p>
          </div>
        </div>
        {animal.somenteLeitura ? (
          <Alert>
            <AlertDescription>
              Animal em estado terminal. A ficha está bloqueada para mutações e permanece disponível para consulta.
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="mt-[18px] grid grid-cols-1 gap-2.5 @min-[22rem]:grid-cols-2 @min-[40rem]:grid-cols-4" aria-label="Indicadores da ficha">
          <QuickFact icon={<MapPin aria-hidden="true" />} label="Baia" value={animal.baia?.codigo ?? "Sem baia"} tone={animal.baia ? "ok" : "warn"} />
          <QuickFact icon={<Scale aria-hidden="true" />} label="Peso" value={animal.pesoAtualKg ? `${animal.pesoAtualKg} kg` : "Não informado"} tone={animal.pesoAtualKg ? "info" : "muted"} />
          <QuickFact icon={<AlertTriangle aria-hidden="true" />} label="Pendências" value={String(animal.alertas.length)} tone={animal.alertas.length > 0 ? "warn" : "ok"} />
          <QuickFact icon={<CalendarDays aria-hidden="true" />} label="Acolhimento" value={animal.dataAcolhimento ? formatDateOnly(animal.dataAcolhimento) : "Não informado"} tone="muted" />
        </div>
      </section>

      <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)] [grid-column:2] [grid-row:span_2] [position:sticky] [top:16px] [&_h2]:[margin-top:0] max-[760px]:[grid-column:auto] max-[760px]:[position:static] max-[760px]:[grid-row:auto]" aria-label="Alertas e pendências">
        <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] [&_h2]:[margin:0] [&_h2]:[font-size:17px] [&>svg]:[width:22px] [&>svg]:[height:22px] [&>svg]:[color:var(--primary)] [&_svg]:[color:var(--primary)]">
          <div>
            <h2>Alertas e pendências</h2>
            <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Campos que afetam triagem, localização e acompanhamento.</p>
          </div>
          <AlertCircle aria-hidden="true" />
        </div>
        {animal.alertas.length > 0 ? (
          <ul className="[margin:0] [padding:0] [list-style:none] [display:flex] [flex-direction:column] [gap:8px] [&_li]:[border:1px_solid_#f1d5a6] [&_li]:[border-radius:8px] [&_li]:[background:var(--warn-50)] [&_li]:[color:#6b3f00] [&_li]:[padding:10px_12px] [&_li]:[font-weight:600] [&_li]:[display:flex] [&_li]:[align-items:center] [&_li]:[justify-content:space-between] [&_li]:[gap:10px] max-[760px]:[&_li]:[align-items:flex-start] max-[760px]:[&_li]:[flex-direction:column] max-[760px]:[&>li a]:[width:100%] max-[760px]:[&>li button]:[width:100%]">
            {animal.alertas.map((alerta) => (
              <li key={`${alerta.tipo}-${alerta.mensagem}`}>
                <span>{alerta.mensagem}</span>
                <AlertAction tipo={alerta.tipo} disabled={!podeEditar} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="[border:1px_solid_#c8e3cf] [border-radius:8px] [background:var(--ok-50)] [color:var(--ok)] [padding:12px] [margin:0] [font-weight:700]">Nenhuma pendência registrada para esta ficha.</p>
        )}
      </section>

      <section className="@container [background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto]" id="dados-ficha" aria-label="Dados da ficha">
        <SectionHeader icon={<Edit3 aria-hidden="true" />} title="Dados da ficha" note={podeEditar ? "" : "Somente consulta."} />
        <AnimalEditForm animal={animal} disabled={!podeEditar} onChanged={onChanged} onDirtyChange={onDirtyChange} />
      </section>

      <section className="@container min-w-0 [background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto]" id="baia-ficha" aria-label="Baia e localização">
        <SectionHeader icon={<MapPin aria-hidden="true" />} title="Baia e localização" note="Alocação opcional" />
        <BaiaCard animal={animal} baias={baias} disabled={!podeEditar} onChanged={onChanged} />
      </section>

      <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto]" aria-label="Galeria">
        <SectionHeader icon={<ImagePlus aria-hidden="true" />} title="Galeria" note={`${animal.fotos.length}/${MAX_FOTOS} fotos`} />
        <Galeria animal={animal} disabled={!podeEditar} onChanged={onChanged} />
      </section>

      <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto]" aria-label="Peso e acompanhamento clínico">
        <SectionHeader icon={<Stethoscope aria-hidden="true" />} title="Peso e acompanhamento" note={pesoMaisRecente ? `Última pesagem: ${pesoMaisRecente.valorKg} kg` : "Sem pesagens registradas."} />
        <Acompanhamento animal={animal} disabled={!podeEditar} onChanged={onChanged} />
      </section>

      {animal.somenteLeitura && podeRevogar ? (
        <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto] [grid-column:1_/_-1] max-[760px]:[grid-column:auto]" aria-label="Revogação de estado terminal">
          <SectionHeader icon={<RotateCcw aria-hidden="true" />} title="Revogar estado terminal" note="Apenas Coordenação, com motivo obrigatório." />
          <RevogarTerminal animal={animal} onChanged={onChanged} />
        </section>
      ) : null}

      <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto] [grid-column:1_/_-1] max-[760px]:[grid-column:auto]" aria-label="Histórico do animal">
        <SectionHeader icon={<ClipboardList aria-hidden="true" />} title="Histórico" note={`${animal.eventos?.length ?? 0} evento(s) do animal`} />
        <Timeline eventos={animal.eventos ?? []} />
      </section>
    </div>
  );
}

function AlertAction({ tipo, disabled }: { tipo: string; disabled: boolean }) {
  const target = tipo === "sem_baia" ? "#baia-ficha" : "#dados-ficha";
  const label = tipo === "sem_baia" ? "Resolver na baia" : "Editar dados";
  return (
    <Button asChild variant="outline" disabled={disabled}>
      <a href={target}>{label}</a>
    </Button>
  );
}

function AnimalEditForm({
  animal,
  disabled,
  onChanged,
  onDirtyChange,
}: {
  animal: Animal;
  disabled: boolean;
  onChanged: () => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [form, setForm] = useState<FormFicha>(() => formFromAnimal(animal));
  const [racas, setRacas] = useState<RacaAnimal[]>([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const baseline = useMemo(() => formFromAnimal(animal), [animal]);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  useEffect(() => {
    setForm(formFromAnimal(animal));
  }, [animal]);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    let cancelled = false;
    listarRacasAnimais(form.especie)
      .then((items) => {
        if (!cancelled) setRacas(items);
      })
      .catch(() => {
        if (!cancelled) setRacas([]);
      });
    return () => {
      cancelled = true;
    };
  }, [form.especie]);

  function update<K extends keyof FormFicha>(key: K, value: FormFicha[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErro(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    if (!form.nome.trim()) {
      setErro("Informe o nome do animal.");
      return;
    }
    if (!form.numeroRegistro.trim()) {
      setErro("Informe o número de registro.");
      return;
    }
    if (form.pesoAtualKg && Number(form.pesoAtualKg) <= 0) {
      setErro("O peso deve ser maior que zero.");
      return;
    }
    if (form.racaId === "nova" && !form.novaRaca.trim()) {
      setErro("Informe o nome da nova raça.");
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      await atualizarAnimal(animal.id, payloadFicha(form, await resolverRacaFicha(form, racas)));
      await onChanged();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível atualizar a ficha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="animal-edit-form" className="[display:flex] [flex-direction:column] [gap:14px]" onSubmit={submit}>
      {dirty && !disabled ? (
        <div className="[position:sticky] [top:0] [z-index:5] [border:1px_solid_#f0d7a4] [border-radius:8px] [background:var(--warn-50)] [color:var(--warn)] [padding:10px_12px] [display:flex] [flex-wrap:wrap] [align-items:center] [justify-content:flex-end] [gap:8px] [&_span]:[margin-right:auto] [&_span]:[font-weight:700]" role="status">
          <span>Alterações não salvas</span>
          <Button type="button" variant="outline" disabled={saving} onClick={() => setForm(formFromAnimal(animal))}>
            Descartar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
            Salvar alterações
          </Button>
        </div>
      ) : null}
      {erro ? (
        <Alert variant="destructive">
          <AlertDescription className="text-inherit">{erro}</AlertDescription>
        </Alert>
      ) : null}
      <div className="[display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px] max-[760px]:[grid-template-columns:1fr]">
        <Field label="Nome" htmlFor="animal-edit-nome" required>
          <Input id="animal-edit-nome" value={form.nome} maxLength={120} disabled={disabled || saving} onChange={(event) => update("nome", event.target.value)} />
        </Field>
        <Field label="Número de registro" htmlFor="animal-edit-registro" required>
          <Input id="animal-edit-registro" className="[font-family:var(--mono)] [font-size:14px]" value={form.numeroRegistro} maxLength={60} disabled={disabled || saving} onChange={(event) => update("numeroRegistro", event.target.value)} />
        </Field>
        <Field label="Espécie" htmlFor="animal-edit-especie">
          <ControlSelect
            id="animal-edit-especie"
            value={form.especie}
            disabled={disabled || saving}
            onValueChange={(value) => {
              update("especie", value as EspecieAnimal);
              update("racaId", "");
              update("novaRaca", "");
            }}
            options={Object.entries(especieLabel).map(([value, label]) => ({ value, label }))}
          />
        </Field>
        <Field label="Raça" htmlFor="animal-edit-raca">
          <Combobox
            id="animal-edit-raca"
            value={form.racaId || "none"}
            disabled={disabled || saving}
            searchPlaceholder="Filtrar raça"
            placeholder="Não informada"
            onChange={(value) => update("racaId", value === "none" ? "" : value)}
            options={opcoesRaca(racas)}
          />
        </Field>
        {form.racaId === "nova" ? (
          <Field label="Nome da raça" htmlFor="animal-edit-nova-raca">
            <Input id="animal-edit-nova-raca" value={form.novaRaca} maxLength={80} disabled={disabled || saving} onChange={(event) => update("novaRaca", event.target.value)} />
          </Field>
        ) : null}
        <Field label="Sexo" htmlFor="animal-edit-sexo">
          <ControlSelect id="animal-edit-sexo" value={form.sexo} disabled={disabled || saving} onValueChange={(value) => update("sexo", value as SexoAnimal)} options={Object.entries(sexoLabel).map(([value, label]) => ({ value, label }))} />
        </Field>
        <Field label="Porte" htmlFor="animal-edit-porte">
          <ControlSelect id="animal-edit-porte" value={form.porte} disabled={disabled || saving} onValueChange={(value) => update("porte", value as PorteAnimal)} options={Object.entries(porteLabel).map(([value, label]) => ({ value, label }))} />
        </Field>
        <Field label="Castração" htmlFor="animal-edit-castracao">
          <ControlSelect id="animal-edit-castracao" value={form.castrado} disabled={disabled || saving} onValueChange={(value) => update("castrado", value as StatusCastracaoAnimal)} options={Object.entries(castradoLabel).map(([value, label]) => ({ value, label }))} />
        </Field>
        <Field label="Situação" htmlFor="animal-edit-situacao">
          <ControlSelect
            id="animal-edit-situacao"
            value={form.situacao}
            disabled={disabled || saving}
            onValueChange={(value) => update("situacao", value as FormFicha["situacao"])}
            options={(["em_tratamento", "em_quarentena_observacao", "saudavel", "obito"] as const).map((situacao) => ({ value: situacao, label: situacaoLabel[situacao] }))}
          />
        </Field>
        <Field label="Peso atual em kg" htmlFor="animal-edit-peso">
          <Input id="animal-edit-peso" type="number" min="0.001" step="0.001" inputMode="decimal" value={form.pesoAtualKg} disabled={disabled || saving} onChange={(event) => update("pesoAtualKg", event.target.value)} />
        </Field>
        <Field label="Cor/pelagem" htmlFor="animal-edit-pelagem">
          <Input id="animal-edit-pelagem" value={form.corPelagem} maxLength={80} disabled={disabled || saving} onChange={(event) => update("corPelagem", event.target.value)} />
        </Field>
        <Field label="Data de acolhimento" htmlFor="animal-edit-acolhimento">
          <Input id="animal-edit-acolhimento" type="date" value={form.dataAcolhimento} disabled={disabled || saving} onChange={(event) => update("dataAcolhimento", event.target.value)} />
        </Field>
        <Field label="Data de nascimento" htmlFor="animal-edit-nascimento">
          <Input id="animal-edit-nascimento" type="date" value={form.dataNascimento} disabled={disabled || saving} onChange={(event) => update("dataNascimento", event.target.value)} />
        </Field>
        <Field label="Idade estimada" htmlFor="animal-edit-idade-qtd">
          <div className="[display:grid] [grid-template-columns:minmax(0,_1fr)_minmax(130px,_0.7fr)] [gap:8px] max-[760px]:[grid-template-columns:1fr]">
            <Input id="animal-edit-idade-qtd" type="number" min="0" step="1" inputMode="numeric" value={form.idadeEstimadaQuantidade} disabled={disabled || saving} onChange={(event) => update("idadeEstimadaQuantidade", event.target.value)} />
            <ControlSelect value={form.idadeEstimadaUnidade} disabled={disabled || saving} onValueChange={(value) => update("idadeEstimadaUnidade", value as UnidadeIdadeAnimal)} options={Object.entries(unidadeLabel).map(([value, label]) => ({ value, label }))} />
          </div>
        </Field>
        <Field label="Acolhido por" htmlFor="animal-edit-acolhido">
          <Input id="animal-edit-acolhido" value={form.acolhidoPor} maxLength={120} disabled={disabled || saving} onChange={(event) => update("acolhidoPor", event.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-2 @min-[42rem]:grid-cols-3">
        <CheckLine id="animal-edit-isolamento" label="Em isolamento clínico" checked={form.emIsolamento} disabled={disabled || saving} onChange={(value) => update("emIsolamento", value)} />
        <CheckLine id="animal-edit-idade-aprox" label="Idade aproximada" checked={form.idadeAproximada} disabled={disabled || saving} onChange={(value) => update("idadeAproximada", value)} />
        <CheckLine id="animal-edit-nasceu" label="Nasceu no CCZ" checked={form.nasceuNoCcz} disabled={disabled || saving} onChange={(value) => update("nasceuNoCcz", value)} />
      </div>
      <div className="[display:flex] [justify-content:flex-end] [gap:10px] [flex-wrap:wrap] max-[760px]:[&>*]:[width:100%]">
        <Button type="submit" disabled={disabled || saving || !dirty}>
          {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
          Salvar ficha
        </Button>
      </div>
    </form>
  );
}

function BaiaCard({ animal, baias, disabled, onChanged }: { animal: Animal; baias: Baia[]; disabled: boolean; onChanged: () => Promise<void> }) {
  const [baiaId, setBaiaId] = useState(animal.baiaId ? String(animal.baiaId) : "");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setBaiaId(animal.baiaId ? String(animal.baiaId) : "");
    setObservacao("");
  }, [animal]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    setSaving(true);
    setErro(null);
    try {
      await alocarAnimal(animal.id, {
        baiaId: baiaId && baiaId !== "none" ? Number(baiaId) : null,
        observacao: observacao.trim() || undefined,
      });
      await onChanged();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível atualizar a baia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-1 items-start gap-3.5 @min-[42rem]:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.1fr)]">
        <div className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3.5 @min-[24rem]:grid-cols-[42px_minmax(0,1fr)_auto] [&_b]:text-base [&_b]:font-bold [&_b]:leading-tight">
          <span className="grid size-[42px] place-items-center rounded-lg bg-[var(--primary-50)] text-[var(--primary)]"><MapPin aria-hidden="true" /></span>
          <div className="min-w-0">
            <b>{animal.baia?.codigo ?? "Sem baia alocada"}</b>
            <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">
              {animal.baia
                ? ocupacaoBaia(animal.baia)
                : "O animal pode permanecer sem baia durante o tratamento."}
            </p>
            <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">{animal.emIsolamento ? "Em isolamento clínico." : "Fora de isolamento."}</p>
          </div>
          {animal.baia ? (
            <Button asChild variant="outline" className="col-span-full @min-[24rem]:col-auto @min-[24rem]:col-start-3">
              <Link href={`/painel/baias?baia=${animal.baia.id}`}>Abrir baia</Link>
            </Button>
          ) : null}
        </div>
        <form className="[display:flex] [flex-direction:column] [gap:14px]" onSubmit={submit}>
          {erro ? (
            <Alert variant="destructive">
              <AlertDescription className="text-inherit">{erro}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid grid-cols-1 gap-3 @min-[32rem]:grid-cols-2">
            <Field label="Nova alocação" htmlFor="animal-baia-select">
              <ControlSelect
                id="animal-baia-select"
                value={baiaId || "none"}
                disabled={disabled || saving}
                onValueChange={setBaiaId}
                options={[
                  { value: "none", label: "Sem baia" },
                  ...baias.map((baia) => ({
                    value: String(baia.id),
                    label: [baia.codigo, setorBaia(baia.setor), vagasBaia(baia)].filter(Boolean).join(" · "),
                  })),
                ]}
              />
            </Field>
            <Field label="Observação da movimentação" htmlFor="animal-baia-obs">
              <Input id="animal-baia-obs" value={observacao} maxLength={240} disabled={disabled || saving} onChange={(event) => setObservacao(event.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap justify-end gap-2.5 @max-[24rem]:[&>*]:w-full">
            <Button type="submit" disabled={disabled || saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MapPin aria-hidden="true" />}
              Atualizar baia
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Galeria({ animal, disabled, onChanged }: { animal: Animal; disabled: boolean; onChanged: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<number | null>(null);

  async function add(files: File[]) {
    if (!files.length || disabled) return;
    const vagas = MAX_FOTOS - animal.fotos.length;
    if (vagas <= 0) {
      setErro("A galeria aceita no máximo 10 fotos.");
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      for (const foto of files.slice(0, vagas)) {
        await adicionarFotoAnimal(animal.id, foto);
      }
      await onChanged();
      if (files.length > vagas) setErro("Algumas fotos não foram incluídas porque o limite é 10.");
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível adicionar a foto.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (disabled || removeId == null) return;
    const fotoId = removeId;
    setRemoveId(null);
    setSaving(true);
    setErro(null);
    try {
      await removerFotoAnimal(animal.id, fotoId);
      await onChanged();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível remover a foto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="[display:flex] [flex-direction:column] [gap:14px]">
      {erro ? (
        <Alert variant="destructive">
          <AlertDescription className="text-inherit">{erro}</AlertDescription>
        </Alert>
      ) : null}
      {!disabled ? (
        <PhotoPicker remaining={MAX_FOTOS - animal.fotos.length} disabled={saving} onPicked={(files) => void add(files)} />
      ) : null}
      {animal.fotos.length > 0 ? (
        <div className="[display:grid] [grid-template-columns:repeat(auto-fill,_minmax(124px,_1fr))] [gap:10px] [&_figure]:[margin:0] [&_figure]:[border:1px_solid_var(--line)] [&_figure]:[border-radius:8px] [&_figure]:[padding:8px] [&_figure]:[display:flex] [&_figure]:[flex-direction:column] [&_figure]:[gap:8px] [&_figure]:[background:#fff] [&_img]:[width:100%] [&_img]:[aspect-ratio:1_/_1] [&_img]:[object-fit:cover] [&_img]:[border-radius:6px] [&_img]:[background:var(--bg)] [&_figcaption]:[color:var(--muted)] [&_figcaption]:[font-size:12px] [&_figcaption]:[overflow-wrap:anywhere] [grid-template-columns:repeat(auto-fill,_minmax(150px,_1fr))]">
          {animal.fotos.map((foto) => (
            <figure key={foto.id}>
              <AnimalPhoto foto={foto} alt={`Foto ${foto.ordem + 1} de ${animal.nome}`} />
              <figcaption>
                {foto.identificacao ? "Identificação" : "Galeria"} · {formatBytes(foto.tamanhoBytes)}
              </figcaption>
              {!disabled ? (
                <Button type="button" variant="outline" disabled={saving} onClick={() => setRemoveId(foto.id)}>
                  <Trash2 aria-hidden="true" />
                  Remover
                </Button>
              ) : null}
            </figure>
          ))}
        </div>
      ) : (
        <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Nenhuma foto registrada.</p>
      )}
      <ConfirmDialog
        open={removeId != null}
        title="Remover foto"
        description="Remover esta foto da galeria?"
        confirmLabel="Remover"
        onOpenChange={(open) => { if (!open) setRemoveId(null); }}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

function Acompanhamento({ animal, disabled, onChanged }: { animal: Animal; disabled: boolean; onChanged: () => Promise<void> }) {
  const [aberto, setAberto] = useState<"peso" | "observacao" | "evento" | null>(null);
  const pesoMaisRecente = animal.pesagens?.[0];
  const exames = (animal.eventos ?? []).filter((evento) => evento.tipo === "exame" || evento.tipo === "diagnostico");

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-label="Peso">
        <BlocoTitulo
          title="Peso"
          action="Registrar peso"
          disabled={disabled}
          onAction={() => setAberto("peso")}
        />
        <div className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3.5 [&_svg]:size-7 [&_svg]:text-[var(--primary)] [&_small]:text-xs [&_small]:text-[var(--muted)] [&_b]:block [&_b]:text-[22px]">
          <Scale aria-hidden="true" />
          <div>
            <small>Última pesagem</small>
            <b>{pesoMaisRecente ? `${pesoMaisRecente.valorKg} kg` : "Sem pesagens"}</b>
            {pesoMaisRecente ? <p className="text-[13px] text-[var(--muted)] wrap-break-word">{byline(pesoMaisRecente.usuario?.nome, pesoMaisRecente.createdAt)}</p> : null}
          </div>
        </div>
        <RecentList title="Pesagens" empty="Sem pesagens." items={(animal.pesagens ?? []).slice(0, 4).map((item) => ({
          id: item.id,
          title: `${item.valorKg} kg`,
          detail: item.observacao ?? "Sem observação",
          meta: byline(item.usuario?.nome, item.createdAt),
        }))} />
      </section>

      <section className="flex flex-col gap-3" aria-label="Observações">
        <BlocoTitulo
          title="Observações"
          action="Registrar observação"
          disabled={disabled}
          onAction={() => setAberto("observacao")}
        />
        <RecentList title="Recentes" empty="Sem observações." items={(animal.observacoes ?? []).slice(0, 4).map((item, index) => ({
          id: item.id,
          title: `Observação Nº ${(index + 1).toString().padStart(3, "0")}`,
          detail: item.texto,
          meta: byline(item.usuario?.nome, item.createdAt),
        }))} />
      </section>

      <section className="flex flex-col gap-3" aria-label="Exames e diagnósticos">
        <BlocoTitulo
          title="Exames e diagnósticos"
          action="Registrar evento"
          disabled={disabled}
          onAction={() => setAberto("evento")}
        />
        <RecentList title="Recentes" empty="Sem exames ou diagnósticos." items={exames.slice(0, 4).map((item) => ({
          id: item.id,
          title: eventoLabel[item.tipo],
          detail: item.resumo,
          meta: byline(item.usuario?.nome, item.createdAt),
        }))} />
      </section>

      <PesagemForm animal={animal} disabled={disabled} open={aberto === "peso"} onOpenChange={(open) => setAberto(open ? "peso" : null)} onChanged={onChanged} />
      <ObservacaoForm animal={animal} disabled={disabled} open={aberto === "observacao"} onOpenChange={(open) => setAberto(open ? "observacao" : null)} onChanged={onChanged} />
      <EventoForm animal={animal} disabled={disabled} open={aberto === "evento"} onOpenChange={(open) => setAberto(open ? "evento" : null)} onChanged={onChanged} />
    </div>
  );
}

function BlocoTitulo({ title, action, disabled, onAction }: { title: string; action: string; disabled: boolean; onAction: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="m-0 text-[17px]">{title}</h3>
      <Button type="button" disabled={disabled} onClick={onAction}>
        <Plus aria-hidden="true" />
        {action}
      </Button>
    </div>
  );
}

function PesagemForm({ animal, disabled, open, onOpenChange, onChanged }: { animal: Animal; disabled: boolean; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => Promise<void> }) {
  const [valorKg, setValorKg] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    if (!valorKg || Number(valorKg) <= 0) {
      setErro("Informe um peso maior que zero.");
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      await adicionarPesagemAnimal(animal.id, { valorKg: Number(valorKg), observacao: observacao.trim() || undefined });
      setValorKg("");
      setObservacao("");
      onOpenChange(false);
      await onChanged();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível registrar a pesagem.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova pesagem</DialogTitle>
          <DialogDescription>Informe o peso atual do animal.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          {erro ? <p className="m-0 text-[13px] font-bold text-[var(--crit)]">{erro}</p> : null}
          <Field label="Peso em kg" htmlFor="animal-peso-valor">
            <Input id="animal-peso-valor" type="number" min="0.001" step="0.001" inputMode="decimal" value={valorKg} disabled={disabled || saving} onChange={(event) => setValorKg(event.target.value)} />
          </Field>
          <Field label="Observação" htmlFor="animal-peso-obs">
            <Input id="animal-peso-obs" value={observacao} maxLength={240} disabled={disabled || saving} onChange={(event) => setObservacao(event.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={disabled || saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
              Registrar peso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ObservacaoForm({ animal, disabled, open, onOpenChange, onChanged }: { animal: Animal; disabled: boolean; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => Promise<void> }) {
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    if (texto.trim().length < 3) {
      setErro("Descreva a observação.");
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      await adicionarObservacaoAnimal(animal.id, { texto: texto.trim() });
      setTexto("");
      onOpenChange(false);
      await onChanged();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível registrar a observação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova observação</DialogTitle>
          <DialogDescription>Registre uma nota de acompanhamento.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          {erro ? <p className="m-0 text-[13px] font-bold text-[var(--crit)]">{erro}</p> : null}
          <Field label="Texto" htmlFor="animal-obs-texto">
            <textarea id="animal-obs-texto" className="min-h-[116px] w-full resize-y rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] focus-visible:border-[var(--primary)] focus-visible:shadow-[var(--focus)] focus-visible:outline-none" rows={5} value={texto} disabled={disabled || saving} onChange={(event) => setTexto(event.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={disabled || saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
              Registrar observação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EventoForm({ animal, disabled, open, onOpenChange, onChanged }: { animal: Animal; disabled: boolean; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => Promise<void> }) {
  const [tipo, setTipo] = useState<"exame" | "diagnostico">("exame");
  const [resumo, setResumo] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    if (resumo.trim().length < 3) {
      setErro("Informe o resumo do evento.");
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      await registrarEventoAnimal(animal.id, { tipo, resumo: resumo.trim() });
      setResumo("");
      onOpenChange(false);
      await onChanged();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível registrar o evento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exame ou diagnóstico</DialogTitle>
          <DialogDescription>Registre o tipo e um resumo do evento.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          {erro ? <p className="m-0 text-[13px] font-bold text-[var(--crit)]">{erro}</p> : null}
          <Field label="Tipo" htmlFor="animal-evento-tipo">
            <ControlSelect
              id="animal-evento-tipo"
              value={tipo}
              disabled={disabled || saving}
              onValueChange={(value) => setTipo(value as "exame" | "diagnostico")}
              options={[
                { value: "exame", label: "Exame" },
                { value: "diagnostico", label: "Diagnóstico" },
              ]}
            />
          </Field>
          <Field label="Resumo" htmlFor="animal-evento-resumo">
            <Input id="animal-evento-resumo" value={resumo} maxLength={160} disabled={disabled || saving} onChange={(event) => setResumo(event.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={disabled || saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
              Registrar evento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecentList({ title, empty, items }: { title: string; empty: string; items: { id: number; title: string; detail: string; meta: string }[] }) {
  return (
    <div>
      <h4>{title}</h4>
      {items.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((item) => (
            <li className="flex flex-col gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2.5" key={item.id}>
              <b>{item.title}</b>
              <span className="text-[13px] text-[var(--muted)]">{item.detail}</span>
              <small className="text-[13px] text-[var(--muted)]">{item.meta}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">{empty}</p>
      )}
    </div>
  );
}

function RevogarTerminal({ animal, onChanged }: { animal: Animal; onChanged: () => Promise<void> }) {
  const [situacao, setSituacao] = useState<Extract<SituacaoAnimal, "em_tratamento" | "em_quarentena_observacao" | "saudavel">>("em_tratamento");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (motivo.trim().length < 5) {
      setErro("Informe um motivo com pelo menos 5 caracteres.");
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmar() {
    setConfirmOpen(false);
    setSaving(true);
    setErro(null);
    try {
      await revogarSituacaoAnimal(animal.id, { situacao, motivo: motivo.trim() });
      setMotivo("");
      await onChanged();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível revogar a situação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className="[display:flex] [flex-direction:column] [gap:14px]" onSubmit={submit}>
        {erro ? (
          <Alert variant="destructive">
            <AlertDescription className="text-inherit">{erro}</AlertDescription>
          </Alert>
        ) : null}
        <div className="[display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px] max-[760px]:[grid-template-columns:1fr]">
          <Field label="Nova situação" htmlFor="animal-revogar-situacao">
            <ControlSelect
              id="animal-revogar-situacao"
              value={situacao}
              disabled={saving}
              onValueChange={(value) => setSituacao(value as typeof situacao)}
              options={[
                { value: "em_tratamento", label: "Em tratamento" },
                { value: "em_quarentena_observacao", label: "Quarentena/observação" },
                { value: "saudavel", label: "Saudável" },
              ]}
            />
          </Field>
          <Field label="Motivo obrigatório" htmlFor="animal-revogar-motivo">
            <Input id="animal-revogar-motivo" value={motivo} maxLength={500} disabled={saving} onChange={(event) => setMotivo(event.target.value)} />
          </Field>
        </div>
        <div className="[display:flex] [justify-content:flex-end] [gap:10px] [flex-wrap:wrap] max-[760px]:[&>*]:[width:100%]">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
            Revogar e auditar
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        title="Revogar estado terminal"
        description="Revogar o estado terminal deste animal? A ação fica registrada no histórico."
        confirmLabel="Revogar"
        onOpenChange={setConfirmOpen}
        onConfirm={() => void confirmar()}
      />
    </>
  );
}

const timelineTone = {
  ok: "border-line border-l-ok bg-ok-50",
  info: "border-line border-l-info bg-info-50",
  crit: "border-line border-l-crit bg-crit-50",
  muted: "border-line border-l-muted-foreground bg-background",
} as const;

const timelineIconTone = {
  ok: "bg-ok text-white",
  info: "bg-info text-white",
  crit: "bg-crit text-white",
  muted: "bg-muted-foreground text-white",
} as const;

function Timeline({ eventos }: { eventos: EventoAnimal[] }) {
  if (eventos.length === 0) {
    return <p className="text-sm wrap-break-word text-muted-foreground">Nenhum evento registrado no histórico do animal.</p>;
  }
  return (
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
      {eventos.map((evento) => {
        const tone = eventoTone(evento.tipo);
        const Icon = eventoIcon(evento.tipo);
        return (
          <li className={`flex items-start gap-3 rounded-lg border border-l-4 p-3 ${timelineTone[tone]}`} key={evento.id}>
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${timelineIconTone[tone]}`}>
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <strong className="text-sm font-semibold text-ink">{eventoLabel[evento.tipo] ?? evento.tipo}</strong>
                <span className="text-xs text-muted-foreground">{formatDate(evento.createdAt)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{evento.usuario?.nome ?? "Sistema"}</p>
              <small className="text-sm text-ink wrap-break-word">{evento.resumo}</small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SectionHeader({ icon, title, note }: { icon: ReactNode; title: string; note: string }) {
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

function QuickFact({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "ok" | "warn" | "info" | "muted" }) {
  return (
    <div className="[min-height:74px] [border:1px_solid_var(--line)] [border-radius:8px] [background:var(--bg)] [padding:12px] [display:flex] [align-items:center] [gap:10px] [&>span]:[width:34px] [&>span]:[height:34px] [&>span]:[border-radius:8px] [&>span]:[background:var(--surface)] [&>span]:[display:grid] [&>span]:[place-items:center] [&>span]:[flex:none] [&_svg]:[width:18px] [&_svg]:[height:18px] [&_small]:[color:var(--muted)] [&_small]:[font-weight:700] [&_b]:[display:block] [&_b]:[margin-top:2px] [&_b]:[overflow-wrap:anywhere] data-[tone=ok]:[&>span]:[color:var(--ok)] data-[tone=ok]:[&>span]:[background:var(--ok-50)] data-[tone=warn]:[&>span]:[color:var(--warn)] data-[tone=warn]:[&>span]:[background:var(--warn-50)] data-[tone=info]:[&>span]:[color:var(--info)] data-[tone=info]:[&>span]:[background:var(--info-50)] data-[tone=muted]:[&>span]:[color:var(--muted)] data-[tone=muted]:[&>span]:[background:var(--surface)]" data-tone={tone}>
      <span>{icon}</span>
      <div className="min-w-0">
        <small>{label}</small>
        <b>{value}</b>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, required, children }: { label: string; htmlFor: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
      <Label htmlFor={htmlFor}>
        {label} {required ? <em className="[color:var(--crit)] [font-style:normal]">*</em> : null}
      </Label>
      {children}
    </div>
  );
}

function CheckLine({ id, label, checked, disabled, onChange }: { id: string; label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
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

function FichaSkeleton() {
  return (
    <div className="[display:grid] [grid-template-columns:minmax(0,_1fr)_minmax(300px,_0.42fr)] [align-items:start] [gap:16px] max-[760px]:[grid-template-columns:1fr]" aria-label="Carregando ficha">
      <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto]">
        <div className="[display:grid] [grid-template-columns:132px_minmax(0,_1fr)] [align-items:center] [gap:16px] [&_h2]:[margin:10px_0_2px] [&_h2]:[font-size:24px] max-[760px]:[grid-template-columns:1fr]">
          <Skeleton className="[&_img]:[width:100%] [&_img]:[height:100%] [&_img]:[object-fit:cover] [width:132px] [aspect-ratio:1_/_1] [border-radius:8px] [background:var(--primary-50)] [color:var(--primary)] [display:grid] [place-items:center] [overflow:hidden] [&_svg]:[width:48px] [&_svg]:[height:48px] max-[760px]:[width:min(220px,_100%)]" />
          <div className="[display:flex] [flex-direction:column] [gap:12px]">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
      </section>
      <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)]">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-20 w-full" />
      </section>
      <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)]">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-48 w-full" />
      </section>
    </div>
  );
}

function formFromAnimal(animal: Animal): FormFicha {
  return {
    nome: animal.nome,
    numeroRegistro: animal.numeroRegistro,
    especie: animal.especie,
    racaId: racaFormValue(animal),
    novaRaca: "",
    sexo: animal.sexo,
    porte: animal.porte,
    corPelagem: animal.corPelagem ?? "",
    situacao: animal.situacao === "adotado" ? "em_tratamento" : animal.situacao,
    emIsolamento: animal.emIsolamento,
    castrado: animal.castrado,
    pesoAtualKg: animal.pesoAtualKg ? String(animal.pesoAtualKg) : "",
    dataAcolhimento: toDateInput(animal.dataAcolhimento),
    dataNascimento: toDateInput(animal.dataNascimento),
    idadeEstimadaQuantidade: animal.idadeEstimadaQuantidade != null ? String(animal.idadeEstimadaQuantidade) : "",
    idadeEstimadaUnidade: animal.idadeEstimadaUnidade ?? "meses",
    idadeAproximada: animal.idadeAproximada,
    nasceuNoCcz: animal.nasceuNoCcz,
    acolhidoPor: animal.acolhidoPor ?? "",
  };
}

async function resolverRacaFicha(form: FormFicha, racas: RacaAnimal[]) {
  if (form.racaId === "nova") {
    const nome = form.novaRaca.trim();
    const existente = racas.find((raca) => raca.nome.localeCompare(nome, "pt-BR", { sensitivity: "base" }) === 0);
    if (existente) return existente.id;
    return (await criarRacaAnimal({ especie: form.especie, nome })).id;
  }
  return form.racaId ? Number(form.racaId) : null;
}

function payloadFicha(form: FormFicha, racaId: number | null): AtualizarAnimalInput {
  return {
    nome: form.nome.trim(),
    numeroRegistro: form.numeroRegistro.trim(),
    especie: form.especie,
    racaId,
    sexo: form.sexo,
    porte: form.porte,
    corPelagem: form.corPelagem.trim() || null,
    situacao: form.situacao,
    emIsolamento: form.emIsolamento,
    castrado: form.castrado,
    pesoAtualKg: form.pesoAtualKg ? Number(form.pesoAtualKg) : null,
    dataAcolhimento: dateOrNull(form.dataAcolhimento),
    dataNascimento: dateOrNull(form.dataNascimento),
    idadeEstimadaQuantidade: form.idadeEstimadaQuantidade ? Number.parseInt(form.idadeEstimadaQuantidade, 10) : null,
    idadeEstimadaUnidade: form.idadeEstimadaQuantidade ? form.idadeEstimadaUnidade : null,
    idadeAproximada: form.idadeAproximada,
    nasceuNoCcz: form.nasceuNoCcz,
    acolhidoPor: form.acolhidoPor.trim() || null,
  };
}

function idAnimal(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) return null;
  return Number(value);
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function dateOrNull(value: string) {
  return value ? `${value}T12:00:00.000Z` : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

function byline(usuario: string | undefined, createdAt: string) {
  return `${usuario ?? "Sistema"} · ${formatDate(createdAt)}`;
}

function ocupacaoBaia(baia: Baia) {
  const vagas = vagasBaia(baia);
  return [setorBaia(baia.setor), vagas ? `${vagas} ocupada(s)` : null].filter(Boolean).join(" · ");
}

function vagasBaia(baia: Pick<Baia, "ocupacao" | "capacidade">) {
  if (!Number.isFinite(baia.ocupacao) || !Number.isFinite(baia.capacidade)) return null;
  return `${baia.ocupacao}/${baia.capacidade}`;
}

function setorBaia(setor: Baia["setor"]) {
  const labels: Record<Baia["setor"], string> = {
    canil: "Canil",
    gatil: "Gatil",
    quarentena: "Quarentena",
  };
  return labels[setor];
}

function eventoTone(tipo: TipoEventoAnimal): "ok" | "info" | "crit" | "muted" {
  if (tipo === "revogacao_situacao_terminal" || tipo === "mudanca_situacao") return "crit";
  if (tipo === "criacao") return "muted";
  if (tipo === "pesagem" || tipo === "mudanca_baia" || tipo === "exame" || tipo === "diagnostico" || tipo === "foto" || tipo === "observacao") return "info";
  return "ok";
}

function eventoIcon(tipo: TipoEventoAnimal): LucideIcon {
  switch (tipo) {
    case "criacao": return PlusCircleIcon;
    case "edicao": return Edit3Icon;
    case "revogacao_situacao_terminal": return RewindIcon;
    case "mudanca_situacao": return InfoIcon;
    case "pesagem": return ScaleIcon;
    case "mudanca_baia": return MapPinPenIcon;
    case "exame": return ClipboardPlusIcon;
    case "diagnostico": return ClipboardCheckIcon;
    case "foto": return ImagePlusIcon;
    case "observacao": return MessageCircleIcon;
    default: return FileTextIcon;
  }
}
function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
