"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, PackageOpen, Plus, Power, PowerOff, Settings2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ControlSelect } from "@/components/control-select";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BlocoAviso, Selo } from "@/components/vacinacao/comum";
import { canManageCatalogoVacinas } from "@/lib/access";
import {
  ApiError,
  atualizarVacina,
  criarVacina,
  getCurrentUser,
  inativarVacina,
  listarVacinas,
  reativarVacina,
  type CriarVacinaInput,
  type EspecieAnimal,
  type Vacina,
} from "@/lib/api";

type FormVacina = {
  nome: string;
  cao: boolean;
  gato: boolean;
  totalDoses: string;
  intervaloDosesDias: string;
  revacinacaoDias: string;
  diasAvisoProximaDose: string;
  idadeMinimaSemanas: string;
  fabricante: string;
  viaAplicacaoSugerida: string;
  obrigatoria: boolean;
  observacoes: string;
};

const FORM_VAZIO: FormVacina = {
  nome: "",
  cao: true,
  gato: false,
  totalDoses: "1",
  intervaloDosesDias: "",
  revacinacaoDias: "",
  diasAvisoProximaDose: "7",
  idadeMinimaSemanas: "",
  fabricante: "",
  viaAplicacaoSugerida: "",
  obrigatoria: false,
  observacoes: "",
};

function paraForm(vacina: Vacina): FormVacina {
  return {
    nome: vacina.nome,
    cao: vacina.especies.includes("cao"),
    gato: vacina.especies.includes("gato"),
    totalDoses: String(vacina.totalDoses),
    intervaloDosesDias: vacina.intervaloDosesDias === null ? "" : String(vacina.intervaloDosesDias),
    revacinacaoDias: vacina.revacinacaoDias === null ? "" : String(vacina.revacinacaoDias),
    diasAvisoProximaDose: String(vacina.diasAvisoProximaDose),
    idadeMinimaSemanas: vacina.idadeMinimaSemanas === null ? "" : String(vacina.idadeMinimaSemanas),
    fabricante: vacina.fabricante ?? "",
    viaAplicacaoSugerida: vacina.viaAplicacaoSugerida ?? "",
    obrigatoria: vacina.obrigatoria,
    observacoes: vacina.observacoes ?? "",
  };
}

function numeroOuNulo(valor: string): number | null {
  const limpo = valor.trim();
  return limpo === "" ? null : Number(limpo);
}

export default function Page() {
  return (
    <Shell section="vacinacao" title="Catálogo de vacinas">
      <Catalogo />
    </Shell>
  );
}

