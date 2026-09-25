"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { ControlSelect } from "@/components/control-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

  function selecionar(id: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("baia", String(id));
    router.replace(`/painel/baias?${next.toString()}`, { scroll: false });
  }

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
    <div className="baias-page">
      <div className="baias-head">
        <div>
          <h1>Baias</h1>
          <p className="lede">
            Cadastro, situação operacional, ocupação e histórico das baias do CCZ.
          </p>
        </div>
        <div className="baias-head-actions">
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

      <section className="baias-metrics" aria-label="Indicadores de baias">
        <Metric label="Baias" value={indicadores.total} />
        <Metric label="Livres" value={indicadores.livres} tone="ok" />
        <Metric label="Ocupadas" value={indicadores.ocupadas} tone="info" />
        <Metric label="Higienização" value={indicadores.higienizacao} tone="info" />
        <Metric label="Interditadas" value={indicadores.interditadas} tone="crit" />
      </section>

      <div className="baias-board">
        <section className="panel baias-workbench" aria-label="Consulta de baias">
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
          detalheErro ? (
            <section className="panel baia-detail">
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
          )
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
    <div className="filter-panel">
      <div className="filter-search-row">
        <div className="field baias-search">
          <Label htmlFor="baia-busca">Buscar código</Label>
          <div className="search-wrap">
            <Search aria-hidden="true" />
            <Input
              id="baia-busca"
              value={filtros.busca ?? ""}
              placeholder="Ex.: C-01"
              className="mono pl-10"
              onChange={(event) => onFiltro({ ...filtros, busca: event.target.value || undefined })}
            />
          </div>
        </div>
        <div className="filter-search-actions">
          <Button type="button" variant={filtrosAbertos ? "default" : "outline"} onClick={() => setFiltrosAbertos((open) => !open)}>
            <SlidersHorizontal aria-hidden="true" />
            Filtros
          </Button>
          <div className="view-switch" role="group" aria-label="Visualização">
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
        <div className="filter-grid">
          <div className="field">
            <Label htmlFor="baia-setor">Setor</Label>
            <ControlSelect
              id="baia-setor"
              value={filtros.setor ?? FILTER_ALL}
              onValueChange={(value) => onFiltro({ ...filtros, setor: value === FILTER_ALL ? undefined : (value as SetorBaia) })}
              options={[{ value: FILTER_ALL, label: "Todos" }, ...setores.map((setor) => ({ value: setor, label: setorLabel[setor] }))]}
            />
          </div>
          <div className="field">
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
        <ul className="filter-chips">
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
    <div className="baia-list" role="list" aria-label="Lista de baias">
      {baias.map((baia) => (
        <button
          key={baia.id}
          type="button"
          className="baia-row"
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
    <div className="baia-map" aria-label="Mapa esquemático de baias">
      {grupos.map((grupo) => (
        <section key={grupo.setor} className="baia-map-sector">
          <h2>{setorLabel[grupo.setor]}</h2>
          <div className="baia-map-grid">
            {grupo.baias.map((baia) => (
              <button
                key={baia.id}
                type="button"
                className="baia-tile"
                data-estado={baia.estado}
                aria-current={baia.id === selectedId ? "true" : undefined}
                onClick={() => onSelect(baia.id)}
              >
                <strong className="mono">{baia.codigo}</strong>
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
    <section className="panel baia-detail" aria-label={`Detalhes da baia ${baia.codigo}`}>
      <div className="detail-top">
        <BaiaIdentity baia={baia} />
        <div className="detail-actions">
          <StatusBadge estado={baia.estado} />
          {podeAdministrar ? (
            <Button type="button" variant="outline" onClick={() => onEdit(baia)}>
              <Edit3 aria-hidden="true" />
              Editar
            </Button>
          ) : null}
        </div>
      </div>
      <dl className="meta">
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

      <section className="detail-section">
        <h2>Ocupantes</h2>
        {baia.ocupantes.length === 0 ? (
          <p className="hint">Nenhum ocupante vinculado a esta baia.</p>
        ) : (
          <div className="occupant-list">
            {baia.ocupantes.map((ocupante) => (
              <div key={ocupante.id} className="occupant">
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
        <section className="detail-section">
          <div className="section-title">
            <History aria-hidden="true" />
            <h2>Histórico</h2>
          </div>
          {erroHistorico ? <p className="error-text">{erroHistorico}</p> : null}
          {historico === null ? <HistoricoSkeleton /> : null}
          {historico?.length === 0 ? <p className="hint">Nenhum evento registrado.</p> : null}
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
    <section className="detail-section">
      <h2>Ações operacionais</h2>
      <form className="action-form" onSubmit={submit}>
        <div className="action-grid" role="group" aria-label="Ações permitidas">
          {acoes.map((item) => (
            <button
              key={item}
              type="button"
              className="action-choice"
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
        {acoes.length === 0 ? <p className="hint">Nenhuma ação disponível para o estado atual.</p> : null}
        {acao ? (
          <>
            <div className="field">
              <Label htmlFor="acao-observacao">Observação da ação (opcional)</Label>
              <Input
                id="acao-observacao"
                maxLength={500}
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
              />
            </div>
            <p className="hint">{actionImpact[acao]}</p>
          </>
        ) : null}
        {erro ? <p className="error-text">{erro}</p> : null}
        {ok ? (
          <Alert variant="success" role="status">
            <AlertDescription className="text-inherit">{ok}</AlertDescription>
          </Alert>
        ) : null}
        <div className="actions">
          <Button type="submit" disabled={!acao || pending}>
            {pending ? <Loader2 className="spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
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
    <div className="drawer-shell" role="presentation">
      <button className="drawer-scrim" type="button" aria-label="Fechar formulário" onClick={onClose} />
      <aside className="baia-drawer" aria-label={editing ? "Editar baia" : "Nova baia"}>
        <div className="drawer-top">
          <div>
            <h2>{editing ? "Editar baia" : "Nova baia"}</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
        </div>
        <form className="drawer-form" onSubmit={submit}>
          <div className="field">
            <Label htmlFor="codigo-baia">Código</Label>
            <Input
              id="codigo-baia"
              className="mono"
              maxLength={40}
              value={form.codigo}
              aria-invalid={erro?.toLowerCase().includes("código") ? true : undefined}
              onChange={(event) => setForm({ ...form, codigo: event.target.value })}
            />
          </div>
          <div className="row-2">
            <div className="field">
              <Label htmlFor="setor-baia">Setor</Label>
              <ControlSelect
                id="setor-baia"
                value={form.setor}
                onValueChange={(value) => setForm({ ...form, setor: value as SetorBaia })}
                options={setores.map((setor) => ({ value: setor, label: setorLabel[setor] }))}
              />
            </div>
            <div className="field">
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
          <div className="row-2">
            <div className="field">
              <Label htmlFor="capacidade-baia">Capacidade</Label>
              <Input
                id="capacidade-baia"
                className="mono"
                inputMode="numeric"
                value={form.capacidade}
                disabled={form.tipo === "individual"}
                onChange={(event) => setForm({ ...form, capacidade: event.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div className="field">
              <Label htmlFor="area-baia">Área em m² (opcional)</Label>
              <Input
                id="area-baia"
                className="mono"
                inputMode="decimal"
                value={form.areaM2}
                onChange={(event) => setForm({ ...form, areaM2: event.target.value })}
              />
            </div>
          </div>
          <label className="checkline">
            <Checkbox
              checked={form.possuiSolario}
              onCheckedChange={(checked) => setForm({ ...form, possuiSolario: checked === true })}
            />
            Possui solário
          </label>
          <label className="checkline">
            <Checkbox
              checked={form.exclusivaIsolamento}
              onCheckedChange={(checked) => setForm({ ...form, exclusivaIsolamento: checked === true })}
            />
            Uso exclusivo para isolamento
          </label>
          {erro ? <p className="error-text">{erro}</p> : null}
          <div className="actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
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
    <div className="metric" data-tone={tone}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function BaiaIdentity({ baia }: { baia: Baia }) {
  return (
    <div className="baia-identity">
      <strong className="mono">{baia.codigo}</strong>
      <span>
        {setorLabel[baia.setor]} · {tipoLabel[baia.tipo]}
      </span>
    </div>
  );
}

function StatusBadge({ estado }: { estado: EstadoBaia }) {
  return (
    <span className="status-badge" data-estado={estado}>
      {estadoLabel[estado]}
    </span>
  );
}

function Occupancy({ baia }: { baia: Baia }) {
  return (
    <div className="occupancy" aria-label={`${baia.ocupacao} de ${baia.capacidade} vagas ocupadas`}>
      <span>
        {baia.ocupacao}/{baia.capacidade}
      </span>
      <meter min={0} max={baia.capacidade} value={baia.ocupacao} />
    </div>
  );
}

function Historico({ eventos }: { eventos: BaiaHistoricoEvento[] }) {
  return (
    <ol className="history-list">
      {eventos.map((evento) => (
        <li key={evento.id} data-tone={eventTone(evento.tipo)}>
          <div>
            <strong>{formatEventType(evento.tipo)}</strong>
            <span>{formatarData(evento.createdAt)}</span>
          </div>
          <p>{evento.usuario?.nome ?? "Sistema"}</p>
          <small>{resumirEvento(evento.dados)}</small>
        </li>
      ))}
    </ol>
  );
}

function BaiasSkeleton() {
  return (
    <div className="baia-list" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}

function BaiaDetalheSkeleton() {
  return (
    <section className="panel baia-detail" aria-hidden="true">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </section>
  );
}

function HistoricoSkeleton() {
  return (
    <div className="stack" aria-hidden="true">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

function EmptyState({ podeAdministrar, onCreate }: { podeAdministrar: boolean; onCreate: () => void }) {
  return (
    <div className="detail-empty">
      <DoorOpen aria-hidden="true" />
      <h2>Nenhuma baia encontrada</h2>
      <p className="hint">Ajuste os filtros ou cadastre a primeira baia do setor.</p>
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
