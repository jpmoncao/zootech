"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Ban,
  Check,
  DoorOpen,
  Edit3,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { ControlSelect } from "@/components/control-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Shell } from "../../../components/shell";
import {
  ApiError,
  atualizarBaia,
  criarBaia,
  executarAcaoBaia,
  getCurrentUser,
  listarBaias,
  listarHistoricoBaia,
  obterBaia,
  type AcaoBaia,
  type Baia,
  type BaiaHistoricoEvento,
  type CriarBaiaInput,
  type EstadoBaia,
  type ListarBaiasFiltros,
  type SetorBaia,
  type TipoBaia,
} from "../../../lib/api";
import { canManageBaias, canViewBaiasAudit } from "../../../lib/access";

const setores: SetorBaia[] = ["canil", "gatil", "quarentena"];
const estados: EstadoBaia[] = ["ativa", "em_higienizacao", "interditada", "inativa"];
const tipos: TipoBaia[] = ["coletiva", "individual"];

const setorLabel: Record<SetorBaia, string> = {
  canil: "Canil",
  gatil: "Gatil",
  quarentena: "Quarentena",
};

const tipoLabel: Record<TipoBaia, string> = {
  coletiva: "Coletiva",
  individual: "Individual",
};

const estadoLabel: Record<EstadoBaia, string> = {
  ativa: "Ativa",
  inativa: "Inativa",
  interditada: "Interditada",
  em_higienizacao: "Em higienização",
};

type ViewMode = "lista" | "mapa";

type BaiaFormState = {
  codigo: string;
  setor: SetorBaia;
  tipo: TipoBaia;
  capacidade: string;
  areaM2: string;
  possuiSolario: boolean;
  exclusivaIsolamento: boolean;
};

const formInicial: BaiaFormState = {
  codigo: "",
  setor: "canil",
  tipo: "coletiva",
  capacidade: "1",
  areaM2: "",
  possuiSolario: false,
  exclusivaIsolamento: false,
};

export default function Page() {
  return (
    <Shell section="baias" title="Baias">
      <Suspense fallback={<BaiasSkeleton />}>
        <Baias />
      </Suspense>
    </Shell>
  );
}

