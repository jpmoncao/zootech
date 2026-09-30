"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AlarmClock, CalendarDays, CheckCircle2, Plus, Settings2, Syringe, UserX } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ControlSelect } from "@/components/control-select";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DialogoAgendamento } from "@/components/vacinacao/dialogo-agendamento";
import { DialogoBaixa } from "@/components/vacinacao/dialogo-baixa";
import { Selo, formatarInstante, type Tom } from "@/components/vacinacao/comum";
import { canManageCatalogoVacinas, canManageVacinacao } from "@/lib/access";
import {
  ApiError,
  cancelarAgendamento,
  getCurrentUser,
  listarAgenda,
  listarUsuarios,
  listarVacinas,
  marcarFaltaAgendamento,
  type AgendamentoVacinacao,
  type EspecieAnimal,
  type ListaAgenda,
  type PublicUser,
  type StatusAgendamentoVacinacao,
  type Vacina,
} from "@/lib/api";

const LIMITE = 20;

const statusLabel: Record<StatusAgendamentoVacinacao, string> = {
  agendado: "Agendado",
  aplicado: "Aplicado",
  faltou: "Faltou",
  cancelado: "Cancelado",
};

const statusTom: Record<StatusAgendamentoVacinacao, Tom> = {
  agendado: "info",
  aplicado: "ok",
  faltou: "warn",
  cancelado: "muted",
};

type Filtros = {
  busca: string;
  de: string;
  ate: string;
  vacinaId: string;
  especie: string;
  responsavelId: string;
  status: string;
  atrasados: boolean;
};

const FILTROS_VAZIOS: Filtros = {
  busca: "",
  de: "",
  ate: "",
  vacinaId: "",
  especie: "",
  responsavelId: "",
  status: "",
  atrasados: false,
};

function temFiltro(filtros: Filtros): boolean {
  return (
    filtros.busca.trim() !== "" ||
    filtros.de !== "" ||
    filtros.ate !== "" ||
    filtros.vacinaId !== "" ||
    filtros.especie !== "" ||
    filtros.responsavelId !== "" ||
    filtros.status !== "" ||
    filtros.atrasados
  );
}

/** Dia civil local do instante previsto, para agrupar a agenda por data. */
function diaDe(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR", { dateStyle: "full" });
}

export default function Page() {
  return (
    <Shell section="vacinacao" title="Agenda de vacinação">
      <Suspense fallback={<AgendaSkeleton />}>
        <Agenda />
      </Suspense>
    </Shell>
  );
}

