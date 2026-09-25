"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Cat,
  Check,
  ChevronLeft,
  ChevronRight,
  Dog,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { Combobox } from "@/components/combobox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ControlSelect } from "@/components/control-select";
import { AnimalPhoto } from "@/components/animal-photo";
import { PhotoPicker } from "@/components/photo-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Shell } from "@/components/shell";
import {
  ApiError,
  adicionarFotoAnimal,
  alocarAnimal,
  atualizarAnimal,
  criarAnimal,
  criarRacaAnimal,
  getCurrentUser,
  listarBaias,
  listarAnimais,
  listarRacasAnimais,
  removerFotoAnimal,
  type Animal,
  type AtualizarAnimalInput,
  type Baia,
  type CriarAnimalInput,
  type EspecieAnimal,
  type ListaAnimais,
  type ListarAnimaisFiltros,
  type PorteAnimal,
  type RacaAnimal,
  type SexoAnimal,
  type SituacaoAnimal,
  type StatusCastracaoAnimal,
  type UnidadeIdadeAnimal,
} from "@/lib/api";
import { canManageAnimais } from "@/lib/access";
import { opcoesRaca, racaFormValue } from "@/lib/raca-options";

const especies: EspecieAnimal[] = ["cao", "gato"];
const sexos: SexoAnimal[] = ["macho", "femea", "nao_informado"];
const portes: PorteAnimal[] = ["pequeno", "medio", "grande", "nao_informado"];
const situacoes: SituacaoAnimal[] = ["em_tratamento", "em_quarentena_observacao", "saudavel", "adotado", "obito"];
const castracoes: StatusCastracaoAnimal[] = ["sim", "nao", "nao_informado"];
const unidadesIdade: UnidadeIdadeAnimal[] = ["dias", "meses", "anos"];