function idBaiaNaUrl(params: { get(name: string): string | null }) {
  const raw = params.get("baia");
  if (!raw || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

function Baias() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = idBaiaNaUrl(searchParams);
  const user = getCurrentUser();
  const podeAdministrar = user ? canManageBaias(user.perfilAcesso) : false;
  const podeVerHistorico = user ? canViewBaiasAudit(user.perfilAcesso) : false;
  const [baias, setBaias] = useState<Baia[]>([]);
  const [detalhe, setDetalhe] = useState<Baia | null>(null);
  const [detalheLoading, setDetalheLoading] = useState(false);
  const [detalheErro, setDetalheErro] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("lista");
  const [filtros, setFiltros] = useState<ListarBaiasFiltros>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Baia | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void carregar(filtros);
  }, [filtros]);

  useEffect(() => {
    if (selectedId == null) {
      setDetalhe(null);
      setDetalheErro(null);
      setDetalheLoading(false);
      return;
    }
    let cancelled = false;
    setDetalheLoading(true);
    setDetalheErro(null);
    obterBaia(selectedId)
      .then((baia) => {
        if (!cancelled) setDetalhe(baia);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDetalhe(null);
        setDetalheErro(error instanceof ApiError ? error.message : "Não foi possível carregar a baia.");
      })
      .finally(() => {
        if (!cancelled) setDetalheLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const indicadores = useMemo(() => resumir(baias), [baias]);

  const levarAoDetalhe = useRef(false);

  function selecionar(id: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("baia", String(id));
    router.replace(`/painel/baias?${next.toString()}`, { scroll: false });
    if (id === selectedId) {
      document.getElementById("baia-detalhe")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    levarAoDetalhe.current = true;
  }

  useEffect(() => {
    if (!levarAoDetalhe.current || selectedId == null) return;
    const alvo = document.getElementById("baia-detalhe");
    if (!alvo) return;
    levarAoDetalhe.current = false;
    alvo.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedId]);

  async function carregar(nextFiltros = filtros) {
    setLoading(true);
    setErro(null);
    try {
      setBaias(await listarBaias(nextFiltros));
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível carregar as baias.");
      setBaias([]);
    } finally {
      setLoading(false);
    }
  }

  async function refreshBaia(id: number) {
    const atualizada = await obterBaia(id);
    setBaias((items) => items.map((item) => (item.id === id ? atualizada : item)));
    setDetalhe(atualizada);
    return atualizada;
  }

  function abrirCadastro() {
    setEditing(null);
    setFormOpen(true);
  }

  function abrirEdicao(baia: Baia) {
    setEditing(baia);
    setFormOpen(true);
  }

  return (
    <div className="[display:flex] [flex-direction:column] [gap:20px] [width:100%] [flex:1_0_auto]">
      <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:16px] max-[760px]:[flex-direction:column]">
        <div>
          <h1>Baias</h1>
          <p className="[color:var(--muted)] [max-width:62ch]">
            Cadastro, situação operacional, ocupação e histórico das baias do CCZ.
          </p>
        </div>
        <div className="[display:flex] [align-items:center] [gap:10px] [flex-wrap:wrap] [justify-content:flex-end] max-[760px]:[width:100%] max-[760px]:[justify-content:stretch] max-[760px]:[&>*]:[flex:1]">
          <Button variant="outline" type="button" onClick={() => void carregar()}>
            <RefreshCw aria-hidden="true" />
            Atualizar
          </Button>
          {podeAdministrar ? (
            <Button type="button" onClick={abrirCadastro}>
              <Plus aria-hidden="true" />
              Nova baia
            </Button>
          ) : null}
        </div>
      </div>

      {erro ? (
        <Alert variant="destructive">
          <AlertDescription className="text-inherit">{erro}</AlertDescription>
        </Alert>
      ) : null}

      <section className="[display:grid] [grid-template-columns:repeat(5,_minmax(0,_1fr))] [gap:10px] max-[760px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]" aria-label="Indicadores de baias">
        <Metric label="Baias" value={indicadores.total} />
        <Metric label="Livres" value={indicadores.livres} tone="ok" />
        <Metric label="Ocupadas" value={indicadores.ocupadas} tone="info" />
        <Metric label="Higienização" value={indicadores.higienizacao} tone="info" />
        <Metric label="Interditadas" value={indicadores.interditadas} tone="crit" />
      </section>

      <div data-detail={selectedId != null ? "open" : "closed"} className="@container grid flex-1 grid-cols-1 items-stretch gap-4 @min-[56rem]:data-[detail=open]:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)] [min-width:0] [min-height:100%] [overflow:clip] min-[761px]:max-[1023px]:[min-height:0]" aria-label="Consulta de baias">
          <BaiasToolbar
            filtros={filtros}
            view={view}
            onFiltro={setFiltros}
            onView={setView}
          />
          {loading ? <BaiasSkeleton /> : null}
          {!loading && baias.length === 0 ? (
            <EmptyState podeAdministrar={podeAdministrar} onCreate={abrirCadastro} />
          ) : null}
          {!loading && baias.length > 0 ? (
            view === "lista" ? (
              <BaiasLista baias={baias} selectedId={selectedId} onSelect={selecionar} />
            ) : (
              <BaiasMapa baias={baias} selectedId={selectedId} onSelect={selecionar} />
            )
          ) : null}
        </section>

        {selectedId != null ? (
          <div id="baia-detalhe" className="min-w-0 scroll-mt-4">
          {detalheErro ? (
            <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)] [min-width:0] [min-height:100%] min-[761px]:max-[1023px]:[min-height:0]">
              <Alert variant="destructive">
                <AlertDescription className="text-inherit">{detalheErro}</AlertDescription>
              </Alert>
            </section>
          ) : detalheLoading || !detalhe ? (
            <BaiaDetalheSkeleton />
          ) : (
            <BaiaDetalhe
              baia={detalhe}
              podeAdministrar={podeAdministrar}
              podeVerHistorico={podeVerHistorico}
              onEdit={abrirEdicao}
              onChanged={(id) => void refreshBaia(id)}
            />
          )}
          </div>
        ) : null}
      </div>

      {formOpen ? (
        <BaiaForm
          baia={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(saved) => {
            setFormOpen(false);
            setEditing(null);
            setBaias((items) => {
              const exists = items.some((item) => item.id === saved.id);
              if (exists) return items.map((item) => (item.id === saved.id ? saved : item));
              return [...items, saved].sort(porSetorCodigo);
            });
            selecionar(saved.id);
          }}
        />
      ) : null}
    </div>
  );
}

function BaiasToolbar({
  filtros,
  view,
  onFiltro,
  onView,
}: {
  filtros: ListarBaiasFiltros;
  view: ViewMode;
  onFiltro: (filtros: ListarBaiasFiltros) => void;
  onView: (view: ViewMode) => void;
}) {
  const temFiltro = Boolean(filtros.busca?.trim() || filtros.setor || filtros.estado);
  const [filtrosAbertos, setFiltrosAbertos] = useState(Boolean(filtros.setor || filtros.estado));
  const FILTER_ALL = "__all__";

  return (
    <div className="[display:flex] [flex-direction:column] [gap:14px]">
      <div className="[display:grid] [grid-template-columns:minmax(240px,_1fr)_auto] [align-items:end] [gap:12px] max-[760px]:[grid-template-columns:1fr]">
        <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600] [flex:1.4_1_180px]">
          <Label htmlFor="baia-busca">Buscar código</Label>
          <div className="[position:relative] [&_svg]:[position:absolute] [&_svg]:[left:12px] [&_svg]:[top:50%] [&_svg]:[width:18px] [&_svg]:[height:18px] [&_svg]:[color:var(--muted)] [&_svg]:[transform:translateY(-50%)] [&_svg]:[pointer-events:none]">
            <Search aria-hidden="true" />
            <Input
              id="baia-busca"
              value={filtros.busca ?? ""}
              placeholder="Ex.: C-01"
              className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px] pl-10"
              onChange={(event) => onFiltro({ ...filtros, busca: event.target.value || undefined })}
            />
          </div>
        </div>
        <div className="[display:flex] [flex-wrap:wrap] [align-items:center] [justify-content:flex-end] [gap:12px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[&>*]:[width:100%]">
          <Button type="button" variant={filtrosAbertos ? "default" : "outline"} onClick={() => setFiltrosAbertos((open) => !open)}>
            <SlidersHorizontal aria-hidden="true" />
            Filtros
          </Button>
          <div className="[flex:0_0_auto] [display:grid] [grid-template-columns:1fr_1fr] [gap:8px] max-[760px]:[grid-template-columns:1fr]" role="group" aria-label="Visualização">
            <Button type="button" variant={view === "lista" ? "default" : "outline"} onClick={() => onView("lista")}>
              Lista
            </Button>
            <Button type="button" variant={view === "mapa" ? "default" : "outline"} onClick={() => onView("mapa")}>
              Mapa
            </Button>
          </div>
          <Button type="button" variant="outline" disabled={!temFiltro} onClick={() => onFiltro({})}>
            <X aria-hidden="true" />
            Limpar
          </Button>
        </div>
      </div>
      {filtrosAbertos ? (
        <div className="[display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:12px] [padding:12px] [border:1px_solid_var(--line)] [border-radius:10px] [background:var(--bg)] min-[761px]:max-[1023px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[760px]:[grid-template-columns:1fr]">
          <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
            <Label htmlFor="baia-setor">Setor</Label>
            <ControlSelect
              id="baia-setor"
              value={filtros.setor ?? FILTER_ALL}
              onValueChange={(value) => onFiltro({ ...filtros, setor: value === FILTER_ALL ? undefined : (value as SetorBaia) })}
              options={[{ value: FILTER_ALL, label: "Todos" }, ...setores.map((setor) => ({ value: setor, label: setorLabel[setor] }))]}
            />
          </div>
          <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
            <Label htmlFor="baia-estado">Estado</Label>
            <ControlSelect
              id="baia-estado"
              value={filtros.estado ?? FILTER_ALL}
              onValueChange={(value) => onFiltro({ ...filtros, estado: value === FILTER_ALL ? undefined : (value as EstadoBaia) })}
              options={[{ value: FILTER_ALL, label: "Todos" }, ...estados.map((estado) => ({ value: estado, label: estadoLabel[estado] }))]}
            />
          </div>
        </div>
      ) : null}
      {temFiltro ? (
        <ul className="[display:flex] [flex-wrap:wrap] [gap:8px] [margin:0] [padding:0] [list-style:none] [&_li]:[border:1px_solid_var(--line)] [&_li]:[border-radius:999px] [&_li]:[background:#fff] [&_li]:[color:var(--primary-700)] [&_li]:[padding:4px_10px] [&_li]:[font:700_12px/1.2_var(--body)]">
          {filtros.busca?.trim() ? <li>Busca: {filtros.busca.trim()}</li> : null}
          {filtros.setor ? <li>{setorLabel[filtros.setor]}</li> : null}
          {filtros.estado ? <li>{estadoLabel[filtros.estado]}</li> : null}
        </ul>
      ) : null}
    </div>
  );
}