function Agenda() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agendamentoNaUrl = searchParams.get("agendamento");

  const perfil = getCurrentUser()?.perfilAcesso ?? null;
  const usuarioAtual = getCurrentUser();
  const podeOperar = Boolean(perfil && canManageVacinacao(perfil));
  const podeVerCatalogo = Boolean(perfil);
  const podeListarUsuarios = Boolean(perfil && canManageCatalogoVacinas(perfil));

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState<ListaAgenda | null>(null);
  const [vacinas, setVacinas] = useState<Vacina[]>([]);
  const [usuarios, setUsuarios] = useState<Pick<PublicUser, "id" | "nome">[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoErro, setAcaoErro] = useState<string | null>(null);

  const [agendamentoAberto, setAgendamentoAberto] = useState(false);
  const [remarcando, setRemarcando] = useState<AgendamentoVacinacao | null>(null);
  const [baixando, setBaixando] = useState<AgendamentoVacinacao | null>(null);
  const [cancelando, setCancelando] = useState<AgendamentoVacinacao | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await listarAgenda({
        busca: filtros.busca.trim() || undefined,
        de: filtros.de ? new Date(`${filtros.de}T00:00:00`).toISOString() : undefined,
        ate: filtros.ate ? new Date(`${filtros.ate}T23:59:59`).toISOString() : undefined,
        vacinaId: filtros.vacinaId ? Number(filtros.vacinaId) : undefined,
        especie: (filtros.especie || undefined) as EspecieAnimal | undefined,
        responsavelId: filtros.responsavelId ? Number(filtros.responsavelId) : undefined,
        status: (filtros.status || undefined) as StatusAgendamentoVacinacao | undefined,
        atrasados: filtros.atrasados || undefined,
        pagina,
        limite: LIMITE,
      });
      setLista(dados);
    } catch (error) {
      setLista(null);
      setErro(error instanceof ApiError ? error.message : "Não foi possível carregar a agenda.");
    } finally {
      setCarregando(false);
    }
  }, [filtros, pagina]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    listarVacinas().then(setVacinas).catch(() => setVacinas([]));
    if (podeListarUsuarios) {
      listarUsuarios()
        .then((lista) => setUsuarios(lista.map((usuario) => ({ id: usuario.id, nome: usuario.nome }))))
        .catch(() => setUsuarios([]));
    }
  }, [podeListarUsuarios]);

  function atualizarFiltro<K extends keyof Filtros>(campo: K, valor: Filtros[K]) {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
    setPagina(1);
  }

  // O recurso aberto vive na URL: recarregar ou compartilhar o link reabre o mesmo agendamento.
  function abrirNaUrl(id: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === null) params.delete("agendamento");
    else params.set("agendamento", String(id));
    const query = params.toString();
    router.replace(query ? `/painel/vacinacao?${query}` : "/painel/vacinacao", { scroll: false });
  }

  const itens = lista?.items ?? [];
  const selecionado = useMemo(
    () => itens.find((item) => String(item.id) === agendamentoNaUrl) ?? null,
    [itens, agendamentoNaUrl],
  );

  const atrasados = itens.filter((item) => item.atrasado);
  const demais = itens.filter((item) => !item.atrasado);

  const porDia = useMemo(() => {
    const grupos = new Map<string, AgendamentoVacinacao[]>();
    for (const item of demais) {
      const dia = diaDe(item.dataHoraPrevista);
      const atual = grupos.get(dia) ?? [];
      atual.push(item);
      grupos.set(dia, atual);
    }
    return [...grupos.entries()];
  }, [demais]);

  async function faltou(agendamento: AgendamentoVacinacao) {
    setAcaoErro(null);
    try {
      await marcarFaltaAgendamento(agendamento.id);
      await carregar();
    } catch (error) {
      setAcaoErro(error instanceof ApiError ? error.message : "Não foi possível marcar a falta.");
    }
  }

  async function cancelarConfirmado() {
    if (!cancelando || !motivoCancelamento.trim()) return;
    setAcaoErro(null);
    try {
      await cancelarAgendamento(cancelando.id, motivoCancelamento.trim());
      await carregar();
    } catch (error) {
      setAcaoErro(error instanceof ApiError ? error.message : "Não foi possível cancelar o agendamento.");
    } finally {
      setCancelando(null);
      setMotivoCancelamento("");
    }
  }

  const totalPaginas = lista ? Math.max(1, Math.ceil(lista.total / LIMITE)) : 1;
  const comFiltro = temFiltro(filtros);

  return (
    <div className="[display:flex] [flex-direction:column] [gap:16px]">
      <section
        className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)]"
        aria-label="Filtros da agenda"
      >
        <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] [flex-wrap:wrap]">
          <div>
            <h2 className="[margin:0] [font-size:17px]">Agenda de vacinação</h2>
            <p className="[font-size:13px] [color:var(--muted)] [margin:4px_0_0]">
              {lista ? `${lista.total} agendamento(s)` : "Carregando…"}
              {lista && lista.atrasados > 0 ? ` · ${lista.atrasados} atrasado(s)` : ""}
            </p>
          </div>
          <div className="[display:flex] [gap:8px] [flex-wrap:wrap]">
            {podeVerCatalogo ? (
              <Button asChild variant="outline">
                <Link href="/painel/vacinacao/vacinas">
                  <Settings2 aria-hidden="true" />
                  Catálogo de vacinas
                </Link>
              </Button>
            ) : null}
            {podeOperar ? (
              <Button
                type="button"
                onClick={() => {
                  setRemarcando(null);
                  setAgendamentoAberto(true);
                }}
              >
                <Plus aria-hidden="true" />
                Novo agendamento
              </Button>
            ) : null}
          </div>
        </div>

        <div className="[display:grid] [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] [gap:12px]">
          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="agenda-busca">Animal</Label>
            <Input
              id="agenda-busca"
              value={filtros.busca}
              placeholder="Nome ou registro"
              onChange={(evento) => atualizarFiltro("busca", evento.target.value)}
            />
          </div>
          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="agenda-de">De</Label>
            <Input id="agenda-de" type="date" value={filtros.de} onChange={(evento) => atualizarFiltro("de", evento.target.value)} />
          </div>
          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="agenda-ate">Até</Label>
            <Input id="agenda-ate" type="date" value={filtros.ate} onChange={(evento) => atualizarFiltro("ate", evento.target.value)} />
          </div>
          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="agenda-vacina">Vacina</Label>
            <ControlSelect
              id="agenda-vacina"
              value={filtros.vacinaId}
              placeholder="Todas"
              onValueChange={(valor) => atualizarFiltro("vacinaId", valor === "todas" ? "" : valor)}
              options={[
                { value: "todas", label: "Todas" },
                ...vacinas.map((vacina) => ({ value: String(vacina.id), label: vacina.nome })),
              ]}
            />
          </div>
          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="agenda-especie">Espécie</Label>
            <ControlSelect
              id="agenda-especie"
              value={filtros.especie}
              placeholder="Todas"
              onValueChange={(valor) => atualizarFiltro("especie", valor === "todas" ? "" : valor)}
              options={[
                { value: "todas", label: "Todas" },
                { value: "cao", label: "Cão" },
                { value: "gato", label: "Gato" },
              ]}
            />
          </div>
          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="agenda-responsavel">Responsável</Label>
            <ControlSelect
              id="agenda-responsavel"
              value={filtros.responsavelId}
              placeholder="Todos"
              onValueChange={(valor) => atualizarFiltro("responsavelId", valor === "todos" ? "" : valor)}
              options={[
                { value: "todos", label: "Todos" },
                ...(usuarioAtual ? [{ value: String(usuarioAtual.id), label: "Eu" }] : []),
                ...usuarios
                  .filter((usuario) => usuario.id !== usuarioAtual?.id)
                  .map((usuario) => ({ value: String(usuario.id), label: usuario.nome })),
              ]}
            />
          </div>
          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="agenda-status">Situação</Label>
            <ControlSelect
              id="agenda-status"
              value={filtros.atrasados ? "atrasados" : filtros.status}
              placeholder="Todas"
              onValueChange={(valor) => {
                if (valor === "atrasados") {
                  setFiltros((atual) => ({ ...atual, atrasados: true, status: "" }));
                } else {
                  setFiltros((atual) => ({ ...atual, atrasados: false, status: valor === "todas" ? "" : valor }));
                }
                setPagina(1);
              }}
              options={[
                { value: "todas", label: "Todas" },
                { value: "atrasados", label: "Só atrasados" },
                ...(Object.keys(statusLabel) as StatusAgendamentoVacinacao[]).map((status) => ({
                  value: status,
                  label: statusLabel[status],
                })),
              ]}
            />
          </div>
        </div>

        {comFiltro ? (
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() => {
              setFiltros(FILTROS_VAZIOS);
              setPagina(1);
            }}
          >
            Limpar filtros
          </Button>
        ) : null}
      </section>

      {acaoErro ? <p className="[color:var(--crit)] [font-size:13px] [font-weight:600]">{acaoErro}</p> : null}

      {carregando ? <AgendaSkeleton /> : null}

      {!carregando && erro ? (
        <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:12px] [align-items:flex-start] [box-shadow:var(--shadow)]">
          <p className="[color:var(--crit)] [font-weight:600] [margin:0]">{erro}</p>
          <Button type="button" variant="outline" onClick={() => void carregar()}>
            Tentar de novo
          </Button>
        </section>
      ) : null}

      {!carregando && !erro && itens.length === 0 ? (
        <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:32px_20px] [display:flex] [flex-direction:column] [gap:10px] [align-items:center] [text-align:center] [box-shadow:var(--shadow)]">
          <CalendarDays aria-hidden="true" className="[color:var(--muted)]" />
          {/* Dois estados vazios distintos: sem dados no período ou filtro sem resultado. */}
          {comFiltro ? (
            <>
              <strong>Nenhum resultado para os filtros</strong>
              <p className="[color:var(--muted)] [margin:0] [font-size:13px]">
                Nenhum agendamento combina com os filtros aplicados. Ajuste ou limpe os filtros.
              </p>
              <Button type="button" variant="outline" onClick={() => setFiltros(FILTROS_VAZIOS)}>
                Limpar filtros
              </Button>
            </>
          ) : (
            <>
              <strong>Nada agendado no período</strong>
              <p className="[color:var(--muted)] [margin:0] [font-size:13px]">
                {podeOperar
                  ? "Crie um agendamento ou registre a aplicação direto na ficha do animal."
                  : "Quando a equipe clínica agendar uma vacinação, ela aparece aqui."}
              </p>
            </>
          )}
        </section>
      ) : null}

      {!carregando && !erro && atrasados.length > 0 ? (
        <section
          className="[background:var(--warn-50)] [border:1px_solid_#f1d5a6] [border-radius:10px] [padding:16px_20px] [display:flex] [flex-direction:column] [gap:12px]"
          aria-label="Agendamentos atrasados"
        >
          <div className="[display:flex] [align-items:center] [gap:8px] [color:#6b3f00]">
            <AlarmClock aria-hidden="true" />
            <strong>
              {atrasados.length === 1 ? "1 agendamento atrasado" : `${atrasados.length} agendamentos atrasados`}
            </strong>
          </div>
          <ul className="[margin:0] [padding:0] [list-style:none] [display:flex] [flex-direction:column] [gap:10px]">
            {atrasados.map((item) => (
              <LinhaAgendamento
                key={item.id}
                agendamento={item}
                selecionado={selecionado?.id === item.id}
                podeOperar={podeOperar}
                onAbrir={abrirNaUrl}
                onBaixar={setBaixando}
                onRemarcar={(alvo) => {
                  setRemarcando(alvo);
                  setAgendamentoAberto(true);
                }}
                onFaltou={faltou}
                onCancelar={setCancelando}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {!carregando && !erro && porDia.length > 0
        ? porDia.map(([dia, doDia]) => (
            <section
              key={dia}
              className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:16px_20px] [display:flex] [flex-direction:column] [gap:12px] [box-shadow:var(--shadow)]"
              aria-label={`Agendamentos de ${dia}`}
            >
              <h3 className="[margin:0] [font-size:14px] [text-transform:capitalize]">{dia}</h3>
              <ul className="[margin:0] [padding:0] [list-style:none] [display:flex] [flex-direction:column] [gap:10px]">
                {doDia.map((item) => (
                  <LinhaAgendamento
                    key={item.id}
                    agendamento={item}
                    selecionado={selecionado?.id === item.id}
                    podeOperar={podeOperar}
                    onAbrir={abrirNaUrl}
                    onBaixar={setBaixando}
                    onRemarcar={(alvo) => {
                      setRemarcando(alvo);
                      setAgendamentoAberto(true);
                    }}
                    onFaltou={faltou}
                    onCancelar={setCancelando}
                  />
                ))}
              </ul>
            </section>
          ))
        : null}

      {!carregando && !erro && lista && lista.total > LIMITE ? (
        <div className="[display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [flex-wrap:wrap]">
          <span className="[font-size:13px] [color:var(--muted)]">
            Página {lista.pagina} de {totalPaginas}
          </span>
          <div className="[display:flex] [gap:8px]">
            <Button type="button" variant="outline" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}

      <DialogoAgendamento
        open={agendamentoAberto}
        vacinas={vacinas}
        usuarios={usuarios}
        usuarioAtual={usuarioAtual ? { id: usuarioAtual.id, nome: usuarioAtual.nome } : null}
        remarcando={remarcando}
        onOpenChange={(estado) => {
          setAgendamentoAberto(estado);
          if (!estado) setRemarcando(null);
        }}
        onSalvo={carregar}
      />

      <DialogoBaixa
        open={baixando !== null}
        agendamento={baixando}
        onOpenChange={(estado) => {
          if (!estado) setBaixando(null);
        }}
        onBaixado={carregar}
      />

      <ConfirmDialog
        open={cancelando !== null}
        title="Cancelar agendamento"
        description="O agendamento passa a cancelado e não volta atrás. Para reagendar, crie um novo. O motivo é obrigatório."
        confirmLabel="Cancelar agendamento"
        onOpenChange={(estado) => {
          if (!estado) {
            setCancelando(null);
            setMotivoCancelamento("");
          }
        }}
        onConfirm={() => void cancelarConfirmado()}
      >
        <div className="[display:flex] [flex-direction:column] [gap:6px]">
          <Label htmlFor="agenda-motivo-cancelamento">Motivo *</Label>
          <Input
            id="agenda-motivo-cancelamento"
            value={motivoCancelamento}
            maxLength={500}
            onChange={(evento) => setMotivoCancelamento(evento.target.value)}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}

function LinhaAgendamento({
  agendamento,
  selecionado,
  podeOperar,
  onAbrir,
  onBaixar,
  onRemarcar,
  onFaltou,
  onCancelar,
}: {
  agendamento: AgendamentoVacinacao;
  selecionado: boolean;
  podeOperar: boolean;
  onAbrir: (id: number | null) => void;
  onBaixar: (agendamento: AgendamentoVacinacao) => void;
  onRemarcar: (agendamento: AgendamentoVacinacao) => void;
  onFaltou: (agendamento: AgendamentoVacinacao) => Promise<void> | void;
  onCancelar: (agendamento: AgendamentoVacinacao) => void;
}) {
  const emAberto = agendamento.status === "agendado";
  return (
    <li
      className="[border:1px_solid_var(--line)] [border-radius:8px] [background:var(--surface)] [padding:12px] [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] [flex-wrap:wrap] data-[selecionado=true]:[border-color:var(--primary)] data-[selecionado=true]:[box-shadow:0_0_0_1px_var(--primary)]"
      data-selecionado={selecionado}
      onClick={() => onAbrir(selecionado ? null : agendamento.id)}
    >
      <div className="[display:flex] [flex-direction:column] [gap:6px] [min-width:0]">
        <div className="[display:flex] [align-items:center] [gap:8px] [flex-wrap:wrap]">
          <Link
            href={`/painel/animais/${agendamento.animalId}`}
            className="[font-weight:700] [color:var(--primary)] hover:[text-decoration:underline]"
            onClick={(evento) => evento.stopPropagation()}
          >
            {agendamento.animal.nome}
          </Link>
          <span className="[font-family:var(--mono)] [font-size:12px] [color:var(--muted)]">
            {agendamento.animal.numeroRegistro}
          </span>
          <Selo tom={statusTom[agendamento.status]}>{statusLabel[agendamento.status]}</Selo>
          {agendamento.atrasado ? <Selo tom="warn">Atrasado</Selo> : null}
        </div>
        <span className="[font-size:13px]">
          {agendamento.vacina.nome} · dose {agendamento.numeroDosePrevista} de {agendamento.dosesPrevistas} ·{" "}
          {formatarInstante(agendamento.dataHoraPrevista)}
        </span>
        <span className="[font-size:12px] [color:var(--muted)]">
          Responsável: {agendamento.responsavel?.nome ?? "não definido"}
          {agendamento.observacao ? ` · ${agendamento.observacao}` : ""}
          {agendamento.motivoCancelamento ? ` · motivo: ${agendamento.motivoCancelamento}` : ""}
        </span>
      </div>

      {podeOperar && emAberto ? (
        <div className="[display:flex] [gap:6px] [flex-wrap:wrap]" onClick={(evento) => evento.stopPropagation()}>
          <Button type="button" size="sm" onClick={() => onBaixar(agendamento)}>
            <Syringe aria-hidden="true" />
            Dar baixa
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onRemarcar(agendamento)}>
            <CalendarDays aria-hidden="true" />
            Remarcar
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void onFaltou(agendamento)}>
            <UserX aria-hidden="true" />
            Faltou
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onCancelar(agendamento)}>
            Cancelar
          </Button>
        </div>
      ) : agendamento.aplicacao ? (
        <span className="[display:flex] [align-items:center] [gap:6px] [font-size:12px] [color:var(--ok)]">
          <CheckCircle2 aria-hidden="true" />
          Dose {agendamento.aplicacao.numeroDose} em {agendamento.aplicacao.dataAplicacao}
        </span>
      ) : null}
    </li>
  );
}

function AgendaSkeleton() {
  return (
    <div className="[display:flex] [flex-direction:column] [gap:12px]">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