const especieLabel: Record<EspecieAnimal, string> = {
  cao: "Cão",
  gato: "Gato",
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

const situacaoLabel: Record<SituacaoAnimal, string> = {
  em_tratamento: "Em tratamento",
  em_quarentena_observacao: "Quarentena/observação",
  saudavel: "Saudável",
  adotado: "Adotado",
  obito: "Óbito",
};

const castradoLabel: Record<StatusCastracaoAnimal, string> = {
  sim: "Castrado",
  nao: "Não castrado",
  nao_informado: "Não informado",
};

const filtrosIniciais: ListarAnimaisFiltros = { pagina: 1, limite: 12 };
const MAX_FOTOS = 10;
const FILTER_ALL = "__all__";

type FormStep = 0 | 1 | 2 | 3 | 4;

type AnimalFormState = {
  nome: string;
  numeroRegistro: string;
  especie: EspecieAnimal;
  racaId: string;
  novaRaca: string;
  sexo: SexoAnimal;
  porte: PorteAnimal;
  corPelagem: string;
  castrado: StatusCastracaoAnimal;
  pesoAtualKg: string;
  dataNascimento: string;
  idadeEstimadaQuantidade: string;
  idadeEstimadaUnidade: UnidadeIdadeAnimal;
  idadeAproximada: boolean;
  nasceuNoCcz: boolean;
  dataAcolhimento: string;
  acolhidoPor: string;
  situacao: Exclude<SituacaoAnimal, "adotado">;
  emIsolamento: boolean;
  baiaId: string;
  observacaoAlocacao: string;
};

const formInicial: AnimalFormState = {
  nome: "",
  numeroRegistro: "",
  especie: "cao",
  racaId: "",
  novaRaca: "",
  sexo: "nao_informado",
  porte: "nao_informado",
  corPelagem: "",
  castrado: "nao_informado",
  pesoAtualKg: "",
  dataNascimento: "",
  idadeEstimadaQuantidade: "",
  idadeEstimadaUnidade: "meses",
  idadeAproximada: true,
  nasceuNoCcz: false,
  dataAcolhimento: "",
  acolhidoPor: "",
  situacao: "em_tratamento",
  emIsolamento: false,
  baiaId: "",
  observacaoAlocacao: "",
};

export default function Page() {
  return (
    <Shell section="animais" title="Animais">
      <Animais />
    </Shell>
  );
}

function Animais() {
  const user = getCurrentUser();
  const podeAdministrar = user ? canManageAnimais(user.perfilAcesso) : false;
  const [resultado, setResultado] = useState<ListaAnimais | null>(null);
  const [filtros, setFiltros] = useState<ListarAnimaisFiltros>(filtrosIniciais);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Animal | null>(null);
  const [baias, setBaias] = useState<Baia[]>([]);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  useEffect(() => {
    void carregar(filtros);
  }, [filtros]);

  useEffect(() => {
    let cancelled = false;
    listarBaias()
      .then((items) => {
        if (!cancelled) setBaias(items);
      })
      .catch(() => {
        if (!cancelled) setBaias([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const indicadores = useMemo(() => {
    const items = resultado?.items ?? [];
    return {
      total: resultado?.total ?? 0,
      semBaia: items.filter((animal) => animal.baiaId == null).length,
      comAlertas: items.filter((animal) => animal.alertas.length > 0).length,
    };
  }, [resultado]);

  const paginaAtual = resultado?.pagina ?? filtros.pagina ?? 1;
  const limiteAtual = resultado?.limite ?? filtros.limite ?? 12;
  const totalPaginas = Math.max(1, Math.ceil((resultado?.total ?? 0) / limiteAtual));
  const temItensNaPagina = Boolean(resultado && resultado.items.length > 0);
  const primeiroItem = temItensNaPagina ? (paginaAtual - 1) * limiteAtual + 1 : 0;
  const ultimoItem = temItensNaPagina && resultado ? Math.min(resultado.total, (paginaAtual - 1) * limiteAtual + resultado.items.length) : 0;
  const temFiltro = temFiltrosAtivos(filtros);

  async function carregar(nextFiltros = filtros) {
    setLoading(true);
    setErro(null);
    try {
      setResultado(await listarAnimais(nextFiltros));
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível carregar os animais.");
      setResultado(null);
    } finally {
      setLoading(false);
    }
  }

  function atualizarFiltros(next: ListarAnimaisFiltros) {
    setFiltros({ ...next, pagina: 1, limite: filtros.limite ?? 12 });
  }

  function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    atualizarFiltros({ ...filtros, busca: busca.trim() || undefined });
  }

  function limparFiltros() {
    setBusca("");
    setFiltros(filtrosIniciais);
  }

  function mudarPagina(pagina: number) {
    setFiltros((atual) => ({ ...atual, pagina: Math.max(1, Math.min(totalPaginas, pagina)) }));
  }

  function abrirCadastro() {
    setEditing(null);
    setFormOpen(true);
  }

  function abrirEdicao(animal: Animal) {
    setEditing(animal);
    setFormOpen(true);
  }

  async function concluirFormulario(saved: Animal) {
    setFormOpen(false);
    setEditing(null);
    await carregar(filtros);
    if (editing?.id === saved.id) {
      setResultado((atual) =>
        atual ? { ...atual, items: atual.items.map((item) => (item.id === saved.id ? saved : item)) } : atual,
      );
    }
  }

  return (
    <div className="[display:flex] [flex-direction:column] [gap:20px] [width:100%]">
      <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:16px] max-[760px]:[flex-direction:column]">
        <div>
          <h1>Animais</h1>
          <p className="[color:var(--muted)] [max-width:62ch]">
            Consulta do plantel acolhido, localização em baias e pendências principais.
          </p>
        </div>
        <div className="[display:flex] [align-items:center] [gap:10px] [flex-wrap:wrap] [justify-content:flex-end] max-[760px]:[width:100%] max-[760px]:[justify-content:stretch] max-[760px]:[&>*]:[flex:1]">
          <Button variant="outline" type="button" onClick={() => void carregar(filtros)}>
            <RefreshCw aria-hidden="true" />
            Atualizar
          </Button>
          {podeAdministrar ? (
            <Button type="button" onClick={abrirCadastro}>
              <Plus aria-hidden="true" />
              Novo animal
            </Button>
          ) : null}
        </div>
      </div>

      {erro ? (
        <Alert variant="destructive">
          <AlertDescription className="text-inherit">{erro}</AlertDescription>
        </Alert>
      ) : null}

      <section className="[display:grid] [grid-template-columns:repeat(5,_minmax(0,_1fr))] [gap:10px] max-[760px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]" aria-label="Indicadores de animais">
        <Metric label="Animais" value={indicadores.total} />
        <Metric label="Nesta página" value={resultado?.items.length ?? 0} tone="info" />
        <Metric label="Sem baia" value={indicadores.semBaia} tone="warn" />
        <Metric label="Com alertas" value={indicadores.comAlertas} tone="crit" />
      </section>

      <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)] [overflow:clip]" aria-label="Consulta de animais">
        <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] [&_h2]:[margin:0] [&_h2]:[font-size:17px] [&>svg]:[width:22px] [&>svg]:[height:22px] [&>svg]:[color:var(--primary)] [&_svg]:[color:var(--primary)]">
          <div>
            <h2>Plantel operacional</h2>
          </div>
          <SlidersHorizontal aria-hidden="true" />
        </div>

        <form className="[display:flex] [flex-direction:column] [gap:14px]" onSubmit={buscar}>
          <div className="[display:grid] [grid-template-columns:minmax(240px,_1fr)_auto] [align-items:end] [gap:12px] max-[760px]:[grid-template-columns:1fr]">
            <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600] [grid-column:span_2]">
              <Label htmlFor="animal-busca">Buscar nome ou registro</Label>
              <div className="[position:relative] [&_svg]:[position:absolute] [&_svg]:[left:12px] [&_svg]:[top:50%] [&_svg]:[width:18px] [&_svg]:[height:18px] [&_svg]:[color:var(--muted)] [&_svg]:[transform:translateY(-50%)] [&_svg]:[pointer-events:none]">
                <Search aria-hidden="true" />
                <Input
                  id="animal-busca"
                  value={busca}
                  placeholder="Ex.: Mel ou ANI-001"
                  className="pl-10"
                  onChange={(event) => setBusca(event.target.value)}
                />
              </div>
            </div>
            <div className="[display:flex] [flex-wrap:wrap] [align-items:center] [justify-content:flex-end] [gap:12px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[&>*]:[width:100%]">
              <Button type="submit">
                <Search aria-hidden="true" />
                Buscar
              </Button>
              <Button type="button" variant={filtrosAbertos ? "default" : "outline"} onClick={() => setFiltrosAbertos((open) => !open)}>
                <SlidersHorizontal aria-hidden="true" />
                Filtros
              </Button>
              <Button type="button" variant="outline" disabled={!temFiltro && !busca.trim()} onClick={limparFiltros}>
                <X aria-hidden="true" />
                Limpar
              </Button>
            </div>
          </div>

          {filtrosAbertos ? (
            <div className="[display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:12px] [padding:12px] [border:1px_solid_var(--line)] [border-radius:10px] [background:var(--bg)] min-[761px]:max-[1023px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[760px]:[grid-template-columns:1fr]">
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-especie">Espécie</Label>
                <ControlSelect
                  id="animal-especie"
                  value={filtros.especie ?? FILTER_ALL}
                  onValueChange={(value) => atualizarFiltros({ ...filtros, especie: valorEnum<EspecieAnimal>(value === FILTER_ALL ? "" : value) })}
                  options={[{ value: FILTER_ALL, label: "Todas" }, ...especies.map((especie) => ({ value: especie, label: especieLabel[especie] }))]}
                />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-situacao">Situação</Label>
                <ControlSelect
                  id="animal-situacao"
                  value={filtros.situacao ?? FILTER_ALL}
                  onValueChange={(value) => {
                    const situacao = valorEnum<SituacaoAnimal>(value === FILTER_ALL ? "" : value);
                    atualizarFiltros({
                      ...filtros,
                      situacao,
                      incluirTerminais: situacao === "adotado" || situacao === "obito" ? true : filtros.incluirTerminais,
                    });
                  }}
                  options={[{ value: FILTER_ALL, label: "Operacionais" }, ...situacoes.map((situacao) => ({ value: situacao, label: situacaoLabel[situacao] }))]}
                />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-sexo">Sexo</Label>
                <ControlSelect
                  id="animal-sexo"
                  value={filtros.sexo ?? FILTER_ALL}
                  onValueChange={(value) => atualizarFiltros({ ...filtros, sexo: valorEnum<SexoAnimal>(value === FILTER_ALL ? "" : value) })}
                  options={[{ value: FILTER_ALL, label: "Todos" }, ...sexos.map((sexo) => ({ value: sexo, label: sexoLabel[sexo] }))]}
                />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-porte">Porte</Label>
                <ControlSelect
                  id="animal-porte"
                  value={filtros.porte ?? FILTER_ALL}
                  onValueChange={(value) => atualizarFiltros({ ...filtros, porte: valorEnum<PorteAnimal>(value === FILTER_ALL ? "" : value) })}
                  options={[{ value: FILTER_ALL, label: "Todos" }, ...portes.map((porte) => ({ value: porte, label: porteLabel[porte] }))]}
                />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-castracao">Castração</Label>
                <ControlSelect
                  id="animal-castracao"
                  value={filtros.castrado ?? FILTER_ALL}
                  onValueChange={(value) => atualizarFiltros({ ...filtros, castrado: valorEnum<StatusCastracaoAnimal>(value === FILTER_ALL ? "" : value) })}
                  options={[{ value: FILTER_ALL, label: "Todas" }, ...castracoes.map((castracao) => ({ value: castracao, label: castradoLabel[castracao] }))]}
                />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-baia">Baia</Label>
                <ControlSelect
                  id="animal-baia"
                  value={filtros.semBaia ? FILTER_ALL : filtros.baiaId ? String(filtros.baiaId) : FILTER_ALL}
                  disabled={Boolean(filtros.semBaia)}
                  onValueChange={(value) => atualizarFiltros({ ...filtros, baiaId: value === FILTER_ALL ? undefined : Number(value) })}
                  options={[
                    { value: FILTER_ALL, label: "Todas" },
                    ...baias.map((baia) => ({ value: String(baia.id), label: `${baia.codigo} · ${baia.ocupacao}/${baia.capacidade}` })),
                  ]}
                />
              </div>
              <div className="[display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:8px] [grid-column:1_/_-1] max-[760px]:[grid-template-columns:1fr]" aria-label="Filtros rápidos">
                <CheckFilter
                  id="animal-sem-baia"
                  label="Sem baia"
                  checked={Boolean(filtros.semBaia)}
                  onCheckedChange={(checked) => atualizarFiltros({ ...filtros, semBaia: checked || undefined, baiaId: undefined })}
                />
                <CheckFilter
                  id="animal-alertas"
                  label="Com alertas"
                  checked={Boolean(filtros.comAlertas)}
                  onCheckedChange={(checked) => atualizarFiltros({ ...filtros, comAlertas: checked || undefined })}
                />
                <CheckFilter
                  id="animal-terminais"
                  label="Incluir terminais"
                  checked={Boolean(filtros.incluirTerminais)}
                  onCheckedChange={(checked) => atualizarFiltros({ ...filtros, incluirTerminais: checked || undefined })}
                />
              </div>
            </div>
          ) : null}

          {temFiltro ? (
            <ul className="[display:flex] [flex-wrap:wrap] [gap:8px] [margin:0] [padding:0] [list-style:none] [&_li]:[border:1px_solid_var(--line)] [&_li]:[border-radius:999px] [&_li]:[background:#fff] [&_li]:[color:var(--primary-700)] [&_li]:[padding:4px_10px] [&_li]:[font:700_12px/1.2_var(--body)]">
              {chipsFiltro(filtros, baias).map((chip) => (
                <li key={chip}>{chip}</li>
              ))}
            </ul>
          ) : null}
        </form>

        {loading ? <AnimaisSkeleton /> : null}

        {!loading && !erro && resultado?.items.length === 0 ? (
          <div className="[min-width:0] [min-height:100%] [flex:1] [min-height:220px] [display:grid] [place-items:center] [align-content:center] [gap:10px] [text-align:center] [&>svg]:[width:22px] [&>svg]:[height:22px] [&>svg]:[color:var(--primary)] min-[761px]:max-[1023px]:[min-height:0]">
            <AlertCircle aria-hidden="true" />
            <div>
              <h2>Nenhum animal encontrado</h2>
              <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">
                Ajuste os filtros ou inclua situações terminais para consultar adotados e óbitos.
              </p>
            </div>
          </div>
        ) : null}

        {!loading && resultado && resultado.items.length > 0 ? (
          <div className="[display:flex] [flex-direction:column] [gap:8px]">
            {resultado.items.map((animal) => (
              <AnimalRow key={animal.id} animal={animal} podeEditar={podeAdministrar && !animal.somenteLeitura} onEdit={abrirEdicao} />
            ))}
          </div>
        ) : null}

        {!loading && resultado ? (
          <div className="[border-top:1px_solid_var(--line)] [padding-top:14px] [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] max-[760px]:[align-items:stretch] max-[760px]:[flex-direction:column]" aria-label="Paginação de animais">
            <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">
              {resultado.total === 0
                ? "Nenhum resultado"
                : temItensNaPagina
                  ? `${primeiroItem}-${ultimoItem} de ${resultado.total} resultado(s)`
                  : `Página sem itens de ${resultado.total} resultado(s)`}
            </p>
            <div className="[display:flex] [align-items:center] [gap:8px] [flex-wrap:wrap] max-[760px]:[align-items:stretch] max-[760px]:[flex-direction:column] max-[760px]:[&>*]:[width:100%]">
              <Button
                type="button"
                variant="outline"
                disabled={paginaAtual <= 1}
                onClick={() => mudarPagina(paginaAtual - 1)}
              >
                <ChevronLeft aria-hidden="true" />
                Anterior
              </Button>
              <span className="[color:var(--muted)] [font:700_13px/1_var(--body)] [white-space:nowrap]" aria-live="polite">
                Página {paginaAtual} de {totalPaginas}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={paginaAtual >= totalPaginas}
                onClick={() => mudarPagina(paginaAtual + 1)}
              >
                Próxima
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {formOpen ? (
        <AnimalFormDrawer
          animal={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={concluirFormulario}
        />
      ) : null}
    </div>
  );
}

function AnimalRow({ animal, podeEditar, onEdit }: { animal: Animal; podeEditar: boolean; onEdit: (animal: Animal) => void }) {
  const foto = animal.fotos.find((item) => item.identificacao) ?? animal.fotos[0];
  const Icon = animal.especie === "cao" ? Dog : Cat;
  const alertaTexto =
    animal.alertas.length === 0
      ? "Sem alertas"
      : `${animal.alertas.length} alerta${animal.alertas.length === 1 ? "" : "s"}`;

  return (
    <div className="[width:100%] [min-height:84px] [border:1px_solid_var(--line)] [border-radius:8px] [background:#fff] [color:var(--ink)] [padding:12px] [display:grid] [grid-template-columns:minmax(0,_1fr)_auto_auto] [align-items:center] [gap:12px] hover:[border-color:var(--primary)] hover:[background:var(--primary-50)] focus-visible:[border-color:var(--primary)] focus-visible:[background:var(--primary-50)] has-[[data-detail=open]]:[border-color:var(--primary)] has-[[data-detail=open]]:[box-shadow:var(--focus)] max-[760px]:[grid-template-columns:1fr] max-[760px]:[align-items:start]">
      <Link className="[min-width:0] [color:var(--ink)] [display:grid] [grid-template-columns:60px_minmax(0,_1fr)_auto_minmax(84px,_120px)] [align-items:center] [gap:12px] [text-decoration:none] max-[760px]:[grid-template-columns:52px_minmax(0,_1fr)] max-[760px]:[align-items:start]" href={`/painel/animais/${animal.id}`} aria-label={`Abrir ficha de ${animal.nome}`}>
        <span className="[width:60px] [height:60px] [border-radius:8px] [background:var(--primary-50)] [color:var(--primary)] [display:grid] [place-items:center] [overflow:hidden] [&_img]:[width:100%] [&_img]:[height:100%] [&_img]:[object-fit:cover] [&_svg]:[width:26px] [&_svg]:[height:26px] max-[760px]:[width:52px] max-[760px]:[height:52px]" aria-hidden="true">
          {foto ? <AnimalPhoto foto={foto} alt="" /> : <Icon />}
        </span>
        <span className="[min-width:0] [display:flex] [flex-direction:column] [gap:2px] [&_strong]:[font-size:17px] [&_span]:[color:var(--muted)] [&_span]:[font-size:13px] [&_small]:[color:var(--muted)] [&_small]:[font-size:13px] [&>*]:[overflow-wrap:anywhere]">
          <strong>{animal.nome}</strong>
          <small className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]">{animal.numeroRegistro}</small>
          <span>
            {animal.raca?.nome ?? "Raça não informada"} · {especieLabel[animal.especie]} · {sexoLabel[animal.sexo]}
          </span>
        </span>
        <span className="[min-height:28px] [border-radius:999px] [padding:6px_10px] [display:inline-flex] [align-items:center] [justify-content:center] [width:fit-content] [font:700_12px/1_var(--body)] [white-space:nowrap] data-[estado=ativa]:[background:var(--ok-50)] data-[estado=ativa]:[color:var(--ok)] data-[estado=em\_higienizacao]:[background:var(--info-50)] data-[estado=em\_higienizacao]:[color:var(--info)] data-[estado=interditada]:[background:var(--crit-50)] data-[estado=interditada]:[color:var(--crit)] data-[estado=inativa]:[background:var(--bg)] data-[estado=inativa]:[color:var(--muted)] data-[estado=inativa]:[border:1px_solid_var(--line)] data-[estado=em\_tratamento]:[background:var(--info-50)] data-[estado=em\_tratamento]:[color:var(--info)] data-[estado=em\_quarentena\_observacao]:[background:var(--info-50)] data-[estado=em\_quarentena\_observacao]:[color:var(--info)] data-[estado=saudavel]:[background:var(--ok-50)] data-[estado=saudavel]:[color:var(--ok)] data-[estado=adotado]:[background:var(--primary-50)] data-[estado=adotado]:[color:var(--primary-700)] data-[estado=obito]:[background:var(--bg)] data-[estado=obito]:[color:var(--muted)] data-[estado=obito]:[border:1px_solid_var(--line)] max-[760px]:[grid-column:2] max-[760px]:[align-items:flex-start] max-[760px]:[text-align:left]" data-estado={animal.situacao}>
          {situacaoLabel[animal.situacao]}
        </span>
        <span className="[&_small]:[color:var(--muted)] [&_small]:[font-size:13px] [display:flex] [flex-direction:column] [align-items:flex-end] [gap:2px] [text-align:right] [&_b]:[font-family:var(--mono)] [&_b]:[font-size:13px] max-[760px]:[grid-column:2] max-[760px]:[align-items:flex-start] max-[760px]:[text-align:left]">
          <b>{animal.baia?.codigo ?? "Sem baia"}</b>
        </span>
      </Link>
      {animal.alertas.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="[display:inline-flex] [align-items:center] [justify-content:flex-end] [gap:4px] [min-height:32px] [border:0] [background:transparent] [font:500_13px/1.2_var(--body)] [white-space:nowrap] [cursor:pointer] [color:var(--warn)] [font-weight:700] [&_svg]:[width:14px] [&_svg]:[height:14px] [&_svg]:[flex:none] max-[760px]:[justify-content:flex-start]">
              <AlertTriangle aria-hidden="true" />
              {alertaTexto}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <ul className="[margin:0] [padding-left:16px] [display:flex] [flex-direction:column] [gap:4px]">
              {animal.alertas.map((alerta) => (
                <li key={`${alerta.tipo}-${alerta.mensagem}`}>{alerta.mensagem}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      ) : (
        <small className="[display:inline-flex] [align-items:center] [justify-content:flex-end] [gap:4px] [min-height:32px] [border:0] [background:transparent] [font:500_13px/1.2_var(--body)] [white-space:nowrap] [color:var(--muted)] max-[760px]:[justify-content:flex-start]">{alertaTexto}</small>
      )}
      {podeEditar ? (
        <Button type="button" variant="outline" className="[align-self:center] max-[760px]:[width:100%]" onClick={() => onEdit(animal)}>
          <Edit3 aria-hidden="true" />
          Editar
        </Button>
      ) : null}
    </div>
  );
}

function AnimalFormDrawer({
  animal,
  onClose,
  onSaved,
}: {
  animal: Animal | null;
  onClose: () => void;
  onSaved: (animal: Animal) => void | Promise<void>;
}) {
  const editando = Boolean(animal);
  const [step, setStep] = useState<FormStep>(0);
  const [form, setForm] = useState<AnimalFormState>(() => estadoDoAnimal(animal));
  const [racas, setRacas] = useState<RacaAnimal[]>([]);
  const [baias, setBaias] = useState<Baia[]>([]);
  const [fotosExistentes, setFotosExistentes] = useState(() => animal?.fotos ?? []);
  const [fotosNovas, setFotosNovas] = useState<File[]>([]);
  const fotosNovasRef = useRef<File[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removeExistenteId, setRemoveExistenteId] = useState<number | null>(null);
  const [removeNovaIndex, setRemoveNovaIndex] = useState<number | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    listarBaias()
      .then((items) => {
        if (!cancelled) setBaias(items);
      })
      .catch(() => {
        if (!cancelled) setBaias([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fotosNovasRef.current = fotosNovas;
  }, [fotosNovas]);

  useEffect(() => {
    return () => {
      fotosNovasRef.current.forEach((foto) => URL.revokeObjectURL(previewUrl(foto)));
    };
  }, []);

  const totalFotos = fotosExistentes.length + fotosNovas.length;
  const stepError = validarStep(form, step);
  const podeAvancar = !stepError;

  function update<K extends keyof AnimalFormState>(key: K, value: AnimalFormState[K]) {
    setForm((atual) => ({ ...atual, [key]: value }));
    setErro(null);
  }

  function avancar() {
    if (!podeAvancar) {
      setErro(stepError);
      return;
    }
    setErro(null);
    setStep((atual) => Math.min(4, atual + 1) as FormStep);
  }

  async function confirmarRemocaoExistente() {
    if (!animal || removeExistenteId == null) return;
    const fotoId = removeExistenteId;
    setRemoveExistenteId(null);
    setSaving(true);
    setErro(null);
    try {
      await removerFotoAnimal(animal.id, fotoId);
      setFotosExistentes((atuais) => atuais.filter((foto) => foto.id !== fotoId));
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível remover a foto.");
    } finally {
      setSaving(false);
    }
  }

  function adicionarFotos(files: File[]) {
    if (!files.length) return;
    const vagas = MAX_FOTOS - totalFotos;
    if (vagas <= 0) {
      setErro("A galeria aceita no máximo 10 fotos.");
      return;
    }
    setFotosNovas((atuais) => [...atuais, ...files.slice(0, vagas)]);
    if (files.length > vagas) setErro("Algumas fotos não foram incluídas porque o limite é 10.");
  }

  function confirmarRemocaoNova() {
    if (removeNovaIndex == null) return;
    const index = removeNovaIndex;
    setRemoveNovaIndex(null);
    setFotosNovas((atuais) => {
      const removida = atuais[index];
      if (removida) URL.revokeObjectURL(previewUrl(removida));
      return atuais.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function salvar() {
    const finalError = validarTudo(form);
    if (finalError) {
      setErro(finalError);
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      const racaId = await resolverRacaId(form, racas);
      const saved = animal
        ? await atualizarAnimal(animal.id, payloadAtualizacao(form, racaId))
        : await criarAnimal(payloadCriacao(form, racaId));
      const withBaia = await sincronizarBaia(saved, form, animal?.baiaId ?? null);
      let finalAnimal = withBaia;
      for (const foto of fotosNovas) {
        const criada = await adicionarFotoAnimal(withBaia.id, foto);
        finalAnimal = { ...finalAnimal, fotos: [...finalAnimal.fotos, criada] };
      }
      await onSaved(finalAnimal);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar o animal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="[max-width:min(760px,_calc(100vw_-_2rem))] [max-height:90vh] [overflow:auto] [gap:16px]" showCloseButton={false}>
        <DialogHeader>
          <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] [&_h2]:[margin:0] [&_h2]:[font-size:22px]">
            <div>
              <DialogTitle>{editando ? "Editar animal" : "Novo animal"}</DialogTitle>
              <DialogDescription>Etapa {step + 1} de 5 · {formSteps[step]}</DialogDescription>
            </div>
            <Button type="button" variant="outline" onClick={onClose}>
              <X aria-hidden="true" />
              Fechar
            </Button>
          </div>
        </DialogHeader>

        <ol className="[margin:0] [padding:0] [list-style:none] [display:grid] [grid-template-columns:repeat(5,_minmax(0,_1fr))] [gap:8px] [&_li]:[min-width:0] [&_li]:[border:1px_solid_var(--line)] [&_li]:[border-radius:8px] [&_li]:[background:#fff] [&_li]:[padding:8px] [&_li]:[color:var(--muted)] [&_li]:[font:700_12px/1.2_var(--body)] [&_li]:[display:flex] [&_li]:[align-items:center] [&_li]:[gap:6px] [&_span]:[width:22px] [&_span]:[height:22px] [&_span]:[border-radius:50%] [&_span]:[background:var(--bg)] [&_span]:[color:var(--muted)] [&_span]:[display:grid] [&_span]:[place-items:center] [&_span]:[flex:none] [&_span]:[font-size:12px] [&_svg]:[width:14px] [&_svg]:[height:14px] [&_li]:[border-color:var(--primary)] [&_li]:[background:var(--primary-50)] [&_li]:[color:var(--primary-700)] [&_li_span]:[background:var(--primary)] [&_li_span]:[color:#fff] max-[760px]:[grid-template-columns:1fr]" aria-label="Etapas do formulário">
          {formSteps.map((label, index) => (
            <li key={label} data-active={index === step} data-done={index < step}>
              <span>{index < step ? <Check aria-hidden="true" /> : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        {erro ? (
          <Alert variant="destructive">
            <AlertDescription className="text-inherit">{erro}</AlertDescription>
          </Alert>
        ) : null}

        <form className="[display:flex] [flex-direction:column] [gap:14px] [min-height:0]" onSubmit={(event) => event.preventDefault()}>
          {step === 0 ? (
            <div className="[display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px] max-[760px]:[grid-template-columns:1fr]">
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-nome">Nome <em className="[color:var(--crit)] [font-style:normal]">*</em></Label>
                <Input id="animal-form-nome" value={form.nome} maxLength={120} onChange={(event) => update("nome", event.target.value)} />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-registro">Número de registro <em className="[color:var(--crit)] [font-style:normal]">*</em></Label>
                <Input id="animal-form-registro" className="[font-family:var(--mono)] [font-size:14px]" value={form.numeroRegistro} maxLength={60} onChange={(event) => update("numeroRegistro", event.target.value)} />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-especie">Espécie</Label>
                <ControlSelect
                  id="animal-form-especie"
                  value={form.especie}
                  onValueChange={(value) => {
                    update("especie", value as EspecieAnimal);
                    update("racaId", "");
                  }}
                  options={especies.map((especie) => ({ value: especie, label: especieLabel[especie] }))}
                />
              </div>
              <RacaFields form={form} racas={racas} onUpdate={update} />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="[display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px] max-[760px]:[grid-template-columns:1fr]">
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-sexo">Sexo</Label>
                <ControlSelect id="animal-form-sexo" value={form.sexo} onValueChange={(value) => update("sexo", value as SexoAnimal)} options={sexos.map((sexo) => ({ value: sexo, label: sexoLabel[sexo] }))} />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-porte">Porte</Label>
                <ControlSelect id="animal-form-porte" value={form.porte} onValueChange={(value) => update("porte", value as PorteAnimal)} options={portes.map((porte) => ({ value: porte, label: porteLabel[porte] }))} />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-pelagem">Cor/pelagem</Label>
                <Input id="animal-form-pelagem" value={form.corPelagem} maxLength={80} onChange={(event) => update("corPelagem", event.target.value)} />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-castrado">Castração</Label>
                <ControlSelect id="animal-form-castrado" value={form.castrado} onValueChange={(value) => update("castrado", value as StatusCastracaoAnimal)} options={castracoes.map((castracao) => ({ value: castracao, label: castradoLabel[castracao] }))} />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-peso">Peso atual em kg</Label>
                <Input id="animal-form-peso" type="number" min="0.001" step="0.001" inputMode="decimal" value={form.pesoAtualKg} onChange={(event) => update("pesoAtualKg", event.target.value)} />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-nascimento">Data de nascimento</Label>
                <Input id="animal-form-nascimento" type="date" value={form.dataNascimento} onChange={(event) => update("dataNascimento", event.target.value)} />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-idade-qtd">Idade estimada</Label>
                <Input id="animal-form-idade-qtd" type="number" min="0" step="1" inputMode="numeric" value={form.idadeEstimadaQuantidade} onChange={(event) => update("idadeEstimadaQuantidade", event.target.value)} />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-idade-unidade">Unidade</Label>
                <ControlSelect id="animal-form-idade-unidade" value={form.idadeEstimadaUnidade} onValueChange={(value) => update("idadeEstimadaUnidade", value as UnidadeIdadeAnimal)} options={unidadesIdade.map((unidade) => ({ value: unidade, label: unidadeLabel(unidade) }))} />
              </div>
              <BinarySwitch id="animal-form-idade-aprox" label="Idade aproximada" checked={form.idadeAproximada} onCheckedChange={(checked) => update("idadeAproximada", checked)} />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="[display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px] max-[760px]:[grid-template-columns:1fr]">
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-acolhimento">Data de acolhimento <em className="[color:var(--crit)] [font-style:normal]">*</em></Label>
                <Input id="animal-form-acolhimento" type="date" value={form.dataAcolhimento} onChange={(event) => update("dataAcolhimento", event.target.value)} />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-acolhido-por">Acolhido por</Label>
                <Input id="animal-form-acolhido-por" value={form.acolhidoPor} maxLength={120} onChange={(event) => update("acolhidoPor", event.target.value)} />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-situacao">Situação</Label>
                <ControlSelect
                  id="animal-form-situacao"
                  value={form.situacao}
                  onValueChange={(value) => update("situacao", value as AnimalFormState["situacao"])}
                  options={situacoes.filter((situacao) => situacao !== "adotado").map((situacao) => ({ value: situacao, label: situacaoLabel[situacao] }))}
                />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
                <Label htmlFor="animal-form-baia">Baia</Label>
                <ControlSelect
                  id="animal-form-baia"
                  value={form.baiaId || "none"}
                  onValueChange={(value) => update("baiaId", value === "none" ? "" : value)}
                  options={[
                    { value: "none", label: "Sem baia" },
                    ...baias.map((baia) => ({ value: String(baia.id), label: `${baia.codigo} · ${baia.ocupacao}/${baia.capacidade}` })),
                  ]}
                />
              </div>
              <BinarySwitch id="animal-form-nasceu" label="Nasceu no CCZ" checked={form.nasceuNoCcz} onCheckedChange={(checked) => update("nasceuNoCcz", checked)} />
              <BinarySwitch id="animal-form-isolamento" label="Em isolamento clínico" checked={form.emIsolamento} onCheckedChange={(checked) => update("emIsolamento", checked)} />
              <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]" style={{ gridColumn: "1 / -1" }}>
                <Label htmlFor="animal-form-alocacao-obs">Observação da alocação</Label>
                <Input id="animal-form-alocacao-obs" value={form.observacaoAlocacao} onChange={(event) => update("observacaoAlocacao", event.target.value)} />
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <FotoStep
              fotosExistentes={fotosExistentes}
              fotosNovas={fotosNovas}
              totalFotos={totalFotos}
              onAdd={adicionarFotos}
              onRemoveNova={setRemoveNovaIndex}
              onRemoveExistente={setRemoveExistenteId}
            />
          ) : null}

          {step === 4 ? <ReviewStep form={form} racas={racas} baias={baias} totalFotos={totalFotos} /> : null}
        </form>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" disabled={step === 0 || saving} onClick={() => setStep((atual) => Math.max(0, atual - 1) as FormStep)}>
            <ChevronLeft aria-hidden="true" />
            Voltar
          </Button>
          {step < 4 ? (
            <Button type="button" disabled={saving} onClick={avancar}>
              Avançar
              <ChevronRight aria-hidden="true" />
            </Button>
          ) : (
            <Button type="button" disabled={saving} onClick={() => void salvar()}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
              {editando ? "Salvar edição" : "Cadastrar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={removeExistenteId != null}
      title="Remover foto"
      description="Remover esta foto da galeria?"
      confirmLabel="Remover"
      onOpenChange={(open) => { if (!open) setRemoveExistenteId(null); }}
      onConfirm={() => void confirmarRemocaoExistente()}
    />
    <ConfirmDialog
      open={removeNovaIndex != null}
      title="Remover foto"
      description="Remover esta foto da seleção?"
      confirmLabel="Remover"
      onOpenChange={(open) => { if (!open) setRemoveNovaIndex(null); }}
      onConfirm={confirmarRemocaoNova}
    />
    </>
  );
}

const formSteps = ["Identificação", "Características", "Acolhimento", "Fotos", "Revisão"];

function RacaFields({
  form,
  racas,
  onUpdate,
}: {
  form: AnimalFormState;
  racas: RacaAnimal[];
  onUpdate: <K extends keyof AnimalFormState>(key: K, value: AnimalFormState[K]) => void;
}) {
  return (
    <>
      <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
        <Label htmlFor="animal-form-raca">Raça</Label>
        <Combobox
          id="animal-form-raca"
          value={form.racaId || "none"}
          searchPlaceholder="Filtrar raça"
          placeholder="Não informada"
          onChange={(value) => onUpdate("racaId", value === "none" ? "" : value)}
          options={opcoesRaca(racas)}
        />
      </div>
      {form.racaId === "nova" ? (
        <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
          <Label htmlFor="animal-form-nova-raca">Nome da raça</Label>
          <Input id="animal-form-nova-raca" value={form.novaRaca} maxLength={80} onChange={(event) => onUpdate("novaRaca", event.target.value)} />
        </div>
      ) : null}
    </>
  );
}

function FotoStep({
  fotosExistentes,
  fotosNovas,
  totalFotos,
  onAdd,
  onRemoveNova,
  onRemoveExistente,
}: {
  fotosExistentes: Animal["fotos"];
  fotosNovas: File[];
  totalFotos: number;
  onAdd: (files: File[]) => void;
  onRemoveNova: (index: number) => void;
  onRemoveExistente: (fotoId: number) => void;
}) {
  return (
    <div className="[display:flex] [flex-direction:column] [gap:14px]">
      <PhotoPicker
        remaining={MAX_FOTOS - totalFotos}
        hint={`${totalFotos}/${MAX_FOTOS} fotos. Recorte em quadrado e a API comprime quando necessário.`}
        onPicked={onAdd}
      />
      {totalFotos > 0 ? (
        <div className="[display:grid] [grid-template-columns:repeat(auto-fill,_minmax(124px,_1fr))] [gap:10px] [&_figure]:[margin:0] [&_figure]:[border:1px_solid_var(--line)] [&_figure]:[border-radius:8px] [&_figure]:[padding:8px] [&_figure]:[display:flex] [&_figure]:[flex-direction:column] [&_figure]:[gap:8px] [&_figure]:[background:#fff] [&_img]:[width:100%] [&_img]:[aspect-ratio:1_/_1] [&_img]:[object-fit:cover] [&_img]:[border-radius:6px] [&_img]:[background:var(--bg)] [&_figcaption]:[color:var(--muted)] [&_figcaption]:[font-size:12px] [&_figcaption]:[overflow-wrap:anywhere]">
          {fotosExistentes.map((foto) => (
            <figure key={foto.id}>
              <AnimalPhoto foto={foto} alt="" />
              <figcaption>{foto.identificacao ? "Identificação" : "Galeria"}</figcaption>
              <Button type="button" variant="outline" onClick={() => onRemoveExistente(foto.id)}>
                <Trash2 aria-hidden="true" />
                Remover
              </Button>
            </figure>
          ))}
          {fotosNovas.map((foto, index) => (
            <figure key={`${foto.name}-${foto.lastModified}-${index}`}>
              <img src={previewUrl(foto)} alt="" />
              <figcaption>{foto.name}</figcaption>
              <Button type="button" variant="outline" onClick={() => onRemoveNova(index)}>
                <Trash2 aria-hidden="true" />
                Remover
              </Button>
            </figure>
          ))}
        </div>
      ) : (
        <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Você pode cadastrar agora sem foto e completar a galeria depois.</p>
      )}
    </div>
  );
}

function ReviewStep({ form, racas, baias, totalFotos }: { form: AnimalFormState; racas: RacaAnimal[]; baias: Baia[]; totalFotos: number }) {
  const raca = form.racaId === "nova" ? form.novaRaca : racas.find((item) => String(item.id) === form.racaId)?.nome;
  const baia = baias.find((item) => String(item.id) === form.baiaId);
  return (
    <dl className="[display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px_16px] [margin:0] [&_div]:[display:flex] [&_div]:[flex-direction:column] [&_div]:[gap:2px] [&_dt]:[font-size:12px] [&_dt]:[font-weight:600] [&_dt]:[color:var(--muted)] [&_dd]:[margin:0] [&_dd]:[font-size:15px] max-[760px]:[grid-template-columns:1fr] [grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[760px]:[grid-template-columns:1fr]">
      <Info label="Nome" value={form.nome || "Não informado"} />
      <Info label="Registro" value={form.numeroRegistro || "Não informado"} />
      <Info label="Espécie" value={especieLabel[form.especie]} />
      <Info label="Raça" value={raca || "Não informada"} />
      <Info label="Sexo" value={sexoLabel[form.sexo]} />
      <Info label="Porte" value={porteLabel[form.porte]} />
      <Info label="Situação" value={situacaoLabel[form.situacao]} />
      <Info label="Data de acolhimento" value={form.dataAcolhimento || "Não informada"} />
      <Info label="Baia" value={baia?.codigo ?? "Sem baia"} />
      <Info label="Fotos" value={String(totalFotos)} />
    </dl>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function estadoDoAnimal(animal: Animal | null): AnimalFormState {
  if (!animal) return formInicial;
  return {
    nome: animal.nome,
    numeroRegistro: animal.numeroRegistro,
    especie: animal.especie,
    racaId: racaFormValue(animal),
    novaRaca: "",
    sexo: animal.sexo,
    porte: animal.porte,
    corPelagem: animal.corPelagem ?? "",
    castrado: animal.castrado,
    pesoAtualKg: animal.pesoAtualKg ? String(animal.pesoAtualKg) : "",
    dataNascimento: toDateInput(animal.dataNascimento),
    idadeEstimadaQuantidade: animal.idadeEstimadaQuantidade != null ? String(animal.idadeEstimadaQuantidade) : "",
    idadeEstimadaUnidade: animal.idadeEstimadaUnidade ?? "meses",
    idadeAproximada: animal.idadeAproximada,
    nasceuNoCcz: animal.nasceuNoCcz,
    dataAcolhimento: toDateInput(animal.dataAcolhimento),
    acolhidoPor: animal.acolhidoPor ?? "",
    situacao: animal.situacao === "adotado" ? "em_tratamento" : animal.situacao,
    emIsolamento: animal.emIsolamento,
    baiaId: animal.baiaId ? String(animal.baiaId) : "",
    observacaoAlocacao: "",
  };
}

function validarStep(form: AnimalFormState, step: FormStep) {
  if (step === 0) {
    if (!form.nome.trim()) return "Informe o nome do animal.";
    if (!form.numeroRegistro.trim()) return "Informe o número de registro.";
    if (form.racaId === "nova" && !form.novaRaca.trim()) return "Informe o nome da nova raça.";
  }
  if (step === 1) {
    if (form.pesoAtualKg && Number(form.pesoAtualKg) <= 0) return "O peso deve ser maior que zero.";
    if (form.idadeEstimadaQuantidade && Number(form.idadeEstimadaQuantidade) < 0) return "A idade estimada não pode ser negativa.";
  }
  if (step === 2) {
    if (!form.dataAcolhimento && !(form.nasceuNoCcz && form.dataNascimento)) return "Informe a data de acolhimento.";
  }
  return null;
}

function validarTudo(form: AnimalFormState) {
  for (const step of [0, 1, 2, 3, 4] as FormStep[]) {
    const erro = validarStep(form, step);
    if (erro) return erro;
  }
  return null;
}

async function resolverRacaId(form: AnimalFormState, racas: RacaAnimal[]) {
  if (form.racaId === "nova") {
    const nome = form.novaRaca.trim();
    const existente = racas.find((raca) => raca.nome.localeCompare(nome, "pt-BR", { sensitivity: "base" }) === 0);
    if (existente) return existente.id;
    const criada = await criarRacaAnimal({ especie: form.especie, nome });
    return criada.id;
  }
  return form.racaId ? Number(form.racaId) : undefined;
}

function payloadCriacao(form: AnimalFormState, racaId: number | undefined): CriarAnimalInput {
  return limparPayload({
    nome: form.nome.trim(),
    numeroRegistro: form.numeroRegistro.trim(),
    especie: form.especie,
    racaId,
    sexo: form.sexo,
    porte: form.porte,
    corPelagem: form.corPelagem.trim() || undefined,
    situacao: form.situacao,
    emIsolamento: form.emIsolamento,
    castrado: form.castrado,
    pesoAtualKg: numeroOpcional(form.pesoAtualKg),
    dataAcolhimento: dateOrUndefined(form.dataAcolhimento),
    dataNascimento: dateOrUndefined(form.dataNascimento),
    idadeEstimadaQuantidade: inteiroOpcional(form.idadeEstimadaQuantidade),
    idadeEstimadaUnidade: form.idadeEstimadaQuantidade ? form.idadeEstimadaUnidade : undefined,
    idadeAproximada: form.idadeAproximada,
    nasceuNoCcz: form.nasceuNoCcz,
    acolhidoPor: form.acolhidoPor.trim() || undefined,
  });
}

function payloadAtualizacao(form: AnimalFormState, racaId: number | undefined): AtualizarAnimalInput {
  return {
    nome: form.nome.trim(),
    numeroRegistro: form.numeroRegistro.trim(),
    especie: form.especie,
    racaId: racaId ?? null,
    sexo: form.sexo,
    porte: form.porte,
    corPelagem: form.corPelagem.trim() || null,
    situacao: form.situacao,
    emIsolamento: form.emIsolamento,
    castrado: form.castrado,
    pesoAtualKg: numeroOuNull(form.pesoAtualKg),
    dataAcolhimento: dateOrNull(form.dataAcolhimento),
    dataNascimento: dateOrNull(form.dataNascimento),
    idadeEstimadaQuantidade: inteiroOuNull(form.idadeEstimadaQuantidade),
    idadeEstimadaUnidade: form.idadeEstimadaQuantidade ? form.idadeEstimadaUnidade : null,
    idadeAproximada: form.idadeAproximada,
    nasceuNoCcz: form.nasceuNoCcz,
    acolhidoPor: form.acolhidoPor.trim() || null,
  };
}

async function sincronizarBaia(animal: Animal, form: AnimalFormState, baiaOriginalId: number | null) {
  const baiaId = form.baiaId ? Number(form.baiaId) : null;
  if (baiaId === baiaOriginalId) return animal;
  return alocarAnimal(animal.id, {
    baiaId,
    observacao: form.observacaoAlocacao.trim() || undefined,
  });
}

function limparPayload<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined && value !== "")) as T;
}

function numeroOpcional(value: string) {
  return value ? Number(value) : undefined;
}

function numeroOuNull(value: string) {
  return value ? Number(value) : null;
}

function inteiroOpcional(value: string) {
  return value ? Number.parseInt(value, 10) : undefined;
}

function inteiroOuNull(value: string) {
  return value ? Number.parseInt(value, 10) : null;
}

function dateOrUndefined(value: string) {
  return value ? `${value}T12:00:00.000Z` : undefined;
}

function dateOrNull(value: string) {
  return value ? `${value}T12:00:00.000Z` : null;
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function unidadeLabel(unidade: UnidadeIdadeAnimal) {
  const labels: Record<UnidadeIdadeAnimal, string> = {
    dias: "Dia(s)",
    meses: "Mês(es)",
    anos: "Ano(s)",
  };
  return labels[unidade];
}

const previewUrls = new WeakMap<File, string>();

function previewUrl(file: File) {
  const atual = previewUrls.get(file);
  if (atual) return atual;
  const url = URL.createObjectURL(file);
  previewUrls.set(file, url);
  return url;
}

function BinarySwitch({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-[13px]">
      <Label className="min-w-0 flex-1 leading-snug" htmlFor={id}>{label}</Label>
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-xs font-semibold text-[var(--muted)]">{checked ? "Sim" : "Não"}</span>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      </span>
    </div>
  );
}

function CheckFilter({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="[min-height:42px] [display:flex] [align-items:center] [gap:10px] [color:var(--ink)] [font-weight:600] [min-height:42px] [border:1px_solid_var(--line)] [border-radius:8px] [background:#fff] [padding:8px_10px] [font-size:13px]" htmlFor={id}>
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      {label}
    </label>
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

function valorEnum<T extends string>(value: string): T | undefined {
  return value ? (value as T) : undefined;
}

function temFiltrosAtivos(filtros: ListarAnimaisFiltros) {
  return Boolean(
    filtros.busca?.trim() ||
      filtros.especie ||
      filtros.sexo ||
      filtros.porte ||
      filtros.situacao ||
      filtros.castrado ||
      filtros.baiaId ||
      filtros.semBaia ||
      filtros.comAlertas ||
      filtros.incluirTerminais,
  );
}

function chipsFiltro(filtros: ListarAnimaisFiltros, baias: Baia[]) {
  const chips: string[] = [];
  if (filtros.busca?.trim()) chips.push(`Busca: ${filtros.busca.trim()}`);
  if (filtros.especie) chips.push(especieLabel[filtros.especie]);
  if (filtros.situacao) chips.push(situacaoLabel[filtros.situacao]);
  if (filtros.sexo) chips.push(sexoLabel[filtros.sexo]);
  if (filtros.porte) chips.push(porteLabel[filtros.porte]);
  if (filtros.castrado) chips.push(castradoLabel[filtros.castrado]);
  if (filtros.semBaia) chips.push("Sem baia");
  else if (filtros.baiaId) chips.push(baias.find((baia) => baia.id === filtros.baiaId)?.codigo ?? `Baia ${filtros.baiaId}`);
  if (filtros.comAlertas) chips.push("Com alertas");
  if (filtros.incluirTerminais) chips.push("Incluir terminais");
  return chips;
}

function AnimaisSkeleton() {
  return (
    <div className="[display:flex] [flex-direction:column] [gap:12px]" aria-label="Carregando animais">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="[width:100%] [min-height:84px] [border:1px_solid_var(--line)] [border-radius:8px] [background:#fff] [color:var(--ink)] [padding:12px] [display:grid] [grid-template-columns:minmax(0,_1fr)_auto_auto] [align-items:center] [gap:12px] hover:[border-color:var(--primary)] hover:[background:var(--primary-50)] focus-visible:[border-color:var(--primary)] focus-visible:[background:var(--primary-50)] has-[[data-detail=open]]:[border-color:var(--primary)] has-[[data-detail=open]]:[box-shadow:var(--focus)] max-[760px]:[grid-template-columns:1fr] max-[760px]:[align-items:start] [pointer-events:none]" key={index}>
          <Skeleton className="[width:60px] [height:60px] [border-radius:8px] [background:var(--primary-50)] [color:var(--primary)] [display:grid] [place-items:center] [overflow:hidden] [&_img]:[width:100%] [&_img]:[height:100%] [&_img]:[object-fit:cover] [&_svg]:[width:26px] [&_svg]:[height:26px] max-[760px]:[width:52px] max-[760px]:[height:52px]" />
          <div className="[display:flex] [flex-direction:column] [gap:12px]">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}