function BaiasLista({
  baias,
  selectedId,
  onSelect,
}: {
  baias: Baia[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="[display:flex] [flex-direction:column] [gap:8px]" role="list" aria-label="Lista de baias">
      {baias.map((baia) => (
        <button
          key={baia.id}
          type="button"
          className="[width:100%] [min-height:74px] [border:1px_solid_var(--line)] [border-radius:8px] [background:#fff] [color:var(--ink)] [padding:12px] [display:grid] [grid-template-columns:minmax(0,_1fr)_auto_120px] [align-items:center] [gap:12px] [text-align:left] [cursor:pointer] hover:[border-color:var(--primary)] hover:[background:var(--primary-50)] aria-[current=true]:[border-color:var(--primary)] aria-[current=true]:[background:var(--primary-50)] max-[760px]:[grid-template-columns:1fr] max-[760px]:[align-items:stretch]"
          aria-current={baia.id === selectedId ? "true" : undefined}
          onClick={() => onSelect(baia.id)}
        >
          <BaiaIdentity baia={baia} />
          <StatusBadge estado={baia.estado} />
          <Occupancy baia={baia} />
        </button>
      ))}
    </div>
  );
}

function BaiasMapa({
  baias,
  selectedId,
  onSelect,
}: {
  baias: Baia[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const grupos = setores
    .map((setor) => ({ setor, baias: baias.filter((baia) => baia.setor === setor) }))
    .filter((grupo) => grupo.baias.length > 0);
  return (
    <div className="[display:flex] [flex-direction:column] [gap:16px]" aria-label="Mapa esquemático de baias">
      {grupos.map((grupo) => (
        <section key={grupo.setor} className="[display:flex] [flex-direction:column] [gap:10px] [&_h2]:[margin:0] [&_h2]:[font-size:16px]">
          <h2>{setorLabel[grupo.setor]}</h2>
          <div className="[display:grid] [grid-template-columns:repeat(auto-fill,_minmax(112px,_1fr))] [gap:8px]">
            {grupo.baias.map((baia) => (
              <button
                key={baia.id}
                type="button"
                className="[aspect-ratio:1_/_0.86] [min-height:94px] [border:1px_solid_var(--line)] [border-radius:8px] [background:#fff] [color:var(--ink)] [padding:10px] [display:flex] [flex-direction:column] [justify-content:space-between] [gap:6px] [text-align:left] [cursor:pointer] hover:[border-color:var(--primary)] hover:[box-shadow:var(--focus)] aria-[current=true]:[border-color:var(--primary)] aria-[current=true]:[box-shadow:var(--focus)] data-[estado=ativa]:[border-top:4px_solid_var(--ok)] data-[estado=em\_higienizacao]:[border-top:4px_solid_var(--info)] data-[estado=interditada]:[border-top:4px_solid_var(--crit)] data-[estado=inativa]:[border-top:4px_solid_var(--muted)] [&_strong]:[font-size:16px] [&_span]:[color:var(--muted)] [&_span]:[font-size:12px] [&_small]:[color:var(--muted)] [&_small]:[font-size:12px]"
                data-estado={baia.estado}
                aria-current={baia.id === selectedId ? "true" : undefined}
                onClick={() => onSelect(baia.id)}
              >
                <strong className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]">{baia.codigo}</strong>
                <span>{estadoLabel[baia.estado]}</span>
                <small>
                  {baia.ocupacao}/{baia.capacidade}
                </small>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function BaiaDetalhe({
  baia,
  podeAdministrar,
  podeVerHistorico,
  onEdit,
  onChanged,
}: {
  baia: Baia;
  podeAdministrar: boolean;
  podeVerHistorico: boolean;
  onEdit: (baia: Baia) => void;
  onChanged: (id: number) => void;
}) {
  const [historico, setHistorico] = useState<BaiaHistoricoEvento[] | null>(null);
  const [erroHistorico, setErroHistorico] = useState<string | null>(null);

  useEffect(() => {
    if (!baia || !podeVerHistorico) {
      setHistorico(null);
      setErroHistorico(null);
      return;
    }
    let cancelled = false;
    setHistorico(null);
    setErroHistorico(null);
    listarHistoricoBaia(baia.id)
      .then((eventos) => {
        if (!cancelled) setHistorico(eventos);
      })
      .catch((error) => {
        if (!cancelled) {
          setErroHistorico(error instanceof ApiError ? error.message : "Não foi possível carregar o histórico.");
          setHistorico([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [baia, podeVerHistorico]);

  return (
    <section className="flex w-full min-w-0 flex-col gap-4 rounded-[10px] border border-line bg-surface p-5 shadow-[var(--shadow)] @min-[56rem]:min-h-full" aria-label={`Detalhes da baia ${baia.codigo}`}>
      <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] max-[760px]:[flex-direction:column]">
        <BaiaIdentity baia={baia} />
        <div className="[display:flex] [align-items:center] [justify-content:flex-end] [gap:8px] [flex-wrap:wrap] max-[760px]:[width:100%] max-[760px]:[justify-content:stretch] max-[760px]:[&>*]:[flex:1]">
          <StatusBadge estado={baia.estado} />
          {podeAdministrar ? (
            <Button type="button" variant="outline" onClick={() => onEdit(baia)}>
              <Edit3 aria-hidden="true" />
              Editar
            </Button>
          ) : null}
        </div>
      </div>
      <dl className="[display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px_16px] [margin:0] [&_div]:[display:flex] [&_div]:[flex-direction:column] [&_div]:[gap:2px] [&_dt]:[font-size:12px] [&_dt]:[font-weight:600] [&_dt]:[color:var(--muted)] [&_dd]:[margin:0] [&_dd]:[font-size:15px] max-[760px]:[grid-template-columns:1fr]">
        <div>
          <dt>Tipo</dt>
          <dd>{tipoLabel[baia.tipo]}</dd>
        </div>
        <div>
          <dt>Capacidade</dt>
          <dd>{baia.capacidade}</dd>
        </div>
        <div>
          <dt>Área</dt>
          <dd>{baia.areaM2 == null ? "Não registrada" : `${formatNumber(baia.areaM2)} m²`}</dd>
        </div>
        <div>
          <dt>Última higienização</dt>
          <dd>{baia.ultimaHigienizacaoEm ? formatarData(baia.ultimaHigienizacaoEm) : "Não registrada"}</dd>
        </div>
        <div>
          <dt>Solário</dt>
          <dd>{baia.possuiSolario ? "Sim" : "Não"}</dd>
        </div>
        <div>
          <dt>Isolamento</dt>
          <dd>{baia.exclusivaIsolamento ? "Exclusiva" : "Uso geral"}</dd>
        </div>
      </dl>

      <section className="[border-top:1px_solid_var(--line)] [padding-top:16px] [display:flex] [flex-direction:column] [gap:12px] [&_h2]:[margin:0] [&_h2]:[font-size:17px]">
        <h2>Ocupantes</h2>
        {baia.ocupantes.length === 0 ? (
          <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Nenhum ocupante vinculado a esta baia.</p>
        ) : (
          <div className="[display:flex] [flex-direction:column] [gap:10px]">
            {baia.ocupantes.map((ocupante) => (
              <div key={ocupante.id} className="[border:1px_solid_var(--line)] [border-radius:8px] [padding:10px] [display:grid] [gap:2px] [&_span]:[color:var(--muted)] [&_span]:[font-size:13px] [&_small]:[color:var(--muted)] [&_small]:[font-size:13px]">
                <strong>{ocupante.nome ?? ocupante.codigo ?? `Animal ${ocupante.id}`}</strong>
                <span>{ocupante.especie ?? "Espécie não informada"}</span>
                {ocupante.emIsolamento ? <small>Isolamento</small> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {podeAdministrar ? (
        <BaiaActions baia={baia} onChanged={onChanged} />
      ) : (
        <Alert>
          <AlertDescription className="text-inherit">
            Cadastro, ações operacionais e histórico ficam disponíveis para Coordenação.
          </AlertDescription>
        </Alert>
      )}

      {podeVerHistorico ? (
        <section className="[border-top:1px_solid_var(--line)] [padding-top:16px] [display:flex] [flex-direction:column] [gap:12px] [&_h2]:[margin:0] [&_h2]:[font-size:17px]">
          <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] [&_h2]:[margin:0] [&_h2]:[font-size:17px] [&>svg]:[width:22px] [&>svg]:[height:22px] [&>svg]:[color:var(--primary)] [&_svg]:[color:var(--primary)]">
            <History aria-hidden="true" />
            <h2>Histórico</h2>
          </div>
          {erroHistorico ? <p className="[font-size:13px] [color:var(--crit)]">{erroHistorico}</p> : null}
          {historico === null ? <HistoricoSkeleton /> : null}
          {historico?.length === 0 ? <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Nenhum evento registrado.</p> : null}
          {historico && historico.length > 0 ? <Historico eventos={historico} /> : null}
        </section>
      ) : null}
    </section>
  );
}

function BaiaActions({ baia, onChanged }: { baia: Baia; onChanged: (id: number) => void }) {
  const [acao, setAcao] = useState<AcaoBaia | null>(null);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const acoes = allowedActions(baia);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!acao) return;
    setPending(true);
    setErro(null);
    setOk(null);
    try {
      const result = await executarAcaoBaia(baia.id, acao, {
        ...(observacao.trim() ? { observacao: observacao.trim() } : {}),
      });
      setOk(`${actionLabel[acao]} registrada.`);
      setAcao(null);
      setObservacao("");
      onChanged(result.id);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível executar a ação.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="[border-top:1px_solid_var(--line)] [padding-top:16px] [display:flex] [flex-direction:column] [gap:12px] [&_h2]:[margin:0] [&_h2]:[font-size:17px]">
      <h2>Ações operacionais</h2>
      <form className="[display:flex] [flex-direction:column] [gap:10px]" onSubmit={submit}>
        <div className="[display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:8px] max-[760px]:[grid-template-columns:1fr]" role="group" aria-label="Ações permitidas">
          {acoes.map((item) => (
            <button
              key={item}
              type="button"
              className="[min-height:58px] [border:1px_solid_var(--line)] [border-radius:8px] [background:#fff] [color:var(--ink)] [padding:10px] [display:flex] [align-items:center] [gap:8px] [text-align:left] [font:700_13px/1.2_var(--body)] [cursor:pointer] [&_svg]:[width:18px] [&_svg]:[height:18px] [&_svg]:[flex:none] [&_svg]:[color:var(--primary)] data-[tone=ok]:[background:var(--ok-50)] data-[tone=ok]:[border-color:#b7dfc4] data-[tone=ok]:[&_svg]:[color:var(--ok)] data-[tone=info]:[background:var(--info-50)] data-[tone=info]:[border-color:#c6d9ec] data-[tone=info]:[&_svg]:[color:var(--info)] data-[tone=crit]:[background:var(--crit-50)] data-[tone=crit]:[border-color:#f0c2bc] data-[tone=crit]:[&_svg]:[color:var(--crit)] data-[tone=muted]:[background:var(--bg)] data-[tone=muted]:[border-color:var(--line)] data-[tone=muted]:[&_svg]:[color:var(--muted)] aria-[pressed=true]:[box-shadow:var(--focus)] data-[tone=ok]:aria-[pressed=true]:[border-color:var(--ok)] data-[tone=info]:aria-[pressed=true]:[border-color:var(--info)] data-[tone=crit]:aria-[pressed=true]:[border-color:var(--crit)] data-[tone=muted]:aria-[pressed=true]:[border-color:var(--muted)]"
              data-tone={actionTone[item]}
              aria-pressed={acao === item}
              onClick={() => {
                setAcao(item);
                setErro(null);
                setOk(null);
              }}
            >
              {actionIcon[item]}
              <span>{actionLabel[item]}</span>
            </button>
          ))}
        </div>
        {acoes.length === 0 ? <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Nenhuma ação disponível para o estado atual.</p> : null}
        {acao ? (
          <>
            <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
              <Label htmlFor="acao-observacao">Observação da ação (opcional)</Label>
              <Input
                id="acao-observacao"
                maxLength={500}
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
              />
            </div>
            <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">{actionImpact[acao]}</p>
          </>
        ) : null}
        {erro ? <p className="[font-size:13px] [color:var(--crit)]">{erro}</p> : null}
        {ok ? (
          <Alert variant="success" role="status">
            <AlertDescription className="text-inherit">{ok}</AlertDescription>
          </Alert>
        ) : null}
        <div className="[display:flex] [justify-content:space-between] [gap:12px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[flex-direction:column] max-[760px]:[align-items:stretch]">
          <Button type="submit" disabled={!acao || pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
            Confirmar ação
          </Button>
        </div>
      </form>
    </section>
  );
}

function BaiaForm({
  baia,
  onClose,
  onSaved,
}: {
  baia: Baia | null;
  onClose: () => void;
  onSaved: (baia: Baia) => void;
}) {
  const [form, setForm] = useState<BaiaFormState>(() => (baia ? formFromBaia(baia) : formInicial));
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const editing = baia !== null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    const payload = payloadFromForm(form);
    if (payload instanceof Error) {
      setErro(payload.message);
      return;
    }
    setPending(true);
    try {
      const saved = editing ? await atualizarBaia(baia.id, payload) : await criarBaia(payload);
      onSaved(saved);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar a baia.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="[position:fixed] [inset:0] [z-index:50] [display:flex] [justify-content:flex-end]" role="presentation">
      <button className="[position:absolute] [inset:0] [border:0] [background:rgba(12,_21,_20,_0.45)]" type="button" aria-label="Fechar formulário" onClick={onClose} />
      <aside className="[position:relative] [width:min(460px,_94vw)] [height:100%] [background:var(--surface)] [border-left:1px_solid_var(--line)] [box-shadow:-12px_0_32px_rgba(12,_69,_73,_0.16)] [padding:20px] [overflow:auto] [display:flex] [flex-direction:column] [gap:18px]" aria-label={editing ? "Editar baia" : "Nova baia"}>
        <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] [&_h2]:[margin:0] [&_h2]:[font-size:22px]">
          <div>
            <h2>{editing ? "Editar baia" : "Nova baia"}</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
        </div>
        <form className="[display:flex] [flex-direction:column] [gap:14px]" onSubmit={submit}>
          <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
            <Label htmlFor="codigo-baia">Código</Label>
            <Input
              id="codigo-baia"
              className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]"
              maxLength={40}
              value={form.codigo}
              aria-invalid={erro?.toLowerCase().includes("código") ? true : undefined}
              onChange={(event) => setForm({ ...form, codigo: event.target.value })}
            />
          </div>
          <div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:12px] max-[760px]:[grid-template-columns:1fr]">
            <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
              <Label htmlFor="setor-baia">Setor</Label>
              <ControlSelect
                id="setor-baia"
                value={form.setor}
                onValueChange={(value) => setForm({ ...form, setor: value as SetorBaia })}
                options={setores.map((setor) => ({ value: setor, label: setorLabel[setor] }))}
              />
            </div>
            <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
              <Label htmlFor="tipo-baia">Tipo</Label>
              <ControlSelect
                id="tipo-baia"
                value={form.tipo}
                onValueChange={(value) => {
                  const tipo = value as TipoBaia;
                  setForm({ ...form, tipo, capacidade: tipo === "individual" ? "1" : form.capacidade });
                }}
                options={tipos.map((tipo) => ({ value: tipo, label: tipoLabel[tipo] }))}
              />
            </div>
          </div>
          <div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:12px] max-[760px]:[grid-template-columns:1fr]">
            <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
              <Label htmlFor="capacidade-baia">Capacidade</Label>
              <Input
                id="capacidade-baia"
                className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]"
                inputMode="numeric"
                value={form.capacidade}
                disabled={form.tipo === "individual"}
                onChange={(event) => setForm({ ...form, capacidade: event.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
              <Label htmlFor="area-baia">Área em m² (opcional)</Label>
              <Input
                id="area-baia"
                className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]"
                inputMode="decimal"
                value={form.areaM2}
                onChange={(event) => setForm({ ...form, areaM2: event.target.value })}
              />
            </div>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <Label htmlFor="baia-solario">Possui solário</Label>
            <span className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--muted)]">{form.possuiSolario ? "Sim" : "Não"}</span>
              <Switch id="baia-solario" checked={form.possuiSolario} onCheckedChange={(checked) => setForm({ ...form, possuiSolario: checked })} />
            </span>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <Label htmlFor="baia-isolamento">Uso exclusivo para isolamento</Label>
            <span className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--muted)]">{form.exclusivaIsolamento ? "Sim" : "Não"}</span>
              <Switch id="baia-isolamento" checked={form.exclusivaIsolamento} onCheckedChange={(checked) => setForm({ ...form, exclusivaIsolamento: checked })} />
            </span>
          </div>
          {erro ? <p className="[font-size:13px] [color:var(--crit)]">{erro}</p> : null}
          <div className="[display:flex] [justify-content:space-between] [gap:12px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[flex-direction:column] max-[760px]:[align-items:stretch]">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
              Salvar baia
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "ok" | "info" | "warn" | "crit" }) {
  return (
    <div className="[min-height:82px] [border:1px_solid_var(--line)] [border-radius:8px] [background:var(--surface)] [padding:14px] [box-shadow:var(--shadow)] [display:flex] [flex-direction:column] [justify-content:center] [gap:4px] [&_b]:[font:700_26px/1_var(--display)] [&_b]:[color:var(--primary-700)] [&_span]:[color:var(--muted)] [&_span]:[font-size:13px] data-[tone=ok]:[&_b]:[color:var(--ok)] data-[tone=info]:[&_b]:[color:var(--info)] data-[tone=warn]:[&_b]:[color:var(--warn)] data-[tone=crit]:[&_b]:[color:var(--crit)]" data-tone={tone}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function BaiaIdentity({ baia }: { baia: Baia }) {
  return (
    <div className="[min-width:0] [display:flex] [flex-direction:column] [gap:2px] [&_strong]:[font-size:17px] [&_span]:[color:var(--muted)] [&_span]:[font-size:13px]">
      <strong className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]">{baia.codigo}</strong>
      <span>
        {setorLabel[baia.setor]} · {tipoLabel[baia.tipo]}
      </span>
    </div>
  );
}

function StatusBadge({ estado }: { estado: EstadoBaia }) {
  return (
    <span className="[min-height:28px] [border-radius:999px] [padding:6px_10px] [display:inline-flex] [align-items:center] [justify-content:center] [width:fit-content] [font:700_12px/1_var(--body)] [white-space:nowrap] data-[estado=ativa]:[background:var(--ok-50)] data-[estado=ativa]:[color:var(--ok)] data-[estado=em\_higienizacao]:[background:var(--info-50)] data-[estado=em\_higienizacao]:[color:var(--info)] data-[estado=interditada]:[background:var(--crit-50)] data-[estado=interditada]:[color:var(--crit)] data-[estado=inativa]:[background:var(--bg)] data-[estado=inativa]:[color:var(--muted)] data-[estado=inativa]:[border:1px_solid_var(--line)] data-[estado=em\_tratamento]:[background:var(--info-50)] data-[estado=em\_tratamento]:[color:var(--info)] data-[estado=em\_quarentena\_observacao]:[background:var(--info-50)] data-[estado=em\_quarentena\_observacao]:[color:var(--info)] data-[estado=saudavel]:[background:var(--ok-50)] data-[estado=saudavel]:[color:var(--ok)] data-[estado=adotado]:[background:var(--primary-50)] data-[estado=adotado]:[color:var(--primary-700)] data-[estado=obito]:[background:var(--bg)] data-[estado=obito]:[color:var(--muted)] data-[estado=obito]:[border:1px_solid_var(--line)] max-[760px]:[grid-column:2] max-[760px]:[align-items:flex-start] max-[760px]:[text-align:left]" data-estado={estado}>
      {estadoLabel[estado]}
    </span>
  );
}

function Occupancy({ baia }: { baia: Baia }) {
  return (
    <div className="[display:flex] [flex-direction:column] [gap:6px] [color:var(--muted)] [font:700_13px/1_var(--mono)] [&_meter]:[width:100%] [&_meter]:[height:8px]" aria-label={`${baia.ocupacao} de ${baia.capacidade} vagas ocupadas`}>
      <span>
        {baia.ocupacao}/{baia.capacidade}
      </span>
      <meter min={0} max={baia.capacidade} value={baia.ocupacao} />
    </div>
  );
}

const historicoTone = {
  ok: "border-line border-l-ok bg-ok-50",
  info: "border-line border-l-info bg-info-50",
  crit: "border-line border-l-crit bg-crit-50",
  muted: "border-line border-l-muted-foreground bg-background",
} as const;

const historicoIconTone = {
  ok: "bg-ok text-white",
  info: "bg-info text-white",
  crit: "bg-crit text-white",
  muted: "bg-muted-foreground text-white",
} as const;

function Historico({ eventos }: { eventos: BaiaHistoricoEvento[] }) {
  if (eventos.length === 0) {
    return <p className="wrap-break-word text-sm text-muted-foreground">Nenhum evento registrado no histórico da baia.</p>;
  }
  return (
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
      {eventos.map((evento) => {
        const tone = eventTone(evento.tipo);
        const Icon = eventIcon(evento.tipo);
        return (
          <li className={`flex items-start gap-3 rounded-lg border border-l-4 p-3 ${historicoTone[tone]}`} key={evento.id}>
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${historicoIconTone[tone]}`}>
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <strong className="text-sm font-semibold text-ink">{formatEventType(evento.tipo)}</strong>
                <span className="text-xs text-muted-foreground">{formatarData(evento.createdAt)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{evento.usuario?.nome ?? "Sistema"}</p>
              <small className="wrap-break-word text-sm text-ink">{resumirEvento(evento.dados)}</small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function BaiasSkeleton() {
  return (
    <div className="[display:flex] [flex-direction:column] [gap:8px]" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}

function BaiaDetalheSkeleton() {
  return (
    <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)] [min-width:0] [min-height:100%] min-[761px]:max-[1023px]:[min-height:0]" aria-hidden="true">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </section>
  );
}

function HistoricoSkeleton() {
  return (
    <div className="[display:flex] [flex-direction:column] [gap:12px]" aria-hidden="true">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

function EmptyState({ podeAdministrar, onCreate }: { podeAdministrar: boolean; onCreate: () => void }) {
  return (
    <div className="[min-width:0] [min-height:100%] [flex:1] [min-height:220px] [display:grid] [place-items:center] [align-content:center] [gap:10px] [text-align:center] [&>svg]:[width:22px] [&>svg]:[height:22px] [&>svg]:[color:var(--primary)] min-[761px]:max-[1023px]:[min-height:0]">
      <DoorOpen aria-hidden="true" />
      <h2>Nenhuma baia encontrada</h2>
      <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Ajuste os filtros ou cadastre a primeira baia do setor.</p>
      {podeAdministrar ? (
        <Button type="button" onClick={onCreate}>
          <Plus aria-hidden="true" />
          Nova baia
        </Button>
      ) : null}
    </div>
  );
}

const actionTone: Record<AcaoBaia, "ok" | "info" | "crit" | "muted"> = {
  interditar: "crit",
  liberar: "ok",
  inativar: "muted",
  reativar: "ok",
  iniciar_higienizacao: "info",
  concluir_higienizacao: "ok",
};

const actionLabel: Record<AcaoBaia, string> = {
  interditar: "Interditar",
  liberar: "Liberar",
  inativar: "Inativar",
  reativar: "Reativar",
  iniciar_higienizacao: "Iniciar higienização",
  concluir_higienizacao: "Concluir higienização",
};

const actionImpact: Record<AcaoBaia, string> = {
  interditar: "A baia ficará indisponível para novas alocações até ser liberada.",
  liberar: "A interdição será encerrada e a baia voltará ao estado ativa.",
  inativar: "A baia sai da operação e permanece indisponível até reativação.",
  reativar: "A baia volta para a operação como ativa.",
  iniciar_higienizacao: "A baia entra em higienização e fica indisponível até a conclusão.",
  concluir_higienizacao: "A última higienização será registrada com o horário atual.",
};

const actionIcon: Record<AcaoBaia, React.ReactNode> = {
  interditar: <ShieldAlert aria-hidden="true" />,
  liberar: <Check aria-hidden="true" />,
  inativar: <Ban aria-hidden="true" />,
  reativar: <RefreshCw aria-hidden="true" />,
  iniciar_higienizacao: <Sparkles aria-hidden="true" />,
  concluir_higienizacao: <Check aria-hidden="true" />,
};

function allowedActions(baia: Baia): AcaoBaia[] {
  if (baia.ocupacao > 0) return [];
  if (baia.estado === "ativa") return ["iniciar_higienizacao", "interditar", "inativar"];
  if (baia.estado === "em_higienizacao") return ["concluir_higienizacao"];
  if (baia.estado === "interditada") return ["liberar", "inativar"];
  if (baia.estado === "inativa") return ["reativar"];
  return [];
}

function formFromBaia(baia: Baia): BaiaFormState {
  return {
    codigo: baia.codigo,
    setor: baia.setor,
    tipo: baia.tipo,
    capacidade: String(baia.capacidade),
    areaM2: baia.areaM2 == null ? "" : String(baia.areaM2),
    possuiSolario: baia.possuiSolario,
    exclusivaIsolamento: baia.exclusivaIsolamento,
  };
}

function payloadFromForm(form: BaiaFormState): CriarBaiaInput | Error {
  const capacidade = Number(form.capacidade);
  const area = form.areaM2.trim() ? Number(form.areaM2.replace(",", ".")) : undefined;
  if (!form.codigo.trim()) return new Error("Código é obrigatório.");
  if (!Number.isInteger(capacidade) || capacidade < 1) {
    return new Error("Capacidade deve ser um inteiro maior ou igual a 1.");
  }
  if (form.tipo === "individual" && capacidade !== 1) {
    return new Error("Baia individual deve ter capacidade exatamente 1.");
  }
  if (area !== undefined && (!Number.isFinite(area) || area <= 0)) {
    return new Error("Área deve ser maior que zero.");
  }
  return {
    codigo: form.codigo.trim(),
    setor: form.setor,
    tipo: form.tipo,
    capacidade,
    ...(area !== undefined ? { areaM2: area } : {}),
    possuiSolario: form.possuiSolario,
    exclusivaIsolamento: form.exclusivaIsolamento,
  };
}

function resumir(baias: Baia[]) {
  return {
    total: baias.length,
    livres: baias.filter((baia) => baia.estado === "ativa" && baia.ocupacao === 0).length,
    ocupadas: baias.filter((baia) => baia.ocupacao > 0).length,
    higienizacao: baias.filter((baia) => baia.estado === "em_higienizacao").length,
    interditadas: baias.filter((baia) => baia.estado === "interditada").length,
  };
}

function porSetorCodigo(a: Baia, b: Baia) {
  return a.setor.localeCompare(b.setor, "pt-BR") || a.codigoNormalizado.localeCompare(b.codigoNormalizado, "pt-BR");
}

function formatarData(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNumber(value: string | number) {
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function eventIcon(tipo: string): LucideIcon {
  if (tipo === "baia_criada") return Plus;
  if (tipo === "baia_editada") return Edit3;
  if (tipo.includes("higienizacao")) return Sparkles;
  if (tipo.endsWith("interditar")) return Ban;
  if (tipo.endsWith("inativar")) return DoorOpen;
  if (tipo.endsWith("liberar") || tipo.endsWith("reativar")) return Check;
  return History;
}

function eventTone(tipo: string): "ok" | "info" | "crit" | "muted" {
  if (tipo.endsWith("inativar")) return "muted";
  if (tipo.endsWith("interditar")) return "crit";
  if (tipo.includes("higienizacao") && !tipo.includes("concluida")) return "info";
  if (tipo.endsWith("liberar") || tipo.endsWith("reativar") || tipo.includes("concluida")) return "ok";
  return "info";
}

function formatEventType(tipo: string) {
  return tipo
    .replace(/^baia_/, "")
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function resumirEvento(dados: unknown) {
  if (!dados || typeof dados !== "object") return "Sem resumo.";
  const obj = dados as Record<string, unknown>;
  if (typeof obj.observacao === "string" && obj.observacao.trim()) return obj.observacao;
  if (typeof obj.estadoAnterior === "string" && typeof obj.estadoNovo === "string") {
    return `${estadoLabel[obj.estadoAnterior as EstadoBaia] ?? obj.estadoAnterior} → ${estadoLabel[obj.estadoNovo as EstadoBaia] ?? obj.estadoNovo}`;
  }
  if ("depois" in obj) return "Cadastro atualizado no registro sanitário.";
  return "Evento registrado.";
}