function Catalogo() {
  const perfil = getCurrentUser()?.perfilAcesso ?? null;
  const podeManter = Boolean(perfil && canManageCatalogoVacinas(perfil));

  const [vacinas, setVacinas] = useState<Vacina[]>([]);
  const [busca, setBusca] = useState("");
  const [mostrarInativas, setMostrarInativas] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoErro, setAcaoErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<Vacina | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [alternando, setAlternando] = useState<Vacina | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setVacinas(await listarVacinas({ busca: busca.trim() || undefined }));
    } catch (error) {
      setVacinas([]);
      setErro(error instanceof ApiError ? error.message : "Não foi possível carregar o catálogo.");
    } finally {
      setCarregando(false);
    }
  }, [busca]);

  useEffect(() => {
    const timer = setTimeout(() => void carregar(), 250);
    return () => clearTimeout(timer);
  }, [carregar]);

  async function alternarEstado() {
    if (!alternando) return;
    setAcaoErro(null);
    try {
      if (alternando.ativa) await inativarVacina(alternando.id);
      else await reativarVacina(alternando.id);
      await carregar();
    } catch (error) {
      setAcaoErro(error instanceof ApiError ? error.message : "Não foi possível alterar o estado da vacina.");
    } finally {
      setAlternando(null);
    }
  }

  const visiveis = mostrarInativas ? vacinas : vacinas.filter((vacina) => vacina.ativa);
  const temBusca = busca.trim() !== "";

  return (
    <div className="[display:flex] [flex-direction:column] [gap:16px]">
      <section
        className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)]"
        aria-label="Catálogo de vacinas"
      >
        <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] [flex-wrap:wrap]">
          <div>
            <h2 className="[margin:0] [font-size:17px]">Catálogo de vacinas</h2>
            <p className="[font-size:13px] [color:var(--muted)] [margin:4px_0_0]">
              {podeManter
                ? "Esquema de doses, intervalos e janela de aviso. Vacina não é excluída, é inativada."
                : "Somente consulta: manter o catálogo é da Coordenação."}
            </p>
          </div>
          <div className="[display:flex] [gap:8px] [flex-wrap:wrap]">
            <Button asChild variant="outline">
              <Link href="/painel/vacinacao">
                <ArrowLeft aria-hidden="true" />
                Voltar à agenda
              </Link>
            </Button>
            {podeManter ? (
              <Button
                type="button"
                onClick={() => {
                  setEditando(null);
                  setFormAberto(true);
                }}
              >
                <Plus aria-hidden="true" />
                Nova vacina
              </Button>
            ) : null}
          </div>
        </div>

        <div className="[display:grid] [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] [gap:12px] [align-items:end]">
          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            <Label htmlFor="catalogo-busca">Buscar</Label>
            <Input
              id="catalogo-busca"
              value={busca}
              placeholder="Nome da vacina"
              onChange={(evento) => setBusca(evento.target.value)}
            />
          </div>
          <label className="[display:flex] [align-items:center] [gap:8px] [font-size:13px] [height:38px]">
            <Checkbox checked={mostrarInativas} onCheckedChange={(marcado) => setMostrarInativas(marcado === true)} />
            <span>Mostrar inativas</span>
          </label>
        </div>
      </section>

      {acaoErro ? <p className="[color:var(--crit)] [font-size:13px] [font-weight:600]">{acaoErro}</p> : null}

      {carregando ? (
        <div className="[display:flex] [flex-direction:column] [gap:10px]">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}

      {!carregando && erro ? (
        <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:12px] [align-items:flex-start] [box-shadow:var(--shadow)]">
          <p className="[color:var(--crit)] [font-weight:600] [margin:0]">{erro}</p>
          <Button type="button" variant="outline" onClick={() => void carregar()}>
            Tentar de novo
          </Button>
        </section>
      ) : null}

      {!carregando && !erro && visiveis.length === 0 ? (
        <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:32px_20px] [display:flex] [flex-direction:column] [gap:10px] [align-items:center] [text-align:center] [box-shadow:var(--shadow)]">
          <PackageOpen aria-hidden="true" className="[color:var(--muted)]" />
          {temBusca || !mostrarInativas ? (
            <>
              <strong>Nenhum resultado para os filtros</strong>
              <p className="[color:var(--muted)] [margin:0] [font-size:13px]">Ajuste a busca ou mostre as inativas.</p>
            </>
          ) : (
            <>
              <strong>Catálogo vazio</strong>
              <p className="[color:var(--muted)] [margin:0] [font-size:13px]">
                {podeManter
                  ? "Cadastre as vacinas usadas pelo CCZ, com doses, intervalos e janela de aviso."
                  : "Quando a Coordenação cadastrar as vacinas, elas aparecem aqui."}
              </p>
            </>
          )}
        </section>
      ) : null}

      {!carregando && !erro && visiveis.length > 0 ? (
        <ul className="[margin:0] [padding:0] [list-style:none] [display:grid] [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))] [gap:12px]">
          {visiveis.map((vacina) => (
            <li
              key={vacina.id}
              className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:16px] [display:flex] [flex-direction:column] [gap:10px] [box-shadow:var(--shadow)]"
            >
              <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:10px] [flex-wrap:wrap]">
                <strong className="[font-size:15px]">{vacina.nome}</strong>
                <div className="[display:flex] [gap:6px] [flex-wrap:wrap]">
                  {vacina.obrigatoria ? <Selo tom="warn">Obrigatória</Selo> : null}
                  <Selo tom={vacina.ativa ? "ok" : "muted"}>{vacina.ativa ? "Ativa" : "Inativa"}</Selo>
                </div>
              </div>

              <dl className="[margin:0] [display:grid] [grid-template-columns:auto_1fr] [gap:4px_10px] [font-size:13px]">
                <dt className="[color:var(--muted)]">Espécies</dt>
                <dd className="[margin:0]">{vacina.especies.map((e) => (e === "cao" ? "Cão" : "Gato")).join(" e ")}</dd>
                <dt className="[color:var(--muted)]">Esquema</dt>
                <dd className="[margin:0]">
                  {vacina.totalDoses} dose(s)
                  {vacina.intervaloDosesDias !== null ? ` · intervalo ${vacina.intervaloDosesDias} dias` : ""}
                </dd>
                <dt className="[color:var(--muted)]">Revacinação</dt>
                <dd className="[margin:0]">
                  {vacina.revacinacaoDias !== null ? `a cada ${vacina.revacinacaoDias} dias` : "não se aplica"}
                </dd>
                <dt className="[color:var(--muted)]">Aviso</dt>
                <dd className="[margin:0]">
                  {vacina.diasAvisoProximaDose === 0
                    ? "só quando vence"
                    : `${vacina.diasAvisoProximaDose} dias antes`}
                </dd>
                {vacina.idadeMinimaSemanas !== null ? (
                  <>
                    <dt className="[color:var(--muted)]">Idade mínima</dt>
                    <dd className="[margin:0]">{vacina.idadeMinimaSemanas} semanas</dd>
                  </>
                ) : null}
                {vacina.fabricante ? (
                  <>
                    <dt className="[color:var(--muted)]">Fabricante</dt>
                    <dd className="[margin:0]">{vacina.fabricante}</dd>
                  </>
                ) : null}
              </dl>

              {vacina.observacoes ? (
                <p className="[font-size:13px] [color:var(--muted)] [margin:0]">{vacina.observacoes}</p>
              ) : null}

              {podeManter ? (
                <div className="[display:flex] [gap:8px] [flex-wrap:wrap]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditando(vacina);
                      setFormAberto(true);
                    }}
                  >
                    <Settings2 aria-hidden="true" />
                    Editar
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAlternando(vacina)}>
                    {vacina.ativa ? <PowerOff aria-hidden="true" /> : <Power aria-hidden="true" />}
                    {vacina.ativa ? "Inativar" : "Reativar"}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <FormularioVacina
        open={formAberto}
        vacina={editando}
        onOpenChange={(estado) => {
          setFormAberto(estado);
          if (!estado) setEditando(null);
        }}
        onSalvo={carregar}
      />

      <ConfirmDialog
        open={alternando !== null}
        title={alternando?.ativa ? "Inativar vacina" : "Reativar vacina"}
        description={
          alternando?.ativa
            ? "A vacina sai da seleção de novas aplicações e agendamentos. Os registros e protocolos existentes continuam intactos, e agendamentos já abertos ainda podem ser baixados."
            : "A vacina volta a aparecer na seleção de novas aplicações e agendamentos."
        }
        confirmLabel={alternando?.ativa ? "Inativar" : "Reativar"}
        confirmVariant={alternando?.ativa ? "destructive" : "default"}
        onOpenChange={(estado) => {
          if (!estado) setAlternando(null);
        }}
        onConfirm={() => void alternarEstado()}
      />
    </div>
  );
}

function FormularioVacina({
  open,
  vacina,
  onOpenChange,
  onSalvo,
}: {
  open: boolean;
  vacina: Vacina | null;
  onOpenChange: (open: boolean) => void;
  onSalvo: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<FormVacina>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avisoEsquema, setAvisoEsquema] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(vacina ? paraForm(vacina) : FORM_VAZIO);
    setErro(null);
    setAvisoEsquema(null);
    setSalvando(false);
  }, [open, vacina]);

  function atualizar<K extends keyof FormVacina>(campo: K, valor: FormVacina[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  const totalDoses = Number(form.totalDoses || "0");
  const precisaIntervalo = totalDoses > 1 && form.intervaloDosesDias.trim() === "";
  const semEspecie = !form.cao && !form.gato;
  const podeEnviar = form.nome.trim() !== "" && totalDoses >= 1 && !semEspecie && !precisaIntervalo && !salvando;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!podeEnviar) return;
    setSalvando(true);
    setErro(null);
    const especies: EspecieAnimal[] = [];
    if (form.cao) especies.push("cao");
    if (form.gato) especies.push("gato");
    const payload: CriarVacinaInput = {
      nome: form.nome.trim(),
      especies,
      totalDoses,
      intervaloDosesDias: numeroOuNulo(form.intervaloDosesDias),
      revacinacaoDias: numeroOuNulo(form.revacinacaoDias),
      diasAvisoProximaDose: Number(form.diasAvisoProximaDose || "0"),
      idadeMinimaSemanas: numeroOuNulo(form.idadeMinimaSemanas),
      fabricante: form.fabricante.trim() || null,
      viaAplicacaoSugerida: form.viaAplicacaoSugerida.trim() || null,
      obrigatoria: form.obrigatoria,
      observacoes: form.observacoes.trim() || null,
    };
    try {
      if (vacina) {
        const atualizada = await atualizarVacina(vacina.id, payload);
        await onSalvo();
        // Protocolos já iniciados guardam o esquema da criação: a tela diz quantos seguem com o anterior.
        if (atualizada.protocolosComEsquemaAnterior && atualizada.protocolosComEsquemaAnterior > 0) {
          setAvisoEsquema(atualizada.protocolosComEsquemaAnterior);
          setSalvando(false);
          return;
        }
      } else {
        await criarVacina(payload);
        await onSalvo();
      }
      onOpenChange(false);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar a vacina.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{vacina ? "Editar vacina" : "Nova vacina"}</DialogTitle>
          <DialogDescription>
            O esquema define quantas doses o protocolo de cada animal vai cobrar.
          </DialogDescription>
        </DialogHeader>

        {avisoEsquema !== null ? (
          <div className="[display:flex] [flex-direction:column] [gap:8px]">
            <BlocoAviso titulo="Esquema alterado">
              <span>
                {avisoEsquema === 1
                  ? "1 protocolo em andamento continua com o esquema anterior."
                  : `${avisoEsquema} protocolos em andamento continuam com o esquema anterior.`}{" "}
                O esquema novo vale para os protocolos criados daqui em diante.
              </span>
            </BlocoAviso>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Entendi
            </Button>
          </div>
        ) : (
          <form className="[display:flex] [flex-direction:column] [gap:12px]" onSubmit={enviar}>
            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              <Label htmlFor="vacina-nome">Nome *</Label>
              <Input
                id="vacina-nome"
                value={form.nome}
                disabled={salvando}
                maxLength={120}
                onChange={(evento) => atualizar("nome", evento.target.value)}
              />
            </div>

            <fieldset className="[display:flex] [flex-direction:column] [gap:6px] [border:0] [padding:0] [margin:0]">
              <legend className="[font-size:13px] [font-weight:600] [padding:0]">Espécies *</legend>
              <div className="[display:flex] [gap:16px]">
                <label className="[display:flex] [align-items:center] [gap:8px] [font-size:13px]">
                  <Checkbox
                    checked={form.cao}
                    disabled={salvando}
                    onCheckedChange={(marcado) => atualizar("cao", marcado === true)}
                  />
                  <span>Cão</span>
                </label>
                <label className="[display:flex] [align-items:center] [gap:8px] [font-size:13px]">
                  <Checkbox
                    checked={form.gato}
                    disabled={salvando}
                    onCheckedChange={(marcado) => atualizar("gato", marcado === true)}
                  />
                  <span>Gato</span>
                </label>
              </div>
              {semEspecie ? (
                <p className="[font-size:12px] [color:var(--crit)]">Escolha ao menos uma espécie.</p>
              ) : null}
            </fieldset>

            <div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:12px] max-[560px]:[grid-template-columns:1fr]">
              <div className="[display:flex] [flex-direction:column] [gap:6px]">
                <Label htmlFor="vacina-doses">Doses do esquema *</Label>
                <ControlSelect
                  id="vacina-doses"
                  value={form.totalDoses}
                  disabled={salvando}
                  onValueChange={(valor) => atualizar("totalDoses", valor)}
                  options={Array.from({ length: 10 }, (_, indice) => ({
                    value: String(indice + 1),
                    label: String(indice + 1),
                  }))}
                />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px]">
                <Label htmlFor="vacina-intervalo">Intervalo entre doses (dias){totalDoses > 1 ? " *" : ""}</Label>
                <Input
                  id="vacina-intervalo"
                  type="number"
                  min={0}
                  max={3650}
                  value={form.intervaloDosesDias}
                  disabled={salvando || totalDoses <= 1}
                  placeholder={totalDoses <= 1 ? "Não se aplica" : "Ex.: 21"}
                  onChange={(evento) => atualizar("intervaloDosesDias", evento.target.value)}
                />
                {precisaIntervalo ? (
                  <p className="[font-size:12px] [color:var(--crit)]">
                    Esquema com mais de uma dose exige o intervalo.
                  </p>
                ) : null}
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px]">
                <Label htmlFor="vacina-revacinacao">Revacinação (dias)</Label>
                <Input
                  id="vacina-revacinacao"
                  type="number"
                  min={1}
                  max={3650}
                  value={form.revacinacaoDias}
                  disabled={salvando}
                  placeholder="Ex.: 365"
                  onChange={(evento) => atualizar("revacinacaoDias", evento.target.value)}
                />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px]">
                <Label htmlFor="vacina-aviso">Avisar antes (dias)</Label>
                <Input
                  id="vacina-aviso"
                  type="number"
                  min={0}
                  max={365}
                  value={form.diasAvisoProximaDose}
                  disabled={salvando}
                  onChange={(evento) => atualizar("diasAvisoProximaDose", evento.target.value)}
                />
                <p className="[font-size:12px] [color:var(--muted)]">0 avisa só quando a dose vence.</p>
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px]">
                <Label htmlFor="vacina-idade">Idade mínima (semanas)</Label>
                <Input
                  id="vacina-idade"
                  type="number"
                  min={0}
                  max={520}
                  value={form.idadeMinimaSemanas}
                  disabled={salvando}
                  onChange={(evento) => atualizar("idadeMinimaSemanas", evento.target.value)}
                />
              </div>
              <div className="[display:flex] [flex-direction:column] [gap:6px]">
                <Label htmlFor="vacina-fabricante">Fabricante</Label>
                <Input
                  id="vacina-fabricante"
                  value={form.fabricante}
                  disabled={salvando}
                  maxLength={120}
                  onChange={(evento) => atualizar("fabricante", evento.target.value)}
                />
              </div>
            </div>

            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              <Label htmlFor="vacina-via">Via de aplicação sugerida</Label>
              <Input
                id="vacina-via"
                value={form.viaAplicacaoSugerida}
                disabled={salvando}
                maxLength={80}
                placeholder="Ex.: subcutânea"
                onChange={(evento) => atualizar("viaAplicacaoSugerida", evento.target.value)}
              />
            </div>

            <label className="[display:flex] [align-items:flex-start] [gap:8px] [font-size:13px]">
              <Checkbox
                checked={form.obrigatoria}
                disabled={salvando}
                onCheckedChange={(marcado) => atualizar("obrigatoria", marcado === true)}
              />
              <span>
                Obrigatória — animais da espécie sem nenhuma dose desta vacina passam a ter alerta na ficha.
              </span>
            </label>

            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              <Label htmlFor="vacina-observacoes">Observações</Label>
              <Input
                id="vacina-observacoes"
                value={form.observacoes}
                disabled={salvando}
                maxLength={1000}
                onChange={(evento) => atualizar("observacoes", evento.target.value)}
              />
            </div>

            {erro ? <p className="[color:var(--crit)] [font-size:13px] [font-weight:600]">{erro}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={salvando} onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!podeEnviar}>
                {salvando ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                {vacina ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
